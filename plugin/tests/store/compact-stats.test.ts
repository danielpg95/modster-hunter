import { describe, expect, test } from 'claude-code/testing'
import { STATS } from '../../hooks/constants'
import { addToStats, compactStats, type SessionStats } from '../../hooks/store'
import { memoryStore } from '../fixtures/memory-store'

const DAY = STATS.compactAfterMs
const NOW = 10 * DAY

/** A session that saw one forest Modster and caught it, last written at `at`. */
const caughtOne = (at: number): SessionStats =>
  addToStats(addToStats(addToStats(undefined, { kind: 'turn', at }), { kind: 'encounter', biomeId: 'forest', at }), { kind: 'catch', biomeId: 'forest', at })

describe('compact stats', () => {
  test('nothing stored shows nothing and writes nothing', async () => {
    const { store, data } = memoryStore()
    expect(await compactStats(store, { sessionId: 'me', now: NOW })).toBeUndefined()
    expect(data).toEqual({})
  })

  test('shows every session summed, other stored keys left out', async () => {
    const { store } = memoryStore({ 'stats:me': caughtOne(NOW), 'stats:other': caughtOne(NOW - 1000), 'caught:sproutling': { v: 1 } })
    expect(await compactStats(store, { sessionId: 'me', now: NOW })).toMatchObject({ encounters: 2, catches: 2, turns: 2, biomes: { forest: { catches: 2 } } })
  })

  test('a session idle 24 hours folds into stats:total and its key is deleted (0029)', async () => {
    const { store, data } = memoryStore({ 'stats:old': caughtOne(NOW - DAY), 'stats:recent': caughtOne(NOW - DAY + 1) })
    const shown = await compactStats(store, { sessionId: 'me', now: NOW })
    expect(Object.keys(data).sort()).toEqual(['stats:recent', 'stats:total'])
    expect(data['stats:total']).toMatchObject({ encounters: 1, catches: 1, folded: [] })
    expect(shown).toMatchObject({ encounters: 2, catches: 2 })
  })

  test('this session is never folded, however long it sat idle', async () => {
    const { store, data } = memoryStore({ 'stats:me': caughtOne(0) })
    await compactStats(store, { sessionId: 'me', now: NOW })
    expect(Object.keys(data)).toEqual(['stats:me'])
  })

  test('the totals stay the same across runs', async () => {
    const { store } = memoryStore({ 'stats:a': caughtOne(0), 'stats:b': caughtOne(DAY), 'stats:me': caughtOne(NOW) })
    const first = await compactStats(store, { sessionId: 'me', now: NOW })
    expect(first).toMatchObject({ encounters: 3, catches: 3, turns: 3 })
    expect(await compactStats(store, { sessionId: 'me', now: NOW + DAY })).toEqual(first)
  })

  test('a key a crash left behind, already in the total, is deleted, not counted again', async () => {
    const total = { ...caughtOne(0), folded: ['a'] }
    const { store, data } = memoryStore({ 'stats:total': total, 'stats:a': caughtOne(0) })
    expect(await compactStats(store, { sessionId: 'me', now: NOW })).toMatchObject({ encounters: 1, catches: 1 })
    expect(data).toEqual({ 'stats:total': { ...caughtOne(0), folded: [] } })
  })

  test('a key that does not read as stats is left alone and not counted', async () => {
    const { store, data } = memoryStore({ 'stats:odd': { v: 9, encounters: 50 }, 'stats:me': caughtOne(NOW) })
    expect(await compactStats(store, { sessionId: 'me', now: NOW })).toMatchObject({ encounters: 1 })
    expect(data['stats:odd']).toEqual({ v: 9, encounters: 50 })
  })

  test('an id another session folds meanwhile stays listed until its key is gone', async () => {
    const { store, data, onGet } = memoryStore({ 'stats:old': caughtOne(0), 'stats:total': { ...caughtOne(0), folded: [] } })
    let reads = 0
    onGet((key, all) => {
      // Another pane folds `x` right before this run's second read of the total
      if (key === 'stats:total' && ++reads === 2) all['stats:total'] = { ...(all['stats:total'] as object), folded: ['x'] }
    })
    await compactStats(store, { sessionId: 'me', now: NOW })
    expect(data['stats:total']).toMatchObject({ folded: ['x'] })
  })
})
