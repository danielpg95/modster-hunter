import { CONTENT } from '../../../../hooks/constants'
import type { RgbaImage, Validation } from '../../../../hooks/content'
import { describe, isObject } from '../../../../hooks/content/fields'
import { IssueList } from '../../../../hooks/content/issue-list'

/** A drawn sheet: frames side by side, ready for `spriteFromSheet`. */
export interface GridSheet {
  image: RgbaImage
  frames: number
}

const TRANSPARENT = 'transparent'
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/

/**
 * Turns the helper's text grid into a sheet (decision 0025): a `palette` of
 * one-character keys (`"transparent"`, `#rrggbb` or `#rrggbbaa`) and `frames`,
 * each a list of equal rows, one character per pixel. Sprite bounds are left
 * to `spriteFromSheet`. `maxFrames` is higher for a catcher (decision 0035).
 * Never throws.
 */
export function sheetFromGrid(value: unknown, file: string, maxFrames: number = CONTENT.sprite.framesMax): Validation<GridSheet> {
  const issues = new IssueList(file)
  if (!isObject(value)) return issues.fail('', `must be an object with "palette" and "frames", not ${describe(value)}`)
  for (const key of Object.keys(value)) if (key !== 'palette' && key !== 'frames') issues.error(key, 'is not a known field')

  const colors = new Map<string, [number, number, number, number]>()
  const palette = value['palette']
  if (!isObject(palette) || Object.keys(palette).length === 0) {
    issues.error('palette', 'must map one-character keys to colors, e.g. { ".": "transparent", "k": "#1b1b1b" }')
  } else {
    for (const [key, color] of Object.entries(palette)) {
      if ([...key].length !== 1) issues.error(`palette.${key}`, 'must be a single character')
      else if (color === TRANSPARENT) colors.set(key, [0, 0, 0, 0])
      else if (typeof color === 'string' && COLOR_PATTERN.test(color)) colors.set(key, rgba(color))
      else issues.error(`palette.${key}`, `must be "transparent", #rrggbb or #rrggbbaa, not ${describe(color)}`)
    }
  }

  const frames = value['frames']
  const { framesMin } = CONTENT.sprite
  const framesMax = maxFrames
  if (!Array.isArray(frames) || frames.length < framesMin || frames.length > framesMax) {
    issues.error('frames', `must be a list of ${framesMin}–${framesMax} frames, each a list of rows`)
    return issues.result({ image: { width: 0, height: 0, data: [] }, frames: 0 })
  }
  const rows: string[][][] = []
  frames.forEach((frame: unknown, f) => {
    if (!Array.isArray(frame) || frame.length === 0 || frame.some((row) => typeof row !== 'string')) {
      issues.error(`frames[${f}]`, 'must be a list of rows (strings)')
      return
    }
    rows.push(frame.map((row: string) => [...row]))
  })
  if (issues.hasErrors) return issues.result({ image: { width: 0, height: 0, data: [] }, frames: 0 })

  const width = rows[0]![0]!.length
  const height = rows[0]!.length
  rows.forEach((frame, f) => {
    if (frame.length !== height) issues.error(`frames[${f}]`, `has ${frame.length} rows; frame 0 has ${height}, and every frame must match`)
    frame.forEach((row, r) => {
      if (row.length !== width) {
        issues.error(`frames[${f}][${r}]`, `is ${row.length} characters wide; every row must be ${width}, like the first`)
        return
      }
      const unknown = row.findIndex((key) => !colors.has(key))
      if (unknown >= 0) issues.error(`frames[${f}][${r}]`, `uses "${row[unknown]}" at column ${unknown}, which isn't in the palette`)
    })
  })
  if (issues.hasErrors) return issues.result({ image: { width: 0, height: 0, data: [] }, frames: 0 })

  const sheetWidth = width * rows.length
  const data = new Uint8Array(sheetWidth * height * 4)
  rows.forEach((frame, f) => {
    frame.forEach((row, y) => {
      row.forEach((key, x) => data.set(colors.get(key)!, (y * sheetWidth + f * width + x) * 4))
    })
  })
  return issues.result({ image: { width: sheetWidth, height, data }, frames: rows.length })
}

function rgba(color: string): [number, number, number, number] {
  const channel = (i: number) => Number.parseInt(color.slice(1 + i * 2, 3 + i * 2), 16)
  return [channel(0), channel(1), channel(2), color.length === 9 ? channel(3) : 255]
}
