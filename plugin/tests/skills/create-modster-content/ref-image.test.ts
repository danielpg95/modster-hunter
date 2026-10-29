import { describe, expect, test } from 'claude-code/testing'
import { clearReaching, indexedRgba, parseRgb, refImage, trimEdges } from '../../../skills/create-modster-content/scripts/lib'

// The reduction the helper's `reduce` and tools/ref-sprite.mjs share (P5-22, P5-50).

/** A 6×5 image: green with a sky pixel inside, sky reaching in along the top, a white speck on the bottom edge. */
function sky() {
  const rows = ['111111', '001000', '000100', '000000', '-20000']
  const pixels = Int16Array.from(rows.join('').split('').map((c) => (c === '-' ? -1 : Number(c))))
  return { image: { width: 6, height: 5, pixels }, palette: [[40, 160, 60], [143, 211, 240], [250, 250, 250]] as [number, number, number][] }
}

describe('ref-image', () => {
  test('refImage cuts a subject out along its outline and keeps its colours', () => {
    const data = new Uint8Array(20 * 20 * 4)
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const d = Math.hypot(x + 0.5 - 10, y + 0.5 - 10)
        data.set(d <= 6 ? (d > 5 ? [10, 10, 10, 255] : [200, 40, 40, 255]) : [230, 230, 230, 255], (y * 20 + x) * 4)
      }
    }
    const reduced = refImage({ width: 20, height: 20, data }, { crop: { x: 0, y: 0, w: 20, h: 20 }, size: { w: 10, h: 10 }, colors: 4 })
    const rgba = indexedRgba(reduced)
    expect(rgba.data[3]).toBe(0)
    expect(Array.from({ length: 4 }, (_, i) => rgba.data[(5 * 10 + 5) * 4 + i])).toEqual([200, 40, 40, 255])
  })

  test('clearReaching clears a colour reaching the outside and keeps it where it is enclosed', () => {
    const { image, palette } = sky()
    clearReaching(image, palette, [[140, 210, 235]], 20)
    expect([image.pixels[0], image.pixels[2 + 6]]).toEqual([-1, -1])
    expect(image.pixels[3 + 12]).toBe(1)
  })

  test('trimEdges clears pale pixels on the outer edge only', () => {
    const { image, palette } = sky()
    trimEdges(image, palette, 240)
    expect(image.pixels[1 + 24]).toBe(-1)
    expect(image.pixels[0]).toBe(1)
  })

  test('parseRgb reads #rrggbb and refuses anything else', () => {
    expect(parseRgb('#8fd3f0')).toEqual([143, 211, 240])
    expect(() => parseRgb('skyblue')).toThrow()
  })
})
