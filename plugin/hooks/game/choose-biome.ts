import { SETTINGS } from '../constants'
import { pickBiome } from './pick-biome'
import type { RandomSource } from './random-source'

/** The biome to play, and whether a fixed choice couldn't be played (decision 0058 point 5). */
export interface BiomeChoice {
  id: string | undefined
  isFallback: boolean
}

/**
 * Decision 0058: the `biome` option is `random` (a pick as 0006 says) or a
 * biome id. A fixed id that isn't among `ids` (off, removed, invalid or
 * unknown) falls back to a random pick. Draws a number only when picking.
 */
export function chooseBiome(option: string, ids: Iterable<string>, random: RandomSource): BiomeChoice {
  const playable = [...ids]
  if (option !== SETTINGS.randomBiome && playable.includes(option)) return { id: option, isFallback: false }
  return { id: pickBiome(playable, random), isFallback: option !== SETTINGS.randomBiome }
}
