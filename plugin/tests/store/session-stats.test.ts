import { describe, expect, test } from 'claude-code/testing'
import { addToStats, readSessionStats, type StatsEvent } from '../../hooks/store'

const forest = (kind: 'encounter' | 'catch' | 'flee' | 'run', at = 1): StatsEvent => ({ kind, biomeId: 'whispering-forest', at })

describe('session stats', () => {
  test('events count in the totals and per biome; runs apart from flees (0020)', () => {
    let stats = addToStats(undefined, { kind: 'turn', at: 1 })
    for (const kind of ['encounter', 'catch', 'encounter', 'flee', 'encounter', 'run'] as const) stats = addToStats(stats, forest(kind))
    expect(stats).toEqual({
      v: 1,
      encounters: 3,
      catches: 1,
      flees: 1,
      runs: 1,
      turns: 1,
      startedAt: 1,
      updatedAt: 1,
      biomes: { 'whispering-forest': { encounters: 3, catches: 1, flees: 1, runs: 1 } },
    })
  })

  test('a value stored before runs existed reads with runs at 0', () => {
    const old = { v: 1, encounters: 2, catches: 1, flees: 1, turns: 1, startedAt: 1, updatedAt: 1, biomes: { forest: { encounters: 2, catches: 1, flees: 1 } } }
    expect(readSessionStats(old)).toMatchObject({ runs: 0, biomes: { forest: { runs: 0 } } })
  })

  test('startedAt stays, updatedAt follows the latest event', () => {
    const stats = addToStats(addToStats(undefined, forest('encounter', 10)), forest('catch', 50))
    expect([stats.startedAt, stats.updatedAt]).toEqual([10, 50])
  })

  test('reading a stored v1 value gives it back; anything else reads as none', () => {
    const stats = addToStats(undefined, forest('catch'))
    expect(readSessionStats(structuredClone(stats))).toEqual(stats)
    for (const raw of [undefined, null, 7, { ...stats, v: 2 }]) expect(readSessionStats(raw)).toBeUndefined()
  })

  test('adding never changes the stats it was given', () => {
    const stats = addToStats(undefined, forest('catch'))
    const copy = structuredClone(stats)
    addToStats(stats, forest('catch'))
    expect(stats).toEqual(copy)
  })
})
