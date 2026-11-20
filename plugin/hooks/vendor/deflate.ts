// zlib deflate (RFC 1950/1951), pure TS with no dependencies (decision 0061).
// Part of Modster Hunter, MIT license. One dynamic-Huffman block, LZ77 over hash chains.

const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]

const WINDOW = 32768
const MIN_MATCH = 3
const MAX_MATCH = 258
const HASH_BITS = 15
/** How many earlier positions a match search tries */
const CHAIN_LIMIT = 256
const END_OF_BLOCK = 256

/** Compresses `data` as a zlib stream that any inflater reads. */
export function deflate(data: Uint8Array): Uint8Array {
  const tokens = lz77(data)
  const out = new BitWriter()
  out.bits(0x78, 8)
  out.bits(0x01, 8)
  writeBlock(out, tokens)
  out.align()
  const adler = adler32(data)
  for (const shift of [24, 16, 8, 0]) out.bits((adler >>> shift) & 0xff, 8)
  return out.bytes()
}

/** Literals as their byte; a match as `length << 16 | distance`, with length ≥ 3 so it can't be mistaken for one. */
function lz77(data: Uint8Array): Uint32Array {
  const n = data.length
  const tokens = new Uint32Array(n + 1)
  let count = 0
  const head = new Int32Array(1 << HASH_BITS).fill(-1)
  const prev = new Int32Array(WINDOW)
  const hash = (at: number) => ((data[at]! << 10) ^ (data[at + 1]! << 5) ^ data[at + 2]!) & ((1 << HASH_BITS) - 1)
  const insert = (at: number) => {
    if (at + MIN_MATCH > n) return
    const h = hash(at)
    prev[at % WINDOW] = head[h]!
    head[h] = at
  }
  let at = 0
  while (at < n) {
    let bestLength = 0
    let bestDistance = 0
    if (at + MIN_MATCH <= n) {
      const max = Math.min(MAX_MATCH, n - at)
      let candidate = head[hash(at)]!
      for (let tries = 0; candidate >= 0 && at - candidate <= WINDOW && tries < CHAIN_LIMIT; tries++) {
        if (data[candidate + bestLength] === data[at + bestLength]) {
          let length = 0
          while (length < max && data[candidate + length] === data[at + length]) length++
          if (length > bestLength) {
            bestLength = length
            bestDistance = at - candidate
            if (length === max) break
          }
        }
        const next = prev[candidate % WINDOW]!
        if (next >= candidate) break
        candidate = next
      }
    }
    if (bestLength >= MIN_MATCH) {
      tokens[count++] = (bestLength << 16) | bestDistance
      for (let i = 0; i < bestLength; i++) insert(at + i)
      at += bestLength
    } else {
      tokens[count++] = data[at]!
      insert(at)
      at++
    }
  }
  return tokens.subarray(0, count)
}

function lengthCode(length: number): number {
  let code = 0
  while (code < 28 && LEN_BASE[code + 1]! <= length) code++
  return code
}

function distanceCode(distance: number): number {
  let code = 0
  while (code < 29 && DIST_BASE[code + 1]! <= distance) code++
  return code
}

function writeBlock(out: BitWriter, tokens: Uint32Array): void {
  const litFreq = new Uint32Array(286)
  const distFreq = new Uint32Array(30)
  for (const token of tokens) {
    if (token < 256) litFreq[token]!++
    else {
      litFreq[257 + lengthCode(token >>> 16)]!++
      distFreq[distanceCode(token & 0xffff)]!++
    }
  }
  litFreq[END_OF_BLOCK]!++
  // Two used distance codes at least, so every inflater accepts the table
  if (distFreq.filter((f) => f > 0).length < 2) {
    distFreq[0] ||= 1
    distFreq[1] ||= 1
  }
  const litLengths = codeLengths(litFreq, 15)
  const distLengths = codeLengths(distFreq, 15)
  let hlit = 286
  while (hlit > 257 && litLengths[hlit - 1] === 0) hlit--
  let hdist = 30
  while (hdist > 1 && distLengths[hdist - 1] === 0) hdist--

  const runs = runLengths([...litLengths.subarray(0, hlit), ...distLengths.subarray(0, hdist)])
  const clFreq = new Uint32Array(19)
  for (const [symbol] of runs) clFreq[symbol]!++
  const clLengths = codeLengths(clFreq, 7)
  let hclen = 19
  while (hclen > 4 && clLengths[CODE_LENGTH_ORDER[hclen - 1]!] === 0) hclen--

  out.bits(1, 1) // the last block
  out.bits(2, 2) // dynamic Huffman
  out.bits(hlit - 257, 5)
  out.bits(hdist - 1, 5)
  out.bits(hclen - 4, 4)
  for (let i = 0; i < hclen; i++) out.bits(clLengths[CODE_LENGTH_ORDER[i]!]!, 3)
  const clCodes = canonicalCodes(clLengths)
  for (const [symbol, extra] of runs) {
    out.code(clCodes[symbol]!, clLengths[symbol]!)
    if (symbol === 16) out.bits(extra, 2)
    else if (symbol === 17) out.bits(extra, 3)
    else if (symbol === 18) out.bits(extra, 7)
  }

  const litCodes = canonicalCodes(litLengths)
  const distCodes = canonicalCodes(distLengths)
  for (const token of tokens) {
    if (token < 256) {
      out.code(litCodes[token]!, litLengths[token]!)
      continue
    }
    const length = token >>> 16
    const distance = token & 0xffff
    const lc = lengthCode(length)
    out.code(litCodes[257 + lc]!, litLengths[257 + lc]!)
    out.bits(length - LEN_BASE[lc]!, LEN_EXTRA[lc]!)
    const dc = distanceCode(distance)
    out.code(distCodes[dc]!, distLengths[dc]!)
    out.bits(distance - DIST_BASE[dc]!, DIST_EXTRA[dc]!)
  }
  out.code(litCodes[END_OF_BLOCK]!, litLengths[END_OF_BLOCK]!)
}

