import { CONTENT } from '../constants'
import { checkKeys, checkNumber, checkPatternValue, checkSchemaVersion, describe, fieldPath, isObject } from './fields'
import { IssueList } from './issue-list'
import type { Sprite, Validation } from './types'

const KEYS = ['schemaVersion', 'width', 'height', 'palette', 'shinyPalette', 'frames']
const REQUIRED = ['schemaVersion', 'width', 'height', 'palette', 'frames']
// Standard base64 with padding, nothing else (no whitespace, no URL alphabet)
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

/**
 * Checks a parsed `.sprite.json` against CONTENT_FORMAT.md and decision 0012.
 * `singleFrame` is for a biome background, which has exactly one frame.
 */
export function validateSprite(input: unknown, where: { file: string; singleFrame?: boolean }): Validation<Sprite> {
  const issues = new IssueList(where.file)
  if (!isObject(input)) return issues.fail('', 'must be a JSON object')

  const { sprite } = CONTENT
  checkKeys(input, KEYS, REQUIRED, issues)
  checkSchemaVersion(input, CONTENT.schemaVersion, issues)
  const width = checkNumber(input, 'width', { min: sprite.widthMin, max: sprite.widthMax, integer: true }, issues)
  const height = checkNumber(input, 'height', { min: sprite.heightMin, max: sprite.heightMax, integer: true }, issues)
  // Two pixels per terminal cell (decision 0012)
  if (typeof height === 'number' && height % 2 !== 0) issues.error('height', `must be even (it is ${height})`)

  const palette = checkPalette(input.palette, 'palette', issues)
  if (input.shinyPalette !== undefined) {
    const shiny = checkPalette(input.shinyPalette, 'shinyPalette', issues)
    if (palette && shiny && shiny.length !== palette.length) {
      issues.error('shinyPalette', `must have as many colors as palette (${palette.length}; it has ${shiny.length})`)
    }
  }

  const frames = checkFrameList(input.frames, where.singleFrame === true, issues)
  if (frames && typeof width === 'number' && typeof height === 'number' && height % 2 === 0 && palette) {
    frames.forEach((frame, index) => checkFrame(frame, index, width, height, palette.length, issues))
  }

  return issues.result(input as unknown as Sprite)
}

function checkPalette(value: unknown, field: string, issues: IssueList): string[] | undefined {
  const { paletteMin, paletteMax } = CONTENT.sprite
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length < paletteMin || value.length > paletteMax) {
    issues.error(field, `must be a list of ${paletteMin}–${paletteMax} colors like "#2e7d32ff"`)
    return undefined
  }
  const colors: string[] = []
  value.forEach((entry: unknown, index) => {
    const color = checkPatternValue(entry, CONTENT.rgbaColorPattern, 'a color like "#2e7d32ff"', fieldPath(field, index), issues)
    if (color !== undefined) colors.push(color)
  })
  if (colors.length !== value.length) return undefined

  // Soft rules: the sprite still draws, so these are warnings
  const alphaOf = (color: string): string => color.slice(7).toLowerCase()
  const first = colors[0]
  if (first !== undefined && alphaOf(first) !== '00') {
    issues.warning(fieldPath(field, 0), 'should be fully transparent (alpha 00)')
  }
  colors.forEach((color, index) => {
    const alpha = alphaOf(color)
    if (alpha !== '00' && alpha !== 'ff') {
      // Terminal cells can't blend: below 80 is drawn transparent, 80 and up opaque (decision 0012)
      issues.warning(fieldPath(field, index), `alpha should be 00 or ff (it is ${alpha}); it will be drawn ${parseInt(alpha, 16) < 0x80 ? 'transparent' : 'opaque'}`)
    }
  })
  return colors
}

function checkFrameList(value: unknown, singleFrame: boolean, issues: IssueList): string[] | undefined {
  if (value === undefined) return undefined
  const { framesMin, framesMax } = CONTENT.sprite
  if (!Array.isArray(value)) {
    issues.error('frames', `must be a list of ${framesMin}–${framesMax} base64 strings`)
    return undefined
  }
  if (singleFrame && value.length !== 1) {
    issues.error('frames', `must have exactly 1 frame for a background (it has ${value.length})`)
    return undefined
  }
  if (value.length < framesMin || value.length > framesMax) {
    issues.error('frames', `must have ${framesMin}–${framesMax} frames (it has ${value.length})`)
    return undefined
  }
  const frames: string[] = []
  value.forEach((frame: unknown, index) => {
    if (typeof frame === 'string') frames.push(frame)
    else issues.error(fieldPath('frames', index), `must be a base64 string (it is ${describe(frame)})`)
  })
  return frames.length === value.length ? frames : undefined
}

function checkFrame(frame: string, index: number, width: number, height: number, colors: number, issues: IssueList): void {
  const field = fieldPath('frames', index)
  const bytes = decodeBase64(frame)
  if (!bytes) {
    issues.error(field, 'is not valid base64')
    return
  }
  if (bytes.length !== width * height) {
    issues.error(field, `must decode to width × height = ${width * height} bytes (it has ${bytes.length})`)
    return
  }
  const bad = bytes.findIndex((byte) => byte >= colors)
  if (bad !== -1) {
    const x = bad % width
    const y = Math.floor(bad / width)
    issues.error(field, `pixel (${x}, ${y}) uses palette index ${bytes[bad]}, but the palette has ${colors} colors`)
  }
}

function decodeBase64(text: string): Uint8Array | undefined {
  if (!BASE64.test(text)) return undefined
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
