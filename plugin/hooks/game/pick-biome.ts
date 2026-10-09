import type { RandomSource } from './random-source'

/**
 * Decision 0006: one enabled biome, uniformly at random. Ids are sorted first
 * so the same random number always picks the same biome, whatever order the
 * disk listed them in. Undefined when there are none.
 */
export function pickBiome(ids: Iterable<string>, random: RandomSource): string | undefined {
  const sorted = [...ids].sort()
  if (sorted.length === 0) return undefined
  // Clamp: a source returning exactly 1 (out of contract) still picks the last biome
  const index = Math.min(Math.floor(random() * sorted.length), sorted.length - 1)
  return sorted[Math.max(index, 0)]
}
