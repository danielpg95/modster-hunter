// RGBA → PNG encoder, pure TS with no dependencies (decision 0061).
// Part of Modster Hunter, MIT license.

import { deflate } from './deflate'

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
const COLOR_PALETTE = 3
const COLOR_RGBA = 6
const PALETTE_MAX = 256

/**
 * Encodes RGBA pixels as a PNG, unfiltered and not interlaced. Up to 256
 * colours become a palette with `tRNS` (every clear pixel sharing one entry),
 * which is what a desktop sheet always fits; more stay RGBA.
 */
export function encodePng({ width, height, data }: { width: number; height: number; data: ArrayLike<number> }): Uint8Array {
  const palette = paletteOf(data)
  const channels = palette ? 1 : 4
  const raw = new Uint8Array(height * (1 + width * channels))
  for (let y = 0; y < height; y++) {
    let at = y * (1 + width * channels) + 1 // each row starts with filter type 0
    for (let x = 0; x < width; x++) {
      const pixel = (y * width + x) * 4
      if (palette) raw[at++] = palette.index.get(key(data, pixel))!
      else for (let c = 0; c < 4; c++) raw[at++] = data[pixel + c]!
    }
  }

  const header = new Uint8Array(13)
  writeU32(header, 0, width)
  writeU32(header, 4, height)
  header[8] = 8
  header[9] = palette ? COLOR_PALETTE : COLOR_RGBA
  const chunks = [chunk('IHDR', header)]
  if (palette) {
    chunks.push(chunk('PLTE', palette.rgb))
    if (palette.alpha.length) chunks.push(chunk('tRNS', palette.alpha))
  }
  chunks.push(chunk('IDAT', deflate(raw)), chunk('IEND', new Uint8Array(0)))
  return concat([new Uint8Array(SIGNATURE), ...chunks])
}

/** A clear pixel's colour doesn't matter, so every one keys the same. */
function key(data: ArrayLike<number>, at: number): number {
  return data[at + 3] === 0 ? -1 : ((data[at]! << 24) | (data[at + 1]! << 16) | (data[at + 2]! << 8) | data[at + 3]!) >>> 0
}

/** The palette, clear first so `tRNS` stays short; undefined past 256 colours. */
function paletteOf(data: ArrayLike<number>): { index: Map<number, number>; rgb: Uint8Array; alpha: Uint8Array } | undefined {
  const colors = new Map<number, number>()
  for (let at = 0; at < data.length; at += 4) {
    const k = key(data, at)
    if (colors.has(k)) continue
    if (colors.size === PALETTE_MAX) return undefined
    colors.set(k, at)
  }
  const ordered = [...colors.keys()].sort((a, b) => alphaOf(a) - alphaOf(b))
  const index = new Map(ordered.map((k, i) => [k, i]))
  const rgb = new Uint8Array(ordered.length * 3)
  const alphas = ordered.map(alphaOf)
  ordered.forEach((k, i) => {
    if (k < 0) return
    rgb[i * 3] = k >>> 24
    rgb[i * 3 + 1] = (k >>> 16) & 0xff
    rgb[i * 3 + 2] = (k >>> 8) & 0xff
  })
  let lastPartial = alphas.length
  while (lastPartial > 0 && alphas[lastPartial - 1] === 255) lastPartial--
  return { index, rgb, alpha: Uint8Array.from(alphas.slice(0, lastPartial)) }
}

function alphaOf(k: number): number {
  return k < 0 ? 0 : k & 0xff
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length)
  writeU32(out, 0, body.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(body, 8)
  writeU32(out, 8 + body.length, crc32(out.subarray(4, 8 + body.length)))
  return out
}

function writeU32(bytes: Uint8Array, at: number, value: number): void {
  bytes[at] = value >>> 24
  bytes[at + 1] = (value >>> 16) & 0xff
  bytes[at + 2] = (value >>> 8) & 0xff
  bytes[at + 3] = value & 0xff
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

let crcTable: Uint32Array | undefined

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
