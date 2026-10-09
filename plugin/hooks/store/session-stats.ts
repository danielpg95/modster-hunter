/** Counters for one biome within a session. */
export interface BiomeStats {
  encounters: number
  catches: number
  flees: number
}

/** `stats:<sessionId>` (decision 0009): this session's counters, aggregated by the Stats tab (P3-04). */
export interface SessionStats extends BiomeStats {
  v: 1
  turns: number
  startedAt: number
  updatedAt: number
  biomes: Record<string, BiomeStats>
}

export type StatsEvent =
  | { kind: 'turn'; at: number }
  | { kind: 'encounter' | 'catch' | 'flee'; biomeId: string; at: number }

export const statsKey = (sessionId: string): string => `stats:${sessionId}`

const COUNTER: Record<'encounter' | 'catch' | 'flee', keyof BiomeStats> = {
  encounter: 'encounters',
  catch: 'catches',
  flee: 'flees',
}

/** The stored value as current stats, or undefined when there is none we can read. */
export function readSessionStats(raw: unknown): SessionStats | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const value = raw as Partial<SessionStats>
  if (value.v !== 1) return undefined
  const biomes: Record<string, BiomeStats> = {}
  if (typeof value.biomes === 'object' && value.biomes !== null) {
    for (const [id, stats] of Object.entries(value.biomes)) biomes[id] = counters(stats)
  }
  return {
    v: 1,
    ...counters(value),
    turns: whole(value.turns),
    startedAt: whole(value.startedAt),
    updatedAt: whole(value.updatedAt),
    biomes,
  }
}

/** The stats after one event; never changes `stats`. */
export function addToStats(stats: SessionStats | undefined, event: StatsEvent): SessionStats {
  const base: SessionStats = stats ?? { v: 1, encounters: 0, catches: 0, flees: 0, turns: 0, startedAt: event.at, updatedAt: event.at, biomes: {} }
  const next: SessionStats = { ...base, updatedAt: Math.max(base.updatedAt, event.at), biomes: { ...base.biomes } }
  if (event.kind === 'turn') return { ...next, turns: next.turns + 1 }
  const field = COUNTER[event.kind]
  const biome = next.biomes[event.biomeId] ?? { encounters: 0, catches: 0, flees: 0 }
  next.biomes[event.biomeId] = { ...biome, [field]: biome[field] + 1 }
  return { ...next, [field]: next[field] + 1 }
}

function counters(raw: unknown): BiomeStats {
  const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<BiomeStats>
  return { encounters: whole(value.encounters), catches: whole(value.catches), flees: whole(value.flees) }
}

function whole(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}
