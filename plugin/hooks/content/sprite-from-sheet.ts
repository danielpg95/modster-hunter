import { CONTENT } from '../constants'
import { IssueList } from './issue-list'
import type { Sprite, Validation } from './types'
import { validateSprite } from './validate-sprite'

/** Decoded image pixels: RGBA, 4 bytes per pixel, row by row. */
export interface RgbaImage {
  width: number
  height: number
  data: ArrayLike<number>
}

// Terminal cells can't blend, so alpha is cut in two (decision 0012, CONTENT_FORMAT "Alpha")
const ALPHA_CUTOFF = 128
const TRANSPARENT = '#00000000'

/**
 * Turns a sprite sheet (frames side by side, equal width) into a `.sprite.json`
 * value (decision 0008). Index 0 is transparent; opaque colors follow in the
 * order they first appear. The result is checked with `validateSprite`, so an
 * `ok` result is always a valid file. Problems come back as issues with a hint.
 */
export function spriteFromSheet(sheet: RgbaImage, frameCount: number, file: string): Validation<Sprite> {
  const issues = new IssueList(file)
  const { sprite: bounds } = CONTENT

  if (!Number.isInteger(frameCount) || frameCount < bounds.framesMin || frameCount > bounds.framesMax) {
    return issues.fail('frames', `must be ${bounds.framesMin}–${bounds.framesMax} frames (asked for ${frameCount})`)
  }
  if (sheet.width % frameCount !== 0) {
    return issues.fail(
      'frames',
      `can't split a ${sheet.width} px wide sheet into ${frameCount} equal frames; frames sit side by side, so the width must be a multiple of the frame count`,
    )
  }
  const width = sheet.width / frameCount
  const height = sheet.height
  if (width < bounds.widthMin || width > bounds.widthMax || height < bounds.heightMin || height > bounds.heightMax || height % 2 !== 0) {
    return issues.fail(
      '',
      `frames are ${width}×${height} px; they must be ${bounds.widthMin}–${bounds.widthMax} wide and ${bounds.heightMin}–${bounds.heightMax} tall with an even height (decision 0021). Resize the art or check --frames`,
    )
  }

  const palette = [TRANSPARENT]
  const indexOf = new Map<string, number>([[TRANSPARENT, 0]])
  const frames: string[] = []
  for (let frame = 0; frame < frameCount; frame++) {
    const indexes = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const at = (y * sheet.width + frame * width + x) * 4
        const color = colorAt(sheet.data, at)
        let index = indexOf.get(color)
        if (index === undefined) {
          index = palette.length
          palette.push(color)
          indexOf.set(color, index)
        }
        // Past the limit: keep counting colors for the message, but don't write a bad index
        indexes[y * width + x] = index < 256 ? index : 0
      }
    }
    frames.push(encodeBase64(indexes))
  }

  if (palette.length > bounds.paletteMax) {
    return issues.fail(
      'palette',
      `the art uses ${palette.length - 1} opaque colors; at most ${bounds.paletteMax - 1} fit (plus transparent). Reduce the colors (built-in Modsters use 16 or fewer)`,
    )
  }

  const sprite: Sprite = { schemaVersion: 1, width, height, palette, frames }
  return validateSprite(sprite, { file })
}

/** `#rrggbbaa` of the pixel at byte offset `at`, with alpha snapped to 00 or ff. */
function colorAt(data: ArrayLike<number>, at: number): string {
  const alpha = data[at + 3] ?? 0
  if (alpha < ALPHA_CUTOFF) return TRANSPARENT
  const hex = (value: number | undefined): string => (value ?? 0).toString(16).padStart(2, '0')
  return `#${hex(data[at])}${hex(data[at + 1])}${hex(data[at + 2])}ff`
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
