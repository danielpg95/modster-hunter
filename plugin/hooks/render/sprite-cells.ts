import type { Sprite } from '../content'
import { pixelsToCells } from './pixels-to-cells'

/**
 * Raster cells for every frame of a sprite (decision 0012): palette indexes
 * → RGBA → half-block cells. Computed once per Modster, then blitted.
 */
export function spriteCells(sprite: Sprite, palette: readonly string[] = sprite.palette): string[] {
  const colors = palette.map(rgbaOf)
  return sprite.frames.map((frame) => {
    const indexes = Uint8Array.from(atob(frame), (char) => char.charCodeAt(0))
    const rgba = new Uint8Array(indexes.length * 4)
    indexes.forEach((index, pixel) => rgba.set(colors[index] ?? [0, 0, 0, 0], pixel * 4))
    return pixelsToCells({ width: sprite.width, height: sprite.height, rgba })
  })
}

/** `#rrggbbaa` → [r, g, b, a] */
function rgbaOf(color: string): number[] {
  return [1, 3, 5, 7].map((at) => parseInt(color.slice(at, at + 2), 16))
}
