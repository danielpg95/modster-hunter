import { encodePng } from './encode-png'

/** An RGBA pixel, or undefined for fully clear */
export type Paint = (x: number, y: number) => [number, number, number, number] | undefined

/**
 * A desktop art sheet (decision 0045): `frames` frames of `width × height`
 * side by side, as an 8-bit RGBA PNG with stored (uncompressed) blocks, so its
 * size is predictable. By default each frame is clear with one red pixel.
 */
export function desktopPng(width: number, height: number, frames: number, paint?: Paint): Uint8Array {
  const sheetWidth = width * frames
  const draw: Paint = paint ?? ((x, y) => (x % width === 0 && y === 0 ? [255, 0, 0, 255] : undefined))
  const samples: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < sheetWidth; x++) samples.push(...(draw(x, y) ?? [0, 0, 0, 0]))
  }
  return encodePng({ width: sheetWidth, height, colorType: 6, bitDepth: 8, samples })
}
