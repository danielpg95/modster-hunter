// PNG → RGBA decoder, pure TS with no dependencies (decisions 0016 and 0025).
// Part of Modster Hunter, MIT license. Started from the P1-05 spike.

import { inflate } from './inflate'

export interface DecodedPng {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel, row by row */
  data: Uint8Array
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
const COLOR_GRAY = 0
const COLOR_RGB = 2
const COLOR_PALETTE = 3
const COLOR_GRAY_ALPHA = 4
const COLOR_RGBA = 6
const CHANNELS: Readonly<Record<number, number>> = {
  [COLOR_GRAY]: 1,
  [COLOR_RGB]: 3,
  [COLOR_PALETTE]: 1,
  [COLOR_GRAY_ALPHA]: 2,
  [COLOR_RGBA]: 4,
}
// The bit depths the PNG spec allows for each color type
const BIT_DEPTHS: Readonly<Record<number, readonly number[]>> = {
  [COLOR_GRAY]: [1, 2, 4, 8, 16],
  [COLOR_RGB]: [8, 16],
  [COLOR_PALETTE]: [1, 2, 4, 8],
  [COLOR_GRAY_ALPHA]: [8, 16],
  [COLOR_RGBA]: [8, 16],
}
const COLOR_NAMES: Readonly<Record<number, string>> = {
  [COLOR_GRAY]: 'grayscale',
  [COLOR_RGB]: 'RGB',
  [COLOR_PALETTE]: 'palette',
  [COLOR_GRAY_ALPHA]: 'grayscale-alpha',
  [COLOR_RGBA]: 'RGBA',
}
// Adam7 passes: first column and row, then the step between pixels
const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
] as const
const NO_INTERLACE = [[0, 0, 1, 1]] as const

const u32 = (bytes: Uint8Array, at: number): number =>
  ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0

/**
 * Decodes any valid PNG: grayscale, RGB, palette, grayscale-alpha and RGBA, at
 * every bit depth the spec allows, interlaced or not, with `tRNS` (decision
 * 0025). Samples scale to 8 bits with rounding, as pngjs does, so this and
 * `tools/sprite.mjs` agree. A broken file throws `Error`. A header larger than
 * `limits` is refused before any pixel data is inflated.
 */
