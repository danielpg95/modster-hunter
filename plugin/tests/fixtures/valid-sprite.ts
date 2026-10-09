import { encodeFrame } from './encode-frame'

/** A fresh 8×8 `.sprite.json` with a 3-color palette and two frames, that passes validation. */
export function validSprite(): Record<string, unknown> {
  const pixels = Array.from({ length: 64 }, (_, i) => i % 3)
  return {
    schemaVersion: 1,
    width: 8,
    height: 8,
    palette: ['#00000000', '#2e7d32ff', '#a5d6a7ff'],
    shinyPalette: ['#00000000', '#6a1b9aff', '#ce93d8ff'],
    frames: [encodeFrame(pixels), encodeFrame(pixels.reverse())],
  }
}
