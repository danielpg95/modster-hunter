import { describe, expect, test } from 'claude-code/testing'
import { validateSprite } from '../../hooks/content'
import { issuesAt } from '../fixtures/issues-at'
import { encodeFrame } from '../fixtures/encode-frame'
import { validSprite } from '../fixtures/valid-sprite'

const where = { file: 'modsters/sproutling/sprite.sprite.json' }

type Sprite = Record<string, unknown>
const blank = (width: number, height: number): string => encodeFrame(new Array<number>(width * height).fill(0))

// [behavior, change to a valid 8×8 sprite, field that must get an error]
const INVALID: [string, (sprite: Sprite) => void, string][] = [
  ['a missing schemaVersion is an error', (s) => delete s.schemaVersion, 'schemaVersion'],
  ['a missing width is an error', (s) => delete s.width, 'width'],
  ['a width under 8 is an error', (s) => (s.width = 7), 'width'],
  ['a width over 24 is an error', (s) => (s.width = 25), 'width'],
  ['a fractional width is an error', (s) => (s.width = 8.5), 'width'],
  ['a missing height is an error', (s) => delete s.height, 'height'],
  ['a height under 8 is an error', (s) => (s.height = 6), 'height'],
  ['a height over 12 is an error (decision 0012)', (s) => (s.height = 14), 'height'],
  ['an odd height is an error', (s) => (s.height = 9), 'height'],
  ['a missing palette is an error', (s) => delete s.palette, 'palette'],
  ['an empty palette is an error', (s) => (s.palette = []), 'palette'],
  ['a palette over 64 colors is an error', (s) => (s.palette = new Array<string>(65).fill('#00000000')), 'palette'],
  ['a color without alpha is an error', (s) => ((s.palette as string[])[1] = '#2e7d32'), 'palette[1]'],
  ['a color that is not hex is an error', (s) => ((s.palette as string[])[1] = 'green'), 'palette[1]'],
  ['a shinyPalette of another length is an error', (s) => (s.shinyPalette = ['#00000000', '#6a1b9aff']), 'shinyPalette'],
  ['a bad shinyPalette color is an error', (s) => ((s.shinyPalette as string[])[2] = '#ce93d8'), 'shinyPalette[2]'],
  ['missing frames is an error', (s) => delete s.frames, 'frames'],
  ['no frames is an error', (s) => (s.frames = []), 'frames'],
  ['more than 8 frames is an error', (s) => (s.frames = new Array<string>(9).fill(blank(8, 8))), 'frames'],
  ['a frame that is not text is an error', (s) => ((s.frames as unknown[])[1] = [0, 1, 2]), 'frames[1]'],
  ['a frame that is not base64 is an error', (s) => ((s.frames as string[])[1] = 'not base64!'), 'frames[1]'],
  ['a frame with base64 whitespace is an error', (s) => ((s.frames as string[])[1] = ` ${blank(8, 8)}`), 'frames[1]'],
  ['a frame with too few pixels is an error', (s) => ((s.frames as string[])[0] = blank(8, 7)), 'frames[0]'],
  ['a frame with too many pixels is an error', (s) => ((s.frames as string[])[0] = blank(8, 9)), 'frames[0]'],
  ['a pixel past the palette is an error', (s) => ((s.frames as string[])[1] = encodeFrame([...new Array<number>(63).fill(0), 3])), 'frames[1]'],
  ['an unknown field is an error', (s) => (s.fps = 6), 'fps'],
]

