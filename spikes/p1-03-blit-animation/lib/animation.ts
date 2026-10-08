export const FPS_STEPS = [6, 8, 12] as const

/** Index of the frame after `index`, wrapping at `count`. */
export function nextFrameIndex(index: number, count: number): number {
  return count <= 0 ? 0 : (index + 1) % count
}

/** Milliseconds between frames at `fps`, at least 1. */
export function periodMs(fps: number): number {
  return Math.max(1, Math.round(1000 / fps))
}
