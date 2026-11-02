import { describe, expect, test } from 'claude-code/testing'
import { DESKTOP } from '../../hooks/constants'
import type { DesktopSheet } from '../../hooks/content'
import { sheetFitScale } from '../../hooks/render'

const sheet = (width: number, height: number, bounds: DesktopSheet['bounds']) => ({ width, height, bounds })
const pane = { artWidth: DESKTOP.paneFitPx * DESKTOP.fitWidthShare, artHeight: DESKTOP.paneFitPx }

describe('sheetFitScale', () => {
  test('a small sheet grows until its art reaches the target height (decision 0056 point 2)', () => {
    // Glowcap: an 80×80 frame with 69 rows of art
    const scale = sheetFitScale(sheet(80, 80, { x0: 4, y0: 11, x1: 76, y1: 79 }), pane)
    expect(scale * 69).toBe(DESKTOP.paneFitPx)
    expect(scale).toBeGreaterThan(1)
  })

  test('a tall sheet shrinks to the same art height', () => {
    // Sproutling: 124 rows of art
    const scale = sheetFitScale(sheet(100, 124, { x0: 0, y0: 1, x1: 98, y1: 123 }), pane)
    expect(Math.round(scale * 123)).toBe(DESKTOP.paneFitPx)
    expect(scale).toBeLessThan(1)
  })

  test('a wide sheet stops at the width cap (point 3)', () => {
    const scale = sheetFitScale(sheet(128, 40, { x0: 0, y0: 0, x1: 127, y1: 39 }), pane)
    expect(Math.round(scale * 128)).toBe(DESKTOP.paneFitPx * DESKTOP.fitWidthShare)
    expect(scale * 40).toBeLessThan(DESKTOP.paneFitPx)
  })

  test('the frame cap wins over the art target, margins included', () => {
    const scale = sheetFitScale(sheet(80, 100, { x0: 0, y0: 50, x1: 79, y1: 99 }), { ...pane, frameHeight: 120 })
    expect(scale * 100).toBe(120)
  })

  test('a square box fits the art of a card whichever side is longer (point 4)', () => {
    const box = { artWidth: 72, artHeight: 72 }
    expect(Math.round(sheetFitScale(sheet(118, 94, { x0: 0, y0: 13, x1: 116, y1: 93 }), box) * 117)).toBe(72)
    expect(Math.round(sheetFitScale(sheet(89, 128, { x0: 4, y0: 7, x1: 84, y1: 127 }), box) * 121)).toBe(72)
  })
})
