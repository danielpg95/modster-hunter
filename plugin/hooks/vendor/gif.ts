// GIF → RGBA frames decoder, pure TS with no dependencies (decision 0025).
// Part of Modster Hunter, MIT license.

export interface DecodedGif {
  width: number
  height: number
  /** One RGBA canvas per frame (4 bytes per pixel, row by row), as the animation shows it */
  frames: Uint8Array[]
}

interface FrameRecord {
  left: number
  top: number
  width: number
  height: number
  interlaced: boolean
  palette: Uint8Array
  transparentIndex: number | undefined
  disposal: number
  minCodeSize: number
  data: Uint8Array
}

const MAX_CODES = 4096
const DISPOSE_BACKGROUND = 2
const DISPOSE_PREVIOUS = 3
// Interlaced rows come in four passes: first row, then the step between rows
const INTERLACE_PASSES = [
  [0, 8],
  [4, 8],
  [2, 4],
  [1, 2],
] as const

const u16 = (bytes: Uint8Array, at: number): number => bytes[at]! | (bytes[at + 1]! << 8)

/**
 * Decodes a GIF and plays it onto a transparent canvas, honoring each frame's
 * transparent color and disposal, the way `tools/sprite.mjs` does with omggif.
 * The background color is ignored: frames start from transparent. A screen
 * larger than `limits`, or more frames than `limits.maxFrames`, is refused
 * before any pixel data is decoded. A broken file throws `Error`.
 */
export function decodeGif(gif: Uint8Array, limits: { maxWidth: number; maxHeight: number; maxFrames: number }): DecodedGif {
  const signature = String.fromCharCode(...gif.subarray(0, 6))
  if (signature !== 'GIF87a' && signature !== 'GIF89a') throw new Error('not a GIF file')
  if (gif.length < 13) throw new Error('GIF is cut short')
  const width = u16(gif, 6)
  const height = u16(gif, 8)
  if (width === 0 || height === 0) throw new Error('GIF has no pixels')
  if (width > limits.maxWidth || height > limits.maxHeight) {
    throw new Error(`GIF is ${width}×${height} px; at most ${limits.maxWidth}×${limits.maxHeight} fits`)
  }

  const records = readFrames(gif, gif[10]!)
  if (records.length === 0) throw new Error('GIF has no frames')
  if (records.length > limits.maxFrames) throw new Error(`GIF has ${records.length} frames; at most ${limits.maxFrames} fit`)

  const canvas = new Uint8Array(width * height * 4)
  const frames: Uint8Array[] = []
  records.forEach((record, n) => {
    const before = record.disposal === DISPOSE_PREVIOUS ? canvas.slice() : undefined
    const indexes = lzwDecode(record.data, record.minCodeSize, record.width * record.height, n)
    blit(canvas, width, height, record, indexes)
    frames.push(canvas.slice())
    if (record.disposal === DISPOSE_BACKGROUND) {
      for (let y = record.top; y < Math.min(height, record.top + record.height); y++) {
        canvas.fill(0, (y * width + record.left) * 4, (y * width + Math.min(width, record.left + record.width)) * 4)
      }
    } else if (before) {
      canvas.set(before)
    }
  })
  return { width, height, frames }
}

/** Walks the blocks after the screen descriptor and collects each frame, without decoding pixels. */
function readFrames(gif: Uint8Array, screenFlags: number): FrameRecord[] {
  let at = 13
  const need = (bytes: number) => {
    if (at + bytes > gif.length) throw new Error('GIF is cut short')
  }
  let globalPalette: Uint8Array | undefined
  if (screenFlags & 0x80) {
    const size = 3 << ((screenFlags & 7) + 1)
    need(size)
    globalPalette = gif.subarray(at, at + size)
    at += size
  }

  // Concatenates data sub-blocks (a length byte, then that many bytes) up to the empty one
  const subBlocks = (): Uint8Array => {
    const parts: Uint8Array[] = []
    for (;;) {
      need(1)
      const length = gif[at++]!
      if (length === 0) break
      need(length)
      parts.push(gif.subarray(at, at + length))
      at += length
    }
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
    let offset = 0
    for (const part of parts) {
      out.set(part, offset)
      offset += part.length
    }
    return out
  }

  const frames: FrameRecord[] = []
  let control: { disposal: number; transparentIndex: number | undefined } | undefined
  for (;;) {
    need(1)
    const block = gif[at++]!
    if (block === 0x3b) break
    if (block === 0x21) {
      need(1)
      const label = gif[at++]!
      const data = subBlocks()
      if (label === 0xf9 && data.length >= 4) {
        control = { disposal: (data[0]! >> 2) & 7, transparentIndex: data[0]! & 1 ? data[3]! : undefined }
      }
    } else if (block === 0x2c) {
      need(10)
      const flags = gif[at + 8]!
      const frame = { left: u16(gif, at), top: u16(gif, at + 2), width: u16(gif, at + 4), height: u16(gif, at + 6) }
      at += 9
      let palette = globalPalette
      if (flags & 0x80) {
        const size = 3 << ((flags & 7) + 1)
        need(size)
        palette = gif.subarray(at, at + size)
        at += size
      }
      if (!palette) throw new Error(`GIF frame ${frames.length + 1} has no color table`)
      need(1)
      const minCodeSize = gif[at++]!
      if (minCodeSize < 1 || minCodeSize > 11) throw new Error(`GIF frame ${frames.length + 1} has a broken LZW code size ${minCodeSize}`)
      frames.push({
        ...frame,
        interlaced: (flags & 0x40) !== 0,
        palette,
        transparentIndex: control?.transparentIndex,
        disposal: control?.disposal ?? 0,
        minCodeSize,
        data: subBlocks(),
      })
      // A graphic control extension applies to the next frame only
      control = undefined
    } else {
      throw new Error(`GIF has an unknown block 0x${block.toString(16).padStart(2, '0')}`)
    }
  }
  return frames
}

