import { describe, expect, test } from 'claude-code/testing'
import type { EncounterEvent } from '../../hooks/game'
import { recordEncounterEvents, recordStat } from '../../hooks/store'
import { memoryStore } from '../fixtures/memory-store'

const where = { sessionId: 's1', biomeId: 'whispering-forest' }
const caught: EncounterEvent = { type: 'caught', modsterId: 'sproutling', tier: 'common' }
const appeared: EncounterEvent = { type: 'appeared', modsterId: 'sproutling', tier: 'common' }

describe('recordEncounterEvents', () => {
  test('a catch writes caught:<id> and counts in stats:<session>', async () => {
    const { store, data } = memoryStore()
    await recordEncounterEvents(store, where, [appeared, caught], 5_000)
    expect(data['caught:sproutling']).toMatchObject({ v: 1, count: 1, firstCaughtAt: 5_000, bestTier: 'common' })
    expect(data['stats:s1']).toMatchObject({ encounters: 1, catches: 1, flees: 0 })
  })

  test('misses store nothing; flees only count in stats', async () => {
    const { store, data } = memoryStore()
    await recordEncounterEvents(store, where, [{ type: 'missed', modsterId: 'sproutling', attemptsLeft: 2 }], 1)
    expect(data).toEqual({})
    await recordEncounterEvents(store, where, [{ type: 'fled', modsterId: 'sproutling', tier: 'common', because: 'idle' }], 1)
    expect(Object.keys(data)).toEqual(['stats:s1'])
    expect(data['stats:s1']).toMatchObject({ flees: 1 })
  })

  test('a catch another session saved in between is kept (re-read before write)', async () => {
    const { store, data, onGet } = memoryStore()
    await recordEncounterEvents(store, where, [caught], 1_000)
    // Another session catches two Sproutlings before our next read
    onGet((key, current) => {
      if (key === 'caught:sproutling') current[key] = { ...(current[key] as object), count: 3, lastCaughtAt: 1_500 }
    })
    await recordEncounterEvents(store, where, [caught], 2_000)
    expect(data['caught:sproutling']).toMatchObject({ count: 4, lastCaughtAt: 2_000 })
  })

  test('turns count in the session stats', async () => {
    const { store, data } = memoryStore()
    await recordStat(store, 's1', { kind: 'turn', at: 1 })
    await recordStat(store, 's1', { kind: 'turn', at: 2 })
    expect(data['stats:s1']).toMatchObject({ turns: 2 })
  })

  test('a stored value it cannot read is replaced by a fresh record, never thrown at the game', async () => {
    const { store, data } = memoryStore({ 'caught:sproutling': 'garbage' })
    await recordEncounterEvents(store, where, [caught], 1)
    expect(data['caught:sproutling']).toMatchObject({ count: 1 })
  })
})
