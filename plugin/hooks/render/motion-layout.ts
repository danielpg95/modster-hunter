import { DESKTOP, MOTION } from '../constants'

// Where things stand in the desktop encounter's scene once it has slid (decision 0051), in CSS
// pixels, and the cells of the Client laid over it that the Modster covers.

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface MotionLayout {
  slide: number
  /** The Modster, where the slid scene shows it */
  modster: Rect
}

/**
 * The Modster scaled to stand inside the strip, feet on its bottom (0051 point 1), centred in
 * the part the slot shows once the scene has slid. `shownPx` is the slot's width, an estimate.
 */
export function motionLayout(scene: { height: number }, shownPx: number, actor: { width: number; height: number }): MotionLayout {
  const slide = MOTION.slidePx
  const fit = Math.min(1, (scene.height * MOTION.modsterFill) / Math.max(1, actor.height))
  const width = actor.width * fit
  const height = actor.height * fit
  const center = slide + Math.max(0, shownPx - slide) / 2
  return { slide, modster: { x: Math.max(slide, center - width / 2), y: scene.height - height, width, height } }
}

export interface CellRect {
  left: number
  top: number
  right: number
  bottom: number
}

/** The cells over `rect`, with a margin, for a click on the Modster (0051 point 3); right and bottom exclusive. */
export function hitCells(rect: Rect): CellRect {
  const m = MOTION.hitMarginCells
  return {
    left: Math.max(0, Math.floor(rect.x / MOTION.columnPx) - m),
    top: Math.max(0, Math.floor(rect.y / DESKTOP.rowPx) - m),
    right: Math.ceil((rect.x + rect.width) / MOTION.columnPx) + m,
    bottom: Math.ceil((rect.y + rect.height) / DESKTOP.rowPx) + m,
  }
}
