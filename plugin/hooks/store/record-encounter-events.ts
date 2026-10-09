import type { EncounterEvent } from '../game'
import { addCatch, caughtKey, readCaughtRecord } from './caught-record'
import { addToStats, readSessionStats, statsKey, type StatsEvent } from './session-stats'
import type { StorePort } from './store-port'

/**
 * Stores what an encounter step reported (decision 0009): a catch updates
 * `caught:<id>`, and every appearance, catch and flee counts in this session's
 * `stats:<sessionId>`. Each key is read again right before it's written, so a
 * catch saved by another session in the meantime isn't lost.
 */
export async function recordEncounterEvents(
  store: StorePort,
  where: { sessionId: string; biomeId: string },
  events: readonly EncounterEvent[],
  at: number,
): Promise<void> {
  for (const event of events) {
    if (event.type === 'caught') {
      const key = caughtKey(event.modsterId)
      const fresh = readCaughtRecord(await store.get(key))
      // Shinies arrive with P5-01
      await store.set(key, addCatch(fresh, { tier: event.tier, biomeId: where.biomeId, at, shiny: false }))
    }
    const stat = statsEventFor(event, where.biomeId, at)
    if (stat) await recordStat(store, where.sessionId, stat)
  }
}

/** Counts one stats event in this session's key, re-reading it first. */
export async function recordStat(store: StorePort, sessionId: string, event: StatsEvent): Promise<void> {
  const key = statsKey(sessionId)
  const fresh = readSessionStats(await store.get(key))
  await store.set(key, addToStats(fresh, event))
}

function statsEventFor(event: EncounterEvent, biomeId: string, at: number): StatsEvent | undefined {
  switch (event.type) {
    case 'appeared':
      return { kind: 'encounter', biomeId, at }
    case 'caught':
      return { kind: 'catch', biomeId, at }
    case 'fled':
      return { kind: 'flee', biomeId, at }
    case 'missed':
      return undefined
  }
}
