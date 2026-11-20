/** `prefs:lastBiome` (decision 0060 point 3): the biome the game last played, for Keep last biome. */
export interface LastBiomePref {
  v: 1
  id: string
}

export const LAST_BIOME_KEY = 'prefs:lastBiome'

export const lastBiomePref = (id: string): LastBiomePref => ({ v: 1, id })

/** The last biome's id, or undefined when none is stored or the value is unreadable. */
export function readLastBiomeId(raw: unknown): string | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const value = raw as Partial<LastBiomePref>
  return value.v === 1 && typeof value.id === 'string' ? value.id : undefined
}
