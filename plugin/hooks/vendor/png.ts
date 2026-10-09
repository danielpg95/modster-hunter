// PNG → RGBA decoder, pure TS with no dependencies (decision 0015).
// Part of Modster Hunter, MIT license. Started from the P1-05 spike.

import { inflate } from './inflate'

export interface DecodedPng {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel, row by row */
  data: Uint8Array
}

/** Thrown for a PNG that is valid but uses a variant this decoder doesn't read. */
export class UnsupportedPngError extends Error {}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
const COLOR_RGB = 2
const COLOR_PALETTE = 3
const COLOR_RGBA = 6
const CHANNELS: Readonly<Record<number, number>> = { [COLOR_RGB]: 3, [COLOR_PALETTE]: 1, [COLOR_RGBA]: 4 }

const u32 = (bytes: Uint8Array, at: number): number =>
  ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0

/**
 * Decodes a non-interlaced PNG: RGB and RGBA at 8 bits, palette at 1, 2, 4 or
 * 8 bits (with `tRNS`). Other variants throw `UnsupportedPngError`; a broken
 * file throws `Error`. A header larger than `limits` is refused before any
 * pixel data is inflated.
 */
export function decodePng(png: Uint8Array, limits: { maxWidth: number; maxHeight: number }): DecodedPng {
  if (png.length < 8 || SIGNATURE.some((byte, i) => png[i] !== byte)) throw new Error('not a PNG file')

  let header: { width: number; height: number; bitDepth: number; colorType: number } | undefined
  let palette: Uint8Array | undefined
  let transparency: Uint8Array | undefined
  const chunks: Uint8Array[] = []
  let compressedSize = 0

  for (let at = 8; at < png.length; ) {
    if (at + 12 > png.length) throw new Error('PNG is cut short')
    const length = u32(png, at)
    const type = String.fromCharCode(png[at + 4]!, png[at + 5]!, png[at + 6]!, png[at + 7]!)
    if (at + 12 + length > png.length) throw new Error(`PNG is cut short in its ${type} chunk`)
    const data = png.subarray(at + 8, at + 8 + length)
    at += 12 + length

    if (type === 'IHDR') {
      header = readHeader(data, limits)
    } else if (!header) {
      throw new Error('PNG has no IHDR chunk first')
    } else if (type === 'PLTE') {
      palette = data
    } else if (type === 'tRNS') {
      transparency = data
    } else if (type === 'IDAT') {
      chunks.push(data)
      compressedSize += data.length
    } else if (type === 'IEND') {
      break
    }
  }
  if (!header) throw new Error('PNG has no IHDR chunk')
  if (chunks.length === 0) throw new Error('PNG has no image data')

  const { width, height, bitDepth, colorType } = header
  if (colorType === COLOR_PALETTE && !palette) throw new Error('palette PNG has no PLTE chunk')
  const colors = palette ?? new Uint8Array(0)

  const compressed = new Uint8Array(compressedSize)
  let offset = 0
  for (const chunk of chunks) {
    compressed.set(chunk, offset)
    offset += chunk.length
  }

  const bitsPerPixel = CHANNELS[colorType]! * bitDepth
  const stride = Math.ceil((width * bitsPerPixel) / 8)
  // Every row starts with its filter type byte
  const raw = inflate(compressed, height * (stride + 1))
  if (raw.length !== height * (stride + 1)) throw new Error('PNG image data has the wrong size')
  const pixels = unfilter(raw, stride, height, Math.max(1, bitsPerPixel >> 3))

  const rgba = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    const row = y * stride
    for (let x = 0; x < width; x++) {
      const to = (y * width + x) * 4
      if (colorType === COLOR_RGBA) {
        rgba.set(pixels.subarray(row + x * 4, row + x * 4 + 4), to)
      } else if (colorType === COLOR_RGB) {
        rgba.set(pixels.subarray(row + x * 3, row + x * 3 + 3), to)
        rgba[to + 3] = 255
      } else {
        const index = paletteIndex(pixels, row, x, bitDepth)
        if (index * 3 + 2 >= colors.length) throw new Error(`PNG pixel uses palette entry ${index}, past the palette's end`)
        rgba[to] = colors[index * 3]!
        rgba[to + 1] = colors[index * 3 + 1]!
        rgba[to + 2] = colors[index * 3 + 2]!
        rgba[to + 3] = transparency?.[index] ?? 255
      }
    }
  }
  return { width, height, data: rgba }
}

function readHeader(data: Uint8Array, limits: { maxWidth: number; maxHeight: number }) {
  if (data.length < 13) throw new Error('PNG header is too short')
  const width = u32(data, 0)
  const height = u32(data, 4)
  const bitDepth = data[8]!
  const colorType = data[9]!
  const interlace = data[12]!
  if (width === 0 || height === 0) throw new Error('PNG has no pixels')
  if (width > limits.maxWidth || height > limits.maxHeight) {
    throw new Error(`PNG is ${width}×${height} px; at most ${limits.maxWidth}×${limits.maxHeight} fits`)
  }
  if (interlace !== 0) throw new UnsupportedPngError('interlaced PNGs are not supported')
  const isSupported =
    colorType === COLOR_PALETTE ? [1, 2, 4, 8].includes(bitDepth) : (colorType === COLOR_RGB || colorType === COLOR_RGBA) && bitDepth === 8
  if (!isSupported) {
    const kind = colorType === COLOR_PALETTE ? 'palette' : colorType === COLOR_RGB ? 'RGB' : colorType === COLOR_RGBA ? 'RGBA' : 'grayscale'
    throw new UnsupportedPngError(`${bitDepth}-bit ${kind} PNGs are not supported`)
  }
  return { width, height, bitDepth, colorType }
}

/** Reverses the five PNG row filters; `bpp` is bytes per pixel, at least 1. */
function unfilter(raw: Uint8Array, stride: number, height: number, bpp: number): Uint8Array {
  const out = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!
    if (filter > 4) throw new Error(`PNG row ${y} has unknown filter ${filter}`)
    const from = y * (stride + 1) + 1
    const row = y * stride
    const above = row - stride
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? out[row + i - bpp]! : 0
      const up = y > 0 ? out[above + i]! : 0
      const upLeft = y > 0 && i >= bpp ? out[above + i - bpp]! : 0
      let predicted = 0
      if (filter === 1) predicted = left
      else if (filter === 2) predicted = up
      else if (filter === 3) predicted = (left + up) >> 1
      else if (filter === 4) predicted = paeth(left, up, upLeft)
      out[row + i] = (raw[from + i]! + predicted) & 0xff
    }
  }
  return out
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** The palette index of pixel `x` in a row packed at `bitDepth` bits, high bits first. */
function paletteIndex(pixels: Uint8Array, row: number, x: number, bitDepth: number): number {
  if (bitDepth === 8) return pixels[row + x]!
  const perByte = 8 / bitDepth
  const byte = pixels[row + Math.floor(x / perByte)]!
  const shift = 8 - bitDepth * ((x % perByte) + 1)
  return (byte >> shift) & ((1 << bitDepth) - 1)
}
