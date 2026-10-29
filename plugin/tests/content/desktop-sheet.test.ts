import { describe, expect, test } from 'claude-code/testing'
import { CONTENT } from '../../hooks/constants'
import { desktopSheet, formatIssue, type DesktopSheetRules } from '../../hooks/content'
import { base64FromBytes } from '../fixtures/base64-from-bytes'
import { desktopPng } from '../fixtures/desktop-png'

const file = 'modsters/sproutling/modster.json'
const field = 'desktopSprite.file'
const rules = CONTENT.desktop.modster

const base64 = base64FromBytes
const check = (png: Uint8Array, frames: number, sheetRules: DesktopSheetRules = rules) => desktopSheet(base64(png), { frames, field, file }, sheetRules)
const lines = (result: ReturnType<typeof check>): string[] => result.issues.map(formatIssue)

describe('desktopSheet', () => {
  test('a sheet within the bounds passes and keeps the PNG as-is (decision 0045 point 9)', () => {
    const png = desktopPng(16, 12, 2)
    const result = check(png, 2)
    expect(result.issues).toEqual([])
    if (!result.ok) return
    expect([result.value.width, result.value.height, result.value.frames]).toEqual([16, 12, 2])
    expect(result.value.colors).toEqual(['#ff0000'])
    // One red pixel at each frame's top left: a throw aims at it, and it's the main colour
    expect([result.value.bounds, result.value.mainColor]).toEqual([{ x0: 0, y0: 0, x1: 0, y1: 0 }, '#ff0000'])
    expect(result.value.png).toBe(base64(png))
  })

  test('frames of exactly 128×128 pass', () => {
    expect(check(desktopPng(128, 128, 2, () => undefined), 2, { ...rules, bytesMax: 1 << 20 }).ok).toBe(true)
  })

  test('a PNG over the byte budget is an error, before decoding (point 3)', () => {
    // Stored blocks: 64×64×2 frames of RGBA is about 33 KiB, over a 24 KiB budget
    expect(lines(check(desktopPng(64, 64, 2), 2, CONTENT.desktop.catcher))).toEqual([`${file}: ${field} points to a 32.2 KiB PNG; desktop art here is at most 24 KiB`])
  })

  test('frames past the bounds are an error, before decoding', () => {
    expect(lines(check(desktopPng(130, 8, 2), 2))).toEqual([`${file}: ${field} points to 130×8 frames; at most 128×128`])
    expect(lines(check(desktopPng(16, 49, 1), 1, CONTENT.desktop.background))).toEqual([`${file}: ${field} points to 16×49 frames; at most 192×48`])
  })

  test("a sheet that doesn't split into its frames is an error", () => {
    expect(lines(check(desktopPng(31, 8, 1), 2))).toEqual([`${file}: ${field} points to a 31 px wide sheet, which doesn't split into 2 equal frames`])
  })

  test('a file that is not a PNG is one error, never a throw', () => {
    expect(lines(check(new TextEncoder().encode('not a png'), 2))).toEqual([`${file}: ${field} points to a PNG that can't be read: not a PNG file`])
  })

  test('half-transparent pixels are an error: the desktop draws them as-is (point 6)', () => {
    const png = desktopPng(8, 8, 2, (x, y) => (y === 0 && x < 3 ? [0, 0, 0, 128] : [0, 0, 0, 255]))
    expect(lines(check(png, 2))).toEqual([`${file}: ${field} has 3 half-transparent pixels; every pixel must be fully opaque or fully clear`])
  })

  test('64 opaque colours pass and 65 are an error (point 6)', () => {
    const colours = (count: number) => desktopPng(16, 8, 2, (x, y) => [(y * 16 + x) % count, 0, 0, 255])
    expect(check(colours(64), 2).ok).toBe(true)
    expect(lines(check(colours(65), 2))).toEqual([`${file}: ${field} has 65 opaque colours; at most 64`])
  })
})
