import { describe, expect, test } from 'claude-code/testing'
import { addToStats, readStatsTotal, sumStats, type SessionStats } from '../../hooks/store'

const session = (biomeId: string, kinds: readonly ('encounter' | 'catch' | 'flee' | 'run')[], at: number): SessionStats => {
  let stats = addToStats(undefined, { kind: 'turn', at })
  for (const kind of kinds) stats = addToStats(stats, { kind, biomeId, at })
  return stats
}

describe('stats total', () => {
  test('summing adds every counter, per biome too, and spans both time ranges', () => {
    const forest = session('forest', ['encounter', 'catch'], 10)
    const dunes = session('dunes', ['encounter', 'flee'], 50)
    expect(sumStats(sumStats(undefined, forest), dunes)).toEqual({
      v: 1,
      encounters: 2,
      catches: 1,
      flees: 1,
      runs: 0,
      turns: 2,
      startedAt: 10,
      updatedAt: 50,
      biomes: { forest: { encounters: 1, catches: 1, flees: 0, runs: 0 }, dunes: { encounters: 1, catches: 0, flees: 1, runs: 0 } },
    })
  })

  test('summing never changes what it was given', () => {
    const a = session('forest', ['encounter'], 1)
    const copy = structuredClone(a)
    sumStats(a, session('forest', ['encounter'], 2))
    expect(a).toEqual(copy)
  })

  test('a stored total reads back with its folded ids; anything else reads as none', () => {
    const total = { ...session('forest', ['catch'], 1), folded: ['s1', 7, 's2'] }
    expect(readStatsTotal(total)?.folded).toEqual(['s1', 's2'])
    expect(readStatsTotal({ ...total, folded: undefined })?.folded).toEqual([])
    for (const raw of [undefined, null, { ...total, v: 2 }]) expect(readStatsTotal(raw)).toBeUndefined()
  })
})