/** Decodes GIF-flavored LZW (codes packed low bits first, growing to 12 bits) into `count` palette indexes. */
function lzwDecode(data: Uint8Array, minCodeSize: number, count: number, frame: number): Uint8Array {
  const clear = 1 << minCodeSize
  const end = clear + 1
  const prefix = new Uint16Array(MAX_CODES)
  const suffix = new Uint8Array(MAX_CODES)
  const stack = new Uint8Array(MAX_CODES + 1)
  const out = new Uint8Array(count)
  let written = 0

  let codeSize = minCodeSize + 1
  let next = end + 1
  let previous = -1
  let previousFirst = 0
  let bits = 0
  let buffer = 0
  let at = 0

  while (written < count) {
    while (bits < codeSize && at < data.length) {
      buffer |= data[at++]! << bits
      bits += 8
    }
    if (bits < codeSize) break
    const code = buffer & ((1 << codeSize) - 1)
    buffer >>>= codeSize
    bits -= codeSize

    if (code === clear) {
      codeSize = minCodeSize + 1
      next = end + 1
      previous = -1
      continue
    }
    if (code === end) break
    if (previous === -1) {
      if (code >= clear) throw new Error(`GIF frame ${frame + 1} has broken image data`)
      out[written++] = code
      previous = code
      previousFirst = code
      continue
    }
    if (code > next) throw new Error(`GIF frame ${frame + 1} has broken image data`)

    // Walk the code's string backwards onto the stack; a code not yet in the table repeats the previous string's first index
    let size = 0
    let current = code
    if (code === next) {
      stack[size++] = previousFirst
      current = previous
    }
    while (current >= clear) {
      stack[size++] = suffix[current]!
      current = prefix[current]!
    }
    stack[size++] = current
    while (size > 0 && written < count) out[written++] = stack[--size]!

    if (next < MAX_CODES) {
      prefix[next] = previous
      suffix[next] = current
      next++
      if (next === 1 << codeSize && codeSize < 12) codeSize++
    }
    previous = code
    previousFirst = current
  }
  if (written < count) throw new Error(`GIF frame ${frame + 1} image data is cut short`)
  return out
}

/** Draws a frame's opaque pixels onto the canvas, unweaving interlaced rows and clipping to the screen. */
function blit(canvas: Uint8Array, width: number, height: number, record: FrameRecord, indexes: Uint8Array): void {
  const rows: number[] = []
  if (record.interlaced) {
    for (const [first, step] of INTERLACE_PASSES) for (let y = first; y < record.height; y += step) rows.push(y)
  } else {
    for (let y = 0; y < record.height; y++) rows.push(y)
  }
  const colors = record.palette.length / 3
  rows.forEach((frameY, i) => {
    const y = record.top + frameY
    if (y >= height) return
    for (let frameX = 0; frameX < record.width; frameX++) {
      const x = record.left + frameX
      const index = indexes[i * record.width + frameX]!
      if (x >= width || index === record.transparentIndex) continue
      if (index >= colors) throw new Error(`GIF pixel uses color ${index}, past the color table's end`)
      const to = (y * width + x) * 4
      canvas.set(record.palette.subarray(index * 3, index * 3 + 3), to)
      canvas[to + 3] = 255
    }
  })
}