describe('validateSprite', () => {
  test('a valid sprite has no issues', () => {
    const result = validateSprite(validSprite(), where)
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  test('the size bounds of decision 0012 are valid', () => {
    for (const [width, height] of [[8, 8], [24, 12], [16, 10]] as const) {
      const sprite = { ...validSprite(), width, height, frames: [blank(width, height)] }
      expect(validateSprite(sprite, where).issues).toEqual([])
    }
  })

  test('shinyPalette is optional', () => {
    const sprite = validSprite()
    delete sprite.shinyPalette
    expect(validateSprite(sprite, where).ok).toBe(true)
  })

  test('palette colors may be upper case', () => {
    const sprite = validSprite()
    sprite.palette = ['#00000000', '#2E7D32FF', '#A5D6A7FF']
    expect(validateSprite(sprite, where).issues).toEqual([])
  })

  for (const [behavior, change, field] of INVALID) {
    test(behavior, () => {
      const sprite = validSprite()
      change(sprite)
      const result = validateSprite(sprite, where)
      expect(result.ok).toBe(false)
      const found = issuesAt(result, field)
      expect(found.length).toBe(1)
      expect(found[0]?.severity).toBe('error')
    })
  }

  test('a pixel past the palette names where it is', () => {
    const sprite = validSprite()
    const pixels = new Array<number>(64).fill(0)
    pixels[8 * 2 + 5] = 7
    sprite.frames = [encodeFrame(pixels)]
    const [issue] = issuesAt(validateSprite(sprite, where), 'frames[0]')
    expect(issue?.problem).toBe('pixel (5, 2) uses palette index 7, but the palette has 3 colors')
  })

  test('an opaque palette[0] is a warning and the sprite still loads', () => {
    const sprite = validSprite()
    sprite.palette = ['#000000ff', '#2e7d32ff', '#a5d6a7ff']
    const result = validateSprite(sprite, where)
    expect(result.ok).toBe(true)
    expect(issuesAt(result, 'palette[0]')).toEqual([
      { severity: 'warning', file: where.file, field: 'palette[0]', problem: 'should be fully transparent (alpha 00)' },
    ])
  })

  test('partial alpha is a warning that says how it will be drawn', () => {
    const sprite = validSprite()
    sprite.palette = ['#00000000', '#2e7d327f', '#a5d6a780']
    const result = validateSprite(sprite, where)
    expect(result.ok).toBe(true)
    expect(result.issues.map((issue) => [issue.severity, issue.field, issue.problem])).toEqual([
      ['warning', 'palette[1]', 'alpha should be 00 or ff (it is 7f); it will be drawn transparent'],
      ['warning', 'palette[2]', 'alpha should be 00 or ff (it is 80); it will be drawn opaque'],
    ])
  })

  test('shinyPalette gets the same warnings', () => {
    const sprite = validSprite()
    sprite.shinyPalette = ['#00000000', '#6a1b9a40', '#ce93d8ff']
    const result = validateSprite(sprite, where)
    expect(result.ok).toBe(true)
    expect(issuesAt(result, 'shinyPalette[1]')[0]?.severity).toBe('warning')
  })

  test('a background must have exactly one frame', () => {
    const background = { file: 'biomes/whispering-forest/background.sprite.json', singleFrame: true }
    expect(validateSprite(validSprite(), background).ok).toBe(false)
    expect(issuesAt(validateSprite(validSprite(), background), 'frames')[0]?.problem).toBe(
      'must have exactly 1 frame for a background (it has 2)',
    )
    const sprite = { ...validSprite(), frames: [blank(8, 8)] }
    expect(validateSprite(sprite, background).ok).toBe(true)
  })

  test('frames are not decoded when the size is already wrong, so errors are not repeated', () => {
    const sprite = validSprite()
    sprite.width = 30
    expect(validateSprite(sprite, where).issues.map((issue) => issue.field)).toEqual(['width'])
  })

  test('input that is not an object is one error, never a throw', () => {
    for (const input of [null, 'sprite', 0, [[0, 1]]]) {
      const result = validateSprite(input, where)
      expect(result.ok).toBe(false)
      expect(result.issues.length).toBe(1)
    }
  })

  test('odd values in every field are reported, never thrown', () => {
    for (const value of [null, {}, [], 'x', -1, Number.NaN, [null], [{}], ['====']]) {
      const sprite = { schemaVersion: value, width: value, height: value, palette: value, shinyPalette: value, frames: value }
      expect(validateSprite(sprite, where).ok).toBe(false)
    }
  })
})
