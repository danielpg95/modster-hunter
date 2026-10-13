import type { Sprite } from '../content'
import { pixelsToCells } from './pixels-to-cells'

/**
 * Raster cells for every frame of a sprite (decision 0012): palette indexes
 * → RGBA → half-block cells. Computed once per Modster, then blitted.
 */
export function spriteCells(sprite: Sprite, palette: readonly string[] = sprite.palette): string[] {
  return spriteRgba(sprite, palette).map((rgba) => pixelsToCells({ width: sprite.width, height: sprite.height, rgba }))
}

/** RGBA bytes for every frame of a sprite, row-major, 4 per pixel. */
export function spriteRgba(sprite: Sprite, palette: readonly string[] = sprite.palette): Uint8Array[] {
  const colors = palette.map(rgbaOf)
  return sprite.frames.map((frame) => {
    const indexes = Uint8Array.from(atob(frame), (char) => char.charCodeAt(0))
    const rgba = new Uint8Array(indexes.length * 4)
    indexes.forEach((index, pixel) => rgba.set(colors[index] ?? [0, 0, 0, 0], pixel * 4))
    return rgba
  })
}

/** `#rrggbbaa` or `#rrggbb` → [r, g, b, a] */
export function rgbaOf(color: string): number[] {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16))
  const a = color.length > 7 ? parseInt(color.slice(7, 9), 16) : 255
  return [r ?? 0, g ?? 0, b ?? 0, a]
}
