import { describe, expect, test } from 'claude-code/testing'
import { MOTION } from '../../hooks/constants'
import { hitCells, motionLayout } from '../../hooks/render'

// Decision 0051 point 1: the scene keeps its size; the Modster is scaled to stand inside it.

describe('motionLayout', () => {
  test('a small Modster keeps its size, centred in the part the slid scene shows, feet on the bottom', () => {
    const layout = motionLayout({ height: 120 }, 520, { width: 60, height: 80 })
    expect(layout.slide).toBe(MOTION.slidePx)
    // Shown from 120 to 520: the middle is 320
    expect(layout.modster).toEqual({ x: 290, y: 40, width: 60, height: 80 })
  })

  test('a Modster taller than the strip shrinks to fit it', () => {
    const { modster } = motionLayout({ height: 100 }, 520, { width: 200, height: 200 })
    expect(Math.round(modster.height)).toBe(85)
    expect(Math.round(modster.width)).toBe(85)
    expect(Math.round(modster.y)).toBe(15)
  })

  test('a narrow slot keeps the Modster right of the backdrop', () => {
    expect(motionLayout({ height: 120 }, 100, { width: 60, height: 60 }).modster.x).toBe(MOTION.slidePx)
  })
})

describe('hitCells', () => {
  test('the cells over the Modster, with a margin of one', () => {
    // 290 / 8.8 = 32.9, 350 / 8.8 = 39.8; 40 / 20 = 2, 120 / 20 = 6
    expect(hitCells({ x: 290, y: 40, width: 60, height: 80 })).toEqual({ left: 31, top: 1, right: 41, bottom: 7 })
  })

  test('never left of or above the region', () => {
    expect(hitCells({ x: 0, y: 0, width: 10, height: 10 })).toMatchObject({ left: 0, top: 0 })
  })
})
