export interface Frame {
  width: number
  height: number
  /** RGBA bytes, row-major, 4 per pixel */
  rgba: ArrayLike<number>
}

export const DEFAULT_COLOR = 0x01000000
const ALPHA_CUTOFF = 128
const UPPER_HALF = '▀'.codePointAt(0)!
const LOWER_HALF = '▄'.codePointAt(0)!
const SPACE = ' '.codePointAt(0)!

// Colour of the pixel at (x, y), or DEFAULT_COLOR when transparent or off the frame
function pixelColor(frame: Frame, x: number, y: number): number {
  if (y >= frame.height) return DEFAULT_COLOR
  const i = (y * frame.width + x) * 4
  const [r = 0, g = 0, b = 0, a = 0] = [frame.rgba[i], frame.rgba[i + 1], frame.rgba[i + 2], frame.rgba[i + 3]]
  if (a < ALPHA_CUTOFF) return DEFAULT_COLOR
  return (r << 16) | (g << 8) | b
}

/** Packs a frame into the base64 `cells` string of a Raster: width × ceil(height / 2) cells. */
export function pixelsToCells(frame: Frame): string {
  const rows = Math.ceil(frame.height / 2)
  const numbers = new Uint32Array(frame.width * rows * 3)
  let n = 0
  for (let row = 0; row < rows; row++) {
    for (let x = 0; x < frame.width; x++) {
      const top = pixelColor(frame, x, row * 2)
      const bottom = pixelColor(frame, x, row * 2 + 1)
      // A transparent half must be the cell's background: a default foreground would paint text colour
      if (top === DEFAULT_COLOR && bottom !== DEFAULT_COLOR) {
        numbers.set([LOWER_HALF, bottom, DEFAULT_COLOR], n)
      } else if (top === DEFAULT_COLOR) {
        numbers.set([SPACE, DEFAULT_COLOR, DEFAULT_COLOR], n)
      } else {
        numbers.set([UPPER_HALF, top, bottom], n)
      }
      n += 3
    }
  }
  // toBase64 is what the docs use for Raster cells; the lib typings may not know it yet
  return (new Uint8Array(numbers.buffer) as Uint8Array & { toBase64(): string }).toBase64()
}
