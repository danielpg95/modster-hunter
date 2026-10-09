export interface PngSpec {
  width: number
  height: number
  /** 0 grayscale, 2 RGB, 3 palette, 6 RGBA */
  colorType: number
  bitDepth: number
  /** One value per channel per pixel (a palette index for type 3), row by row */
  samples: number[]
  /** `[r, g, b, r, g, b, …]` for type 3 */
  palette?: number[]
  /** Alpha per palette entry (`tRNS`) */
  transparency?: number[]
  /** The row filter, 0–4, for every row; or one per row */
  filter?: number | number[]
  interlace?: number
  /** Turns the filtered rows into zlib data; default: stored (uncompressed) blocks */
  compress?: (raw: Uint8Array) => Uint8Array
}

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 6: 4 }

/** A real PNG file (with CRCs) built from raw samples, so decoder tests can cover every variant and filter. */
export function encodePng(spec: PngSpec): Uint8Array {
  const channels = CHANNELS[spec.colorType] ?? 1
  const bitsPerPixel = channels * spec.bitDepth
  const stride = Math.ceil((spec.width * bitsPerPixel) / 8)
  const bpp = Math.max(1, bitsPerPixel >> 3)

  // Pack each row at the bit depth, high bits first
  const rows: Uint8Array[] = []
  for (let y = 0; y < spec.height; y++) {
    const row = new Uint8Array(stride)
    const perRow = spec.width * channels
    for (let i = 0; i < perRow; i++) {
      const value = spec.samples[y * perRow + i] ?? 0
      const bit = i * spec.bitDepth
      row[bit >> 3]! |= (value << (8 - spec.bitDepth - (bit & 7))) & 0xff
    }
    rows.push(row)
  }

  const raw = new Uint8Array(spec.height * (stride + 1))
  rows.forEach((row, y) => {
    const filter = Array.isArray(spec.filter) ? (spec.filter[y] ?? 0) : (spec.filter ?? 0)
    const above = rows[y - 1]
    raw[y * (stride + 1)] = filter
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? row[i - bpp]! : 0
      const up = above ? above[i]! : 0
      const upLeft = above && i >= bpp ? above[i - bpp]! : 0
      const predicted = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter] ?? 0
      raw[y * (stride + 1) + 1 + i] = (row[i]! - predicted) & 0xff
    }
  })

  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, spec.width)
  view.setUint32(4, spec.height)
  header.set([spec.bitDepth, spec.colorType, 0, 0, spec.interlace ?? 0], 8)

  const chunks = [chunk('IHDR', header)]
  if (spec.palette) chunks.push(chunk('PLTE', Uint8Array.from(spec.palette)))
  if (spec.transparency) chunks.push(chunk('tRNS', Uint8Array.from(spec.transparency)))
  chunks.push(chunk('IDAT', (spec.compress ?? storedZlib)(raw)), chunk('IEND', new Uint8Array(0)))
  return concat([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks])
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** zlib with stored blocks of at most 65535 bytes, and the Adler-32 trailer. */
function storedZlib(data: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.from([0x78, 0x01])]
  let at = 0
  do {
    const piece = data.subarray(at, at + 65535)
    at += piece.length
    const isLast = at >= data.length ? 1 : 0
    parts.push(Uint8Array.from([isLast, piece.length & 0xff, piece.length >> 8, ~piece.length & 0xff, (~piece.length >> 8) & 0xff]), piece)
  } while (at < data.length)
  let a = 1
  let b = 0
  for (const byte of data) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  parts.push(Uint8Array.from([b >> 8, b & 0xff, a >> 8, a & 0xff]))
  return concat(parts)
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}
