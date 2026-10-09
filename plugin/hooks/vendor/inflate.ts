// zlib inflate (RFC 1950/1951), pure TS with no dependencies (decision 0015).
// Part of Modster Hunter, MIT license. Started from the P1-05 spike.

const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
// The order code length code lengths are sent in (RFC 1951 3.2.7)
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]

/** A canonical Huffman code: how many codes of each length, and the symbols in code order. */
interface Huffman {
  counts: Uint16Array
  symbols: Uint16Array
}

function huffman(lengths: ArrayLike<number>): Huffman {
  const counts = new Uint16Array(16)
  for (let i = 0; i < lengths.length; i++) counts[lengths[i] ?? 0]!++
  counts[0] = 0
  const offsets = new Uint16Array(16)
  for (let len = 1; len < 16; len++) offsets[len] = offsets[len - 1]! + counts[len - 1]!
  const symbols = new Uint16Array(lengths.length)
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    const len = lengths[symbol] ?? 0
    if (len) symbols[offsets[len]!++] = symbol
  }
  return { counts, symbols }
}

const FIXED_LITERALS = huffman([...Array<number>(144).fill(8), ...Array<number>(112).fill(9), ...Array<number>(24).fill(7), ...Array<number>(8).fill(8)])
const FIXED_DISTANCES = huffman(Array<number>(30).fill(5))

/**
 * Inflates zlib data. `maxBytes` caps the output, so a small file can't
 * expand into a huge buffer; going past it throws. Throws a readable Error on
 * any malformed input.
 */
export function inflate(zlib: Uint8Array, maxBytes: number): Uint8Array {
  if (zlib.length < 2 || (zlib[0]! & 0x0f) !== 8 || ((zlib[0]! << 8) | zlib[1]!) % 31 !== 0) {
    throw new Error('inflate: not zlib data')
  }
  if (zlib[1]! & 0x20) throw new Error('inflate: preset dictionaries are not supported')

  let pos = 2
  let bitBuffer = 0
  let bitCount = 0
  let out = new Uint8Array(Math.min(maxBytes, Math.max(1024, zlib.length * 4)))
  let size = 0

  const ensure = (extra: number): void => {
    if (size + extra > maxBytes) throw new Error(`inflate: data expands past ${maxBytes} bytes`)
    if (size + extra <= out.length) return
    const grown = new Uint8Array(Math.min(maxBytes, Math.max(out.length * 2, size + extra)))
    grown.set(out.subarray(0, size))
    out = grown
  }

  const bits = (n: number): number => {
    while (bitCount < n) {
      if (pos >= zlib.length) throw new Error('inflate: unexpected end of data')
      bitBuffer |= zlib[pos++]! << bitCount
      bitCount += 8
    }
    const value = bitBuffer & ((1 << n) - 1)
    bitBuffer >>>= n
    bitCount -= n
    return value
  }

  const decode = (code: Huffman): number => {
    let value = 0
    let first = 0
    let index = 0
    for (let len = 1; len < 16; len++) {
      value |= bits(1)
      const count = code.counts[len]!
      if (value - count < first) return code.symbols[index + (value - first)]!
      index += count
      first = (first + count) << 1
      value <<= 1
    }
    throw new Error('inflate: bad Huffman code')
  }

  const block = (literals: Huffman, distances: Huffman): void => {
    for (;;) {
      const symbol = decode(literals)
      if (symbol < 256) {
        ensure(1)
        out[size++] = symbol
      } else if (symbol === 256) {
        return
      } else {
        const lengthCode = symbol - 257
        if (lengthCode >= LEN_BASE.length) throw new Error('inflate: bad length code')
        const length = LEN_BASE[lengthCode]! + bits(LEN_EXTRA[lengthCode]!)
        const distanceCode = decode(distances)
        if (distanceCode >= DIST_BASE.length) throw new Error('inflate: bad distance code')
        const distance = DIST_BASE[distanceCode]! + bits(DIST_EXTRA[distanceCode]!)
        if (distance > size) throw new Error('inflate: distance too far back')
        ensure(length)
        // Byte by byte: a copy may overlap the bytes it is writing
        for (let i = 0; i < length; i++, size++) out[size] = out[size - distance]!
      }
    }
  }

  let isLast = 0
  while (!isLast) {
    isLast = bits(1)
    const type = bits(2)
    if (type === 0) {
      // Stored: skip to the byte boundary, then LEN and its complement NLEN
      bitBuffer = 0
      bitCount = 0
      if (pos + 4 > zlib.length) throw new Error('inflate: unexpected end of data')
      const length = zlib[pos]! | (zlib[pos + 1]! << 8)
      const check = zlib[pos + 2]! | (zlib[pos + 3]! << 8)
      if ((length ^ 0xffff) !== check) throw new Error('inflate: stored block length is corrupt')
      pos += 4
      if (pos + length > zlib.length) throw new Error('inflate: unexpected end of data')
      ensure(length)
      out.set(zlib.subarray(pos, pos + length), size)
      size += length
      pos += length
    } else if (type === 1) {
      block(FIXED_LITERALS, FIXED_DISTANCES)
    } else if (type === 2) {
      const literalCount = bits(5) + 257
      const distanceCount = bits(5) + 1
      const codeLengthCount = bits(4) + 4
      const codeLengths = new Uint8Array(19)
      for (let i = 0; i < codeLengthCount; i++) codeLengths[CODE_LENGTH_ORDER[i]!] = bits(3)
      const codeLengthCode = huffman(codeLengths)
      const lengths = new Uint8Array(literalCount + distanceCount)
      for (let i = 0; i < lengths.length; ) {
        const symbol = decode(codeLengthCode)
        if (symbol < 16) {
          lengths[i++] = symbol
          continue
        }
        let repeat: number
        let value = 0
        if (symbol === 16) {
          if (i === 0) throw new Error('inflate: repeat with no previous length')
          value = lengths[i - 1]!
          repeat = 3 + bits(2)
        } else if (symbol === 17) {
          repeat = 3 + bits(3)
        } else {
          repeat = 11 + bits(7)
        }
        if (i + repeat > lengths.length) throw new Error('inflate: too many code lengths')
        lengths.fill(value, i, i + repeat)
        i += repeat
      }
      block(huffman(lengths.subarray(0, literalCount)), huffman(lengths.subarray(literalCount)))
    } else {
      throw new Error('inflate: bad block type')
    }
  }
  return out.slice(0, size)
}
