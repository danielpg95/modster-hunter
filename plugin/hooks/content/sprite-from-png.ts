import { CONTENT } from '../constants'
import { decodePng, UnsupportedPngError } from '../vendor/png'
import { IssueList } from './issue-list'
import { spriteFromSheet } from './sprite-from-sheet'
import type { Sprite, Validation } from './types'

const CONVERTER_HINT = 'convert it with tools/sprite.mjs, which reads every PNG'

/**
 * Turns a user's PNG sheet into a sprite (decision 0015): decodes it, then
 * splits it like `tools/sprite.mjs` does. A sheet bigger than `frames` frames
 * at the largest sprite size is refused before decoding. Never throws.
 */
export function spriteFromPng(png: Uint8Array, frames: number, file: string): Validation<Sprite> {
  const limits = { maxWidth: CONTENT.sprite.widthMax * frames, maxHeight: CONTENT.sprite.heightMax }
  let image
  try {
    image = decodePng(png, limits)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const hint = error instanceof UnsupportedPngError ? `; ${CONVERTER_HINT}` : ''
    return new IssueList(file).fail('', `can't be read as a sprite sheet: ${message}${hint}`)
  }
  return spriteFromSheet(image, frames, file)
}
