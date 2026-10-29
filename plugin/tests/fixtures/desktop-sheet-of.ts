import type { DesktopSheet } from '../../hooks/content'

/**
 * A loaded desktop sheet (decision 0045) for render tests: `frames` frames of
 * `width × height`, whole-frame bounds, one main colour, and a stand-in PNG of
 * `bytes` bytes (render code embeds it as-is and never decodes it).
 */
export function desktopSheetOf(width: number, height: number, frames: number, extra: Partial<DesktopSheet> = {}, bytes = 3): DesktopSheet {
  return {
    png: 'A'.repeat(Math.ceil(bytes / 3) * 4),
    width,
    height,
    frames,
    colors: ['#ffd54f', '#3b6b2a'],
    bounds: { x0: 0, y0: 0, x1: width - 1, y1: height - 1 },
    mainColor: '#3b6b2a',
    ...extra,
  }
}
