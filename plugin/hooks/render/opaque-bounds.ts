/** The opaque box of some RGBA art, inclusive, in its pixels. */
export interface OpaqueBounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** The box of pixels at least half opaque across every frame, so it holds still while the art animates; the whole area when blank. */
export function opaqueBounds(art: { width: number; height: number; frames: readonly Uint8Array[] }): OpaqueBounds {
  let x0 = art.width
  let y0 = art.height
  let x1 = -1
  let y1 = -1
  for (const rgba of art.frames) {
    for (let y = 0; y < art.height; y++) {
      for (let x = 0; x < art.width; x++) {
        if ((rgba[(y * art.width + x) * 4 + 3] ?? 0) < 128) continue
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
        y0 = Math.min(y0, y)
        y1 = Math.max(y1, y)
      }
    }
  }
  // A blank sprite: the whole area
  return x1 < 0 ? { x0: 0, y0: 0, x1: art.width - 1, y1: art.height - 1 } : { x0, y0, x1, y1 }
}
