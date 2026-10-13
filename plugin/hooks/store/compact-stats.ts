import { STATS } from '../constants'
import { readSessionStats, statsKey, type SessionStats } from './session-stats'
import { readStatsTotal, STATS_TOTAL_KEY, sumStats, type StatsTotal } from './stats-total'
import type { StorePort } from './store-port'

/** A StorePort that can also list and remove keys: the Stats tab needs both (0029). */
export interface StatsStorePort extends StorePort {
  keys(): Promise<string[]>
  delete(key: string): Promise<void>
}

const PREFIX = statsKey('')

/**
 * Folds session keys idle for `STATS.compactAfterMs` into `stats:total`, then
 * returns every count stored, this session's included (decision 0029). The total
 * is written before the folded keys are deleted, and lists their ids, so a crash
 * in between never counts a session twice; a later run deletes what's left.
 */
export async function compactStats(store: StatsStorePort, where: { sessionId: string; now: number }): Promise<SessionStats | undefined> {
  const keys = (await store.keys()).filter((key) => key.startsWith(PREFIX) && key !== STATS_TOTAL_KEY)
  const sessions = await Promise.all(keys.map(async (key) => ({ key, id: key.slice(PREFIX.length), stats: readSessionStats(await store.get(key)) })))

  let total = readStatsTotal(await store.get(STATS_TOTAL_KEY))
  const done = new Set(total?.folded ?? [])
  const fold = sessions.filter(
    ({ id, stats }) => stats && !done.has(id) && id !== where.sessionId && where.now - stats.updatedAt >= STATS.compactAfterMs,
  )
  if (fold.length > 0) {
    let sum: SessionStats | undefined = total
    for (const { stats } of fold) if (stats) sum = sumStats(sum, stats)
    if (sum) total = { ...sum, folded: [...done, ...fold.map(({ id }) => id)] }
    await store.set(STATS_TOTAL_KEY, total)
  }

  // Delete every folded key, this run's and any a crash left; then, from a fresh
  // read, forget the ids this run settled, keeping any another session just added
  const folded = new Set(total?.folded ?? [])
  const settled = new Set([...done].filter((id) => !sessions.some((session) => session.id === id)))
  for (const { key, id } of sessions) {
    if (!folded.has(id)) continue
    await store.delete(key)
    settled.add(id)
  }
  const fresh = settled.size > 0 ? readStatsTotal(await store.get(STATS_TOTAL_KEY)) : undefined
  if (fresh) await store.set(STATS_TOTAL_KEY, { ...fresh, folded: fresh.folded.filter((id) => !settled.has(id)) })

  let shown: SessionStats | undefined = total ? withoutFolded(total) : undefined
  for (const { id, stats } of sessions) if (stats && !folded.has(id)) shown = sumStats(shown, stats)
  return shown
}

function withoutFolded({ folded: _folded, ...stats }: StatsTotal): SessionStats {
  return stats
}
