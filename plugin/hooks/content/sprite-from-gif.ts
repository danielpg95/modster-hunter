import { CONTENT } from '../constants'
import { decodeGif } from '../vendor/gif'
import { IssueList } from './issue-list'
import { spriteFromSheet } from './sprite-from-sheet'
import type { Sprite, Validation } from './types'

/**
 * Turns an animated GIF into a sprite (decision 0025): plays it, lays the
 * frames side by side, then splits them like a PNG sheet. A GIF bigger than
 * the largest sprite, or with too many frames, is refused before decoding.
 * Never throws.
 */
export function spriteFromGif(gif: Uint8Array, file: string): Validation<Sprite> {
  const { sprite: bounds } = CONTENT
  let decoded
  try {
    decoded = decodeGif(gif, { maxWidth: bounds.widthMax, maxHeight: bounds.heightMax, maxFrames: bounds.framesMax })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new IssueList(file).fail('', `can't be read as a sprite: ${message}`)
  }
  const { width, height, frames } = decoded
  const sheet = new Uint8Array(width * frames.length * height * 4)
  frames.forEach((frame, i) => {
    for (let y = 0; y < height; y++) {
      sheet.set(frame.subarray(y * width * 4, (y + 1) * width * 4), (y * width * frames.length + i * width) * 4)
    }
  })
  return spriteFromSheet({ width: width * frames.length, height, data: sheet }, frames.length, file)
}
