import { readSessionStats, type BiomeStats, type SessionStats } from './session-stats'

/** `stats:total` (decisions 0009, 0029): the sum of folded session keys, and the ids it holds. */
export interface StatsTotal extends SessionStats {
  folded: string[]
}

export const STATS_TOTAL_KEY = 'stats:total'

/** The stored value as a current total, or undefined when there is none we can read. */
export function readStatsTotal(raw: unknown): StatsTotal | undefined {
  const stats = readSessionStats(raw)
  if (!stats) return undefined
  const folded = (raw as { folded?: unknown }).folded
  return { ...stats, folded: Array.isArray(folded) ? folded.filter((id): id is string => typeof id === 'string') : [] }
}

/** `a` plus `b`, per biome too; never changes either. */
export function sumStats(a: SessionStats | undefined, b: SessionStats): SessionStats {
  const base = a ?? { v: 1, encounters: 0, catches: 0, flees: 0, runs: 0, turns: 0, startedAt: b.startedAt, updatedAt: b.updatedAt, biomes: {} }
  const biomes: Record<string, BiomeStats> = { ...base.biomes }
  for (const [id, stats] of Object.entries(b.biomes)) biomes[id] = addCounters(biomes[id], stats)
  return {
    v: 1,
    ...addCounters(base, b),
    turns: base.turns + b.turns,
    startedAt: Math.min(base.startedAt, b.startedAt),
    updatedAt: Math.max(base.updatedAt, b.updatedAt),
    biomes,
  }
}

function addCounters(a: BiomeStats | undefined, b: BiomeStats): BiomeStats {
  return {
    encounters: (a?.encounters ?? 0) + b.encounters,
    catches: (a?.catches ?? 0) + b.catches,
    flees: (a?.flees ?? 0) + b.flees,
    runs: (a?.runs ?? 0) + b.runs,
  }
}
