import { pickBiome } from './pick-biome'
import type { RandomSource } from './random-source'

/**
 * Where a session starts (decision 0060 point 4): with Keep last biome on, the
 * last biome played when it's among `ids`; otherwise a random one, as 0006 says.
 * Draws a number only when picking.
 */
export function chooseBiome(keepLast: boolean, lastId: string | undefined, ids: Iterable<string>, random: RandomSource): string | undefined {
  const playable = [...ids]
  if (keepLast && lastId !== undefined && playable.includes(lastId)) return lastId
  return pickBiome(playable, random)
}
