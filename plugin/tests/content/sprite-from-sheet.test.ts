import { describe, expect, test } from 'claude-code/testing'
import { spriteFromSheet, validateSprite } from '../../hooks/content'
import { rgbaSheet } from '../fixtures/rgba-sheet'

const file = 'sprite.png'
const RED = [255, 0, 0, 255]
const GREEN = [0, 128, 0, 255]

const bytes = (frame: string): number[] => [...atob(frame)].map((char) => char.charCodeAt(0))

describe('spriteFromSheet', () => {
  test('frames side by side become palette indexes, with index 0 transparent', () => {
    // Two 8×8 frames: frame 0 has a red top-left pixel, frame 1 a green one
    const sheet = rgbaSheet(16, 8, (x, y) => (y === 0 && x === 0 ? RED : y === 0 && x === 8 ? GREEN : undefined))
    const result = spriteFromSheet(sheet, 2, file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.palette).toEqual(['#00000000', '#ff0000ff', '#008000ff'])
    expect([result.value.width, result.value.height, result.value.frames.length]).toEqual([8, 8, 2])
    expect(bytes(result.value.frames[0] ?? '').slice(0, 2)).toEqual([1, 0])
    expect(bytes(result.value.frames[1] ?? '').slice(0, 2)).toEqual([2, 0])
  })

  test('the output always passes the validator with no issues', () => {
    // 8 × 4 = 32 colors, under the limit
    const sheet = rgbaSheet(48, 12, (x, y) => [(x % 8) * 30, (y % 4) * 60, 0, 255])
    const result = spriteFromSheet(sheet, 2, file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.issues).toEqual([])
    expect(validateSprite(result.value, { file: 'x.sprite.json' }).issues).toEqual([])
  })

  test('alpha below 128 becomes transparent and 128 or more opaque', () => {
    const sheet = rgbaSheet(8, 8, (x, y) => (y > 0 ? undefined : x === 0 ? [255, 0, 0, 127] : x === 1 ? [255, 0, 0, 128] : undefined))
    const result = spriteFromSheet(sheet, 1, file)
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.palette).toEqual(['#00000000', '#ff0000ff'])
    expect(bytes(result.value.frames[0] ?? '').slice(0, 2)).toEqual([0, 1])
  })

  test('a color with different alphas above the cutoff is one palette entry', () => {
    const sheet = rgbaSheet(8, 8, (x, y) => (y > 0 ? undefined : x === 0 ? [1, 2, 3, 200] : x === 1 ? [1, 2, 3, 255] : undefined))
    const result = spriteFromSheet(sheet, 1, file)
    expect(result.ok && result.value.palette).toEqual(['#00000000', '#010203ff'])
  })

  test('more than 63 opaque colors is an error with a hint', () => {
    const sheet = rgbaSheet(8, 10, (x, y) => [y * 8 + x, 0, 0, 255])
    const result = spriteFromSheet(sheet, 1, file)
    expect(result.ok).toBe(false)
    expect(result.issues[0]?.problem).toBe(
      'the art uses 80 opaque colors; at most 63 fit (plus transparent). Reduce the colors (built-in Modsters use 16 or fewer)',
    )
  })

  test('exactly 63 opaque colors fit', () => {
    const sheet = rgbaSheet(8, 8, (x, y) => (y * 8 + x < 63 ? [y * 8 + x, 0, 0, 255] : undefined))
    expect(spriteFromSheet(sheet, 1, file).ok).toBe(true)
  })

  for (const [behavior, width, height, frames] of [
    ['a frame narrower than 8 px fails with a hint', 14, 8, 2],
    ['a frame wider than 24 px fails with a hint', 25, 8, 1],
    ['a frame shorter than 8 px fails with a hint', 8, 6, 1],
    ['a frame taller than 12 px fails with a hint', 8, 14, 1],
    ['an odd frame height fails with a hint', 8, 9, 1],
  ] as const) {
    test(behavior, () => {
      const result = spriteFromSheet(rgbaSheet(width, height, () => RED), frames, file)
      expect(result.ok).toBe(false)
      expect(result.issues[0]?.problem.endsWith('(decision 0012). Resize the art or check --frames')).toBe(true)
    })
  }

  test('a sheet that doesn\'t split into equal frames fails with a hint', () => {
    const result = spriteFromSheet(rgbaSheet(20, 8, () => RED), 3, file)
    expect(result.issues[0]?.problem.startsWith("can't split a 20 px wide sheet into 3 equal frames")).toBe(true)
  })

  test('a frame count outside 1–8 fails', () => {
    for (const frames of [0, 9, 1.5]) expect(spriteFromSheet(rgbaSheet(72, 8, () => RED), frames, file).ok).toBe(false)
  })

  test('the largest allowed sheet converts: 8 frames of 24×12', () => {
    const result = spriteFromSheet(rgbaSheet(192, 12, (x) => [x % 24, 0, 0, 255]), 8, file)
    expect(result.ok && [result.value.width, result.value.height, result.value.frames.length]).toEqual([24, 12, 8])
  })
})
