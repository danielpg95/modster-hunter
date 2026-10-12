import type { RgbaImage } from '../../../../hooks/content'

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
const RGBA_8_BIT = [8, 6, 0, 0, 0]

let crcTable: Uint32Array | undefined

/**
 * Writes an 8-bit RGBA PNG with no row filters, which the mod's decoder reads
 * (decision 0016). `deflate` makes zlib data; the helper passes Node's
 * `deflateSync`, so this module stays free of Node APIs.
 */
export function encodeRgbaPng(image: RgbaImage, deflate: (raw: Uint8Array) => Uint8Array): Uint8Array {
  const stride = image.width * 4
  const raw = new Uint8Array(image.height * (stride + 1))
  for (let y = 0; y < image.height; y++) {
    // Each row starts with filter type 0 (none)
    for (let i = 0; i < stride; i++) raw[y * (stride + 1) + 1 + i] = image.data[y * stride + i]!
  }
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, image.width)
  view.setUint32(4, image.height)
  header.set(RGBA_8_BIT, 8)
  return concat([Uint8Array.from(SIGNATURE), chunk('IHDR', header), chunk('IDAT', deflate(raw)), chunk('IEND', new Uint8Array(0))])
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
  crcTable ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
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
