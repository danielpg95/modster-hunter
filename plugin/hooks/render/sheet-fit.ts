import type { DesktopSheet } from '../content'

/** The room a sheet is fitted into, in CSS pixels (decision 0056). */
export interface SheetFitBox {
  /** The art's opaque box reaches at most this size */
  artWidth: number
  artHeight: number
  /** The whole frame, margins included, stays within these */
  frameWidth?: number
  frameHeight?: number
}

/**
 * CSS pixels per sheet pixel so the sheet's art (its opaque `bounds` across every frame)
 * fills `box` (0056 points 1–3): the art's height and width reach their targets, whichever
 * is reached first, and the whole frame stays within the frame caps.
 */
export function sheetFitScale(sheet: Pick<DesktopSheet, 'width' | 'height' | 'bounds'>, box: SheetFitBox): number {
  const { x0, y0, x1, y1 } = sheet.bounds
  return Math.min(
    box.artWidth / (x1 - x0 + 1),
    box.artHeight / (y1 - y0 + 1),
    (box.frameWidth ?? Infinity) / sheet.width,
    (box.frameHeight ?? Infinity) / sheet.height,
  )
}
