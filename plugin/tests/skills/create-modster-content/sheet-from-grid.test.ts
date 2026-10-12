import { describe, expect, test } from 'claude-code/testing'
import { formatIssue } from '../../../hooks/content'
import { sheetFromGrid } from '../../../skills/create-modster-content/scripts/lib'

const file = 'grid.json'
const problems = (value: unknown) => sheetFromGrid(value, file).issues.map(formatIssue)

describe('sheetFromGrid', () => {
  test('frames sit side by side, one character per pixel', () => {
    const result = sheetFromGrid({ palette: { '.': 'transparent', r: '#ff0000', b: '#0000ff80' }, frames: [['r.'], ['.b']] }, file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.frames).toBe(2)
    expect([result.value.image.width, result.value.image.height]).toEqual([4, 1])
    expect(Array.from(result.value.image.data)).toEqual([255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 128])
  })

  test('any single character can be a key, emoji included', () => {
    expect(sheetFromGrid({ palette: { '🟩': '#00ff00' }, frames: [['🟩🟩']] }, file).ok).toBe(true)
  })

  test('a bad palette is reported per key', () => {
    expect(problems({ palette: { ab: '#000000', x: 'red', y: '#12345' }, frames: [['x']] })).toEqual([
      'grid.json: palette.ab must be a single character',
      'grid.json: palette.x must be "transparent", #rrggbb or #rrggbbaa, not "red"',
      'grid.json: palette.y must be "transparent", #rrggbb or #rrggbbaa, not "#12345"',
    ])
    expect(problems({ palette: {}, frames: [['x']] })[0]).toMatch(/^grid.json: palette must map one-character keys/)
  })

  test('frames must be 1–8 lists of rows', () => {
    const palette = { x: '#000000' }
    expect(problems({ palette, frames: [] })).toEqual(['grid.json: frames must be a list of 1–8 frames, each a list of rows'])
    expect(problems({ palette, frames: Array.from({ length: 9 }, () => ['x']) })).toEqual(['grid.json: frames must be a list of 1–8 frames, each a list of rows'])
    expect(problems({ palette, frames: [['x'], 'x', [1]] })).toEqual([
      'grid.json: frames[1] must be a list of rows (strings)',
      'grid.json: frames[2] must be a list of rows (strings)',
    ])
  })

  test('rows and frames must all match the first, and use only palette keys', () => {
    expect(problems({ palette: { x: '#000000', '.': 'transparent' }, frames: [['x.', 'xx'], ['x.'], ['x', 'q.']] })).toEqual([
      'grid.json: frames[1] has 1 rows; frame 0 has 2, and every frame must match',
      'grid.json: frames[2][0] is 1 characters wide; every row must be 2, like the first',
      'grid.json: frames[2][1] uses "q" at column 0, which isn\'t in the palette',
    ])
  })

  test('unknown fields and non-objects are errors', () => {
    expect(problems({ palette: { x: '#000000' }, frames: [['x']], size: 8 })).toEqual(['grid.json: size is not a known field'])
    expect(problems([])).toEqual(['grid.json must be an object with "palette" and "frames", not a list'])
  })
})