/** Code lengths as `[symbol, extra]` pairs: lengths 0–15, 16 repeats the last 3–6 times, 17 and 18 repeat zero. */
function runLengths(lengths: number[]): [number, number][] {
  const runs: [number, number][] = []
  for (let i = 0; i < lengths.length; ) {
    const value = lengths[i]!
    let run = 1
    while (i + run < lengths.length && lengths[i + run] === value) run++
    let left = run
    if (value === 0) {
      while (left >= 11) {
        const take = Math.min(left, 138)
        runs.push([18, take - 11])
        left -= take
      }
      if (left >= 3) {
        runs.push([17, left - 3])
        left = 0
      }
    } else {
      runs.push([value, 0])
      left--
      while (left >= 3) {
        const take = Math.min(left, 6)
        runs.push([16, take - 3])
        left -= take
      }
    }
    for (; left > 0; left--) runs.push([value, 0])
    i += run
  }
  return runs
}

/** Huffman code lengths for `freq`, none longer than `limit`: frequencies are halved until the tree fits. */
function codeLengths(freq: ArrayLike<number>, limit: number): Uint8Array {
  const weights = Array.from(freq)
  for (;;) {
    const lengths = huffmanLengths(weights)
    if (Math.max(0, ...lengths) <= limit) return lengths
    for (let i = 0; i < weights.length; i++) if (weights[i]! > 0) weights[i] = (weights[i]! >> 1) | 1
  }
}

function huffmanLengths(weights: number[]): Uint8Array {
  const lengths = new Uint8Array(weights.length)
  const used = weights.flatMap((weight, symbol) => (weight > 0 ? [symbol] : []))
  if (used.length === 1) lengths[used[0]!] = 1
  if (used.length < 2) return lengths
  // Nodes: leaves first, then merged ones; a sorted queue of each keeps it O(n log n)
  const parent: number[] = []
  const weight: number[] = []
  const leaves = used.map((symbol) => {
    weight.push(weights[symbol]!)
    parent.push(-1)
    return weight.length - 1
  })
  leaves.sort((a, b) => weight[a]! - weight[b]!)
  const merged: number[] = []
  let li = 0
  let mi = 0
  const take = (): number => {
    if (mi >= merged.length || (li < leaves.length && weight[leaves[li]!]! <= weight[merged[mi]!]!)) return leaves[li++]!
    return merged[mi++]!
  }
  for (let left = used.length - 1; left > 0; left--) {
    const a = take()
    const b = take()
    weight.push(weight[a]! + weight[b]!)
    parent.push(-1)
    const node = weight.length - 1
    parent[a] = node
    parent[b] = node
    merged.push(node)
  }
  used.forEach((symbol, leaf) => {
    let depth = 0
    for (let node = leaf; parent[node]! >= 0; node = parent[node]!) depth++
    lengths[symbol] = depth
  })
  return lengths
}

/** Canonical Huffman codes for `lengths` (RFC 1951 3.2.2), MSB first. */
function canonicalCodes(lengths: Uint8Array): Uint16Array {
  const counts = new Uint16Array(16)
  for (const length of lengths) if (length) counts[length]!++
  const next = new Uint16Array(16)
  let code = 0
  for (let bits = 1; bits < 16; bits++) {
    next[bits] = code
    code = (code + counts[bits]!) << 1
  }
  const codes = new Uint16Array(lengths.length)
  lengths.forEach((length, symbol) => {
    if (length) codes[symbol] = next[length]!++
  })
  return codes
}

function adler32(data: Uint8Array): number {
  let a = 1
  let b = 0
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]!) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

/** Packs bits LSB first, as deflate stores them. */
class BitWriter {
  private buffer = new Uint8Array(1024)
  private length = 0
  private bitBuffer = 0
  private bitCount = 0

  bits(value: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.bitBuffer |= ((value >>> i) & 1) << this.bitCount
      if (++this.bitCount === 8) this.flush()
    }
  }

  /** A Huffman code, whose bits go most significant first. */
  code(code: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) this.bits((code >>> i) & 1, 1)
  }

  align(): void {
    if (this.bitCount > 0) this.flush()
  }

  bytes(): Uint8Array {
    return this.buffer.slice(0, this.length)
  }

  private flush(): void {
    if (this.length === this.buffer.length) {
      const bigger = new Uint8Array(this.buffer.length * 2)
      bigger.set(this.buffer)
      this.buffer = bigger
    }
    this.buffer[this.length++] = this.bitBuffer
    this.bitBuffer = 0
    this.bitCount = 0
  }
}