export function decodePng(png: Uint8Array, limits: { maxWidth: number; maxHeight: number }): DecodedPng {
  if (png.length < 8 || SIGNATURE.some((byte, i) => png[i] !== byte)) throw new Error('not a PNG file')

  let header: { width: number; height: number; bitDepth: number; colorType: number; interlace: number } | undefined
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

  const { width, height, bitDepth, colorType, interlace } = header
  if (colorType === COLOR_PALETTE && !palette) throw new Error('palette PNG has no PLTE chunk')

  const compressed = new Uint8Array(compressedSize)
  let offset = 0
  for (const chunk of chunks) {
    compressed.set(chunk, offset)
    offset += chunk.length
  }

  const channels = CHANNELS[colorType]!
  const bitsPerPixel = channels * bitDepth
  const passes = (interlace ? ADAM7 : NO_INTERLACE).map(([x0, y0, dx, dy]) => {
    const columns = Math.ceil((width - x0) / dx)
    const rows = Math.ceil((height - y0) / dy)
    // An empty pass has no rows at all, not even filter bytes
    const stride = columns > 0 && rows > 0 ? Math.ceil((columns * bitsPerPixel) / 8) : 0
    return { x0, y0, dx, dy, columns, rows: stride ? rows : 0, stride }
  })
  // Every row starts with its filter type byte
  const expected = passes.reduce((sum, pass) => sum + pass.rows * (pass.stride + 1), 0)
  const raw = inflate(compressed, expected)
  if (raw.length !== expected) throw new Error('PNG image data has the wrong size')

  const toRgba = pixelReader(colorType, bitDepth, palette ?? new Uint8Array(0), transparency)
  const rgba = new Uint8Array(width * height * 4)
  let at = 0
  for (const pass of passes) {
    if (pass.rows === 0) continue
    const size = pass.rows * (pass.stride + 1)
    const pixels = unfilter(raw.subarray(at, at + size), pass.stride, pass.rows, Math.max(1, bitsPerPixel >> 3))
    at += size
    for (let y = 0; y < pass.rows; y++) {
      for (let x = 0; x < pass.columns; x++) {
        const to = ((pass.y0 + y * pass.dy) * width + pass.x0 + x * pass.dx) * 4
        toRgba(pixels, y * pass.stride, x * channels, rgba, to)
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
  const depths = BIT_DEPTHS[colorType]
  if (!depths) throw new Error(`PNG has unknown color type ${colorType}`)
  if (!depths.includes(bitDepth)) throw new Error(`${bitDepth}-bit ${COLOR_NAMES[colorType]} isn't a valid PNG`)
  if (interlace > 1) throw new Error(`PNG has unknown interlace method ${interlace}`)
  return { width, height, bitDepth, colorType, interlace }
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

/** Sample `i` of a row packed at `bitDepth` bits, high bits first; 16-bit samples are big-endian. */
function sample(pixels: Uint8Array, row: number, i: number, bitDepth: number): number {
  if (bitDepth === 8) return pixels[row + i]!
  if (bitDepth === 16) return (pixels[row + i * 2]! << 8) | pixels[row + i * 2 + 1]!
  const perByte = 8 / bitDepth
  const byte = pixels[row + Math.floor(i / perByte)]!
  const shift = 8 - bitDepth * ((i % perByte) + 1)
  return (byte >> shift) & ((1 << bitDepth) - 1)
}

type PixelReader = (pixels: Uint8Array, row: number, first: number, rgba: Uint8Array, to: number) => void

/**
 * Builds the function that turns one pixel, starting at sample `first` of a
 * row, into RGBA at `rgba[to]`. A `tRNS` color key compares the full samples,
 * before scaling, and makes the pixel fully clear (all four bytes 0, as pngjs).
 */
function pixelReader(colorType: number, bitDepth: number, palette: Uint8Array, transparency: Uint8Array | undefined): PixelReader {
  const read = (pixels: Uint8Array, row: number, i: number) => sample(pixels, row, i, bitDepth)
  const max = 2 ** bitDepth - 1
  const to8 = bitDepth === 8 ? (value: number) => value : (value: number) => Math.floor((value * 255) / max + 0.5)
  const key = (n: number) => (transparency && transparency.length >= n * 2 ? Array.from({ length: n }, (_, i) => (transparency[i * 2]! << 8) | transparency[i * 2 + 1]!) : undefined)

  if (colorType === COLOR_PALETTE) {
    return (pixels, row, first, rgba, to) => {
      const index = read(pixels, row, first)
      if (index * 3 + 2 >= palette.length) throw new Error(`PNG pixel uses palette entry ${index}, past the palette's end`)
      rgba[to] = palette[index * 3]!
      rgba[to + 1] = palette[index * 3 + 1]!
      rgba[to + 2] = palette[index * 3 + 2]!
      rgba[to + 3] = transparency?.[index] ?? 255
    }
  }
  if (colorType === COLOR_GRAY) {
    const gray = key(1)?.[0]
    return (pixels, row, first, rgba, to) => {
      const value = read(pixels, row, first)
      if (value === gray) {
        rgba.fill(0, to, to + 4)
      } else {
        rgba.fill(to8(value), to, to + 3)
        rgba[to + 3] = 255
      }
    }
  }
  if (colorType === COLOR_GRAY_ALPHA) {
    return (pixels, row, first, rgba, to) => {
      rgba.fill(to8(read(pixels, row, first)), to, to + 3)
      rgba[to + 3] = to8(read(pixels, row, first + 1))
    }
  }
  if (colorType === COLOR_RGB) {
    const color = key(3)
    return (pixels, row, first, rgba, to) => {
      const r = read(pixels, row, first)
      const g = read(pixels, row, first + 1)
      const b = read(pixels, row, first + 2)
      if (color && r === color[0] && g === color[1] && b === color[2]) {
        rgba.fill(0, to, to + 4)
      } else {
        rgba.set([to8(r), to8(g), to8(b), 255], to)
      }
    }
  }
  return (pixels, row, first, rgba, to) => {
    for (let c = 0; c < 4; c++) rgba[to + c] = to8(read(pixels, row, first + c))
  }
}
