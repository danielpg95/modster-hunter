// Minimal zlib inflate (RFC 1950/1951), pure TS, no globals. Spike code.
const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]

interface Huffman {
  counts: number[]
  symbols: number[]
}

function build(lengths: number[]): Huffman {
  const counts = new Array<number>(16).fill(0)
  for (const l of lengths) counts[l]!++
  counts[0] = 0
  const offs = new Array<number>(16).fill(0)
  for (let i = 1; i < 16; i++) offs[i] = offs[i - 1]! + counts[i - 1]!
  const symbols = new Array<number>(lengths.length).fill(0)
  lengths.forEach((l, sym) => {
    if (l) symbols[offs[l]!++] = sym
  })
  return { counts, symbols }
}

const FIXED_LIT = build([...new Array(144).fill(8), ...new Array(112).fill(9), ...new Array(24).fill(7), ...new Array(8).fill(8)])
const FIXED_DIST = build(new Array(30).fill(5))

export function inflate(zlib: Uint8Array): Uint8Array {
  let pos = 2 // skip the zlib header
  let bitBuf = 0
  let bitCnt = 0
  const out: number[] = []

  const bits = (n: number): number => {
    while (bitCnt < n) {
      if (pos >= zlib.length) throw new Error('inflate: unexpected end of data')
      bitBuf |= zlib[pos++]! << bitCnt
      bitCnt += 8
    }
    const v = bitBuf & ((1 << n) - 1)
    bitBuf >>>= n
    bitCnt -= n
    return v
  }

  const decode = (h: Huffman): number => {
    let code = 0
    let first = 0
    let index = 0
    for (let len = 1; len < 16; len++) {
      code |= bits(1)
      const count = h.counts[len]!
      if (code - count < first) return h.symbols[index + (code - first)]!
      index += count
      first += count
      first <<= 1
      code <<= 1
    }
    throw new Error('inflate: bad code')
  }

  const codes = (lit: Huffman, dist: Huffman) => {
    for (;;) {
      const sym = decode(lit)
      if (sym < 256) out.push(sym)
      else if (sym === 256) return
      else {
        const s = sym - 257
        const len = LEN_BASE[s]! + bits(LEN_EXTRA[s]!)
        const d = decode(dist)
        const distance = DIST_BASE[d]! + bits(DIST_EXTRA[d]!)
        if (distance > out.length) throw new Error('inflate: distance too far back')
        for (let i = 0; i < len; i++) out.push(out[out.length - distance]!)
      }
    }
  }

  let last = 0
  while (!last) {
    last = bits(1)
    const type = bits(2)
    if (type === 0) {
      bitBuf = 0
      bitCnt = 0
      const len = zlib[pos]! | (zlib[pos + 1]! << 8)
      pos += 4
      for (let i = 0; i < len; i++) out.push(zlib[pos++]!)
    } else if (type === 1) {
      codes(FIXED_LIT, FIXED_DIST)
    } else if (type === 2) {
      const nlen = bits(5) + 257
      const ndist = bits(5) + 1
      const ncode = bits(4) + 4
      const cl = new Array<number>(19).fill(0)
      for (let i = 0; i < ncode; i++) cl[CL_ORDER[i]!] = bits(3)
      const clh = build(cl)
      const lengths: number[] = []
      while (lengths.length < nlen + ndist) {
        const sym = decode(clh)
        if (sym < 16) lengths.push(sym)
        else {
          let prev = 0
          let rep: number
          if (sym === 16) {
            prev = lengths[lengths.length - 1]!
            rep = 3 + bits(2)
          } else if (sym === 17) rep = 3 + bits(3)
          else rep = 11 + bits(7)
          for (let i = 0; i < rep; i++) lengths.push(prev)
        }
      }
      codes(build(lengths.slice(0, nlen)), build(lengths.slice(nlen)))
    } else throw new Error('inflate: bad block type')
  }
  return Uint8Array.from(out)
}
