import { describe, expect, test } from 'claude-code/testing'
import { opaqueBounds } from '../../hooks/render'

// A 4×3 frame with the given pixels opaque
const frame = (...opaque: [number, number][]) => {
  const rgba = new Uint8Array(4 * 3 * 4)
  for (const [x, y] of opaque) rgba[(y * 4 + x) * 4 + 3] = 255
  return rgba
}

describe('opaqueBounds', () => {
  test('the box covers every frame, so the art holds still while it animates (0057 point 2)', () => {
    expect(opaqueBounds({ width: 4, height: 3, frames: [frame([1, 1]), frame([2, 2])] })).toEqual({ x0: 1, y0: 1, x1: 2, y1: 2 })
  })

  test('pixels under half opaque are margin', () => {
    const rgba = frame([0, 0])
    rgba[(2 * 4 + 3) * 4 + 3] = 127
    expect(opaqueBounds({ width: 4, height: 3, frames: [rgba] })).toEqual({ x0: 0, y0: 0, x1: 0, y1: 0 })
  })

  test('a blank sprite is the whole area', () => {
    expect(opaqueBounds({ width: 4, height: 3, frames: [frame()] })).toEqual({ x0: 0, y0: 0, x1: 3, y1: 2 })
  })
})
