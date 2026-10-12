import type { RgbaImage, Sprite } from '../../../../hooks/content'

// One strip per background, so colors that vanish on either one show up
const BACKGROUNDS = [
  [0x1e, 0x1e, 0x1e, 0xff],
  [0xf5, 0xf5, 0xf5, 0xff],
] as const

/**
 * Draws every frame of a sprite enlarged `scale` times, side by side, once on
 * a dark strip and once on a light one, with a gap of one sprite pixel
 * around each frame (decision 0025). Transparent pixels show the background.
 */
export function previewImage(sprite: Sprite, scale: number): RgbaImage {
  const colors = sprite.palette.map((color) => {
    const channel = (i: number) => Number.parseInt(color.slice(1 + i * 2, 3 + i * 2), 16)
    return [channel(0), channel(1), channel(2), channel(3)] as const
  })
  const frames = sprite.frames.map((frame) => Uint8Array.from(atob(frame), (char) => char.charCodeAt(0)))
  const cellWidth = (sprite.width + 1) * scale
  const cellHeight = (sprite.height + 1) * scale
  const width = frames.length * cellWidth + scale
  const height = BACKGROUNDS.length * cellHeight + scale
  const data = new Uint8Array(width * height * 4)

  BACKGROUNDS.forEach((background, strip) => {
    const top = strip * cellHeight
    for (let y = top; y < top + cellHeight + (strip === BACKGROUNDS.length - 1 ? scale : 0); y++) {
      for (let x = 0; x < width; x++) data.set(background, (y * width + x) * 4)
    }
    frames.forEach((indexes, f) => {
      for (let py = 0; py < sprite.height; py++) {
        for (let px = 0; px < sprite.width; px++) {
          const color = colors[indexes[py * sprite.width + px]!]!
          if (color[3] === 0) continue
          for (let dy = 0; dy < scale; dy++) {
            const y = top + scale + py * scale + dy
            for (let dx = 0; dx < scale; dx++) data.set(color, (y * width + f * cellWidth + scale + px * scale + dx) * 4)
          }
        }
      }
    })
  })
  return { width, height, data }
}
