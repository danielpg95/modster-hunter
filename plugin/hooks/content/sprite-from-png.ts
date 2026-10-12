import { CONTENT } from '../constants'
import { decodePng } from '../vendor/png'
import { IssueList } from './issue-list'
import { spriteFromSheet } from './sprite-from-sheet'
import type { Sprite, Validation } from './types'

/**
 * Turns a user's PNG sheet into a sprite (decisions 0016 and 0025): decodes
 * it, then splits it like `tools/sprite.mjs` does. A sheet bigger than
 * `frames` frames at the largest sprite size is refused before decoding.
 * Never throws.
 */
export function spriteFromPng(png: Uint8Array, frames: number, file: string): Validation<Sprite> {
  const limits = { maxWidth: CONTENT.sprite.widthMax * frames, maxHeight: CONTENT.sprite.heightMax }
  let image
  try {
    image = decodePng(png, limits)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new IssueList(file).fail('', `can't be read as a sprite sheet: ${message}`)
  }
  return spriteFromSheet(image, frames, file)
}
