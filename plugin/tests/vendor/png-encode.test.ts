import { describe, expect, test } from 'claude-code/testing'
import { decodePng } from '../../hooks/vendor/png'
import { encodePng } from '../../hooks/vendor/png-encode'
import { rgbaSheet } from '../fixtures/rgba-sheet'

const LIMITS = { maxWidth: 64, maxHeight: 64 }
const COLOR_TYPE_AT = 25

describe('encodePng', () => {
  test('a few colours become a palette PNG that decodes to the same pixels', () => {
    const image = rgbaSheet(12, 9, (x, y) => ((x + y) % 3 === 0 ? undefined : [x * 20, y * 25, 100, 255]))
    const png = encodePng(image)
    expect(png[COLOR_TYPE_AT]).toBe(3)
    const decoded = decodePng(png, LIMITS)
    expect([decoded.width, decoded.height]).toEqual([12, 9])
    expect([...decoded.data]).toEqual(Array.from(image.data))
  })

  test('every clear pixel decodes clear, whatever colour it carried', () => {
    const image = rgbaSheet(4, 1, (x) => (x < 2 ? [x * 90, 10, 10, 0] : [200, 100, 50, 255]))
    const decoded = decodePng(encodePng(image), LIMITS)
    expect([...decoded.data]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 200, 100, 50, 255, 200, 100, 50, 255])
  })

  test('half-clear pixels keep their alpha', () => {
    const image = rgbaSheet(2, 1, (x) => [10, 20, 30, x ? 128 : 255])
    expect([...decodePng(encodePng(image), LIMITS).data]).toEqual(Array.from(image.data))
  })

  test('past 256 colours it stays RGBA, still exact', () => {
    const image = rgbaSheet(32, 16, (x, y) => [x * 8, y * 16, (x * y) & 0xff, 255])
    const png = encodePng(image)
    expect(png[COLOR_TYPE_AT]).toBe(6)
    expect([...decodePng(png, LIMITS).data]).toEqual(Array.from(image.data))
  })
})
