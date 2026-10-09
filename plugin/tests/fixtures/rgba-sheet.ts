import type { RgbaImage } from '../../hooks/content'

/**
 * An RGBA sheet `width × height` where `paint(x, y)` gives each pixel's
 * [r, g, b, a]; unpainted pixels are transparent.
 */
export function rgbaSheet(width: number, height: number, paint: (x: number, y: number) => number[] | undefined): RgbaImage {
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(paint(x, y) ?? [0, 0, 0, 0], (y * width + x) * 4)
  }
  return { width, height, data }
}
