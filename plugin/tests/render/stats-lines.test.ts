import { describe, expect, test } from 'claude-code/testing'
import { NO_STATS_TEXT, ratio, statsLines, type StatsBiome } from '../../hooks/render'
import type { SessionStats } from '../../hooks/store'

// P3-04: the totals, then a row per biome hunted in, most encounters first.

const text = (line: ReturnType<typeof statsLines>[number]) => line.map((segment) => ('text' in segment ? segment.text : '')).join('')

const counts = (encounters: number, catches: number, flees: number, runs: number) => ({ encounters, catches, flees, runs })
const stats = (biomes: SessionStats['biomes'], turns = 9): SessionStats => {
  const all = Object.values(biomes)
  const sum = (field: keyof (typeof all)[number]) => all.reduce((total, biome) => total + biome[field], 0)
  return { v: 1, encounters: sum('encounters'), catches: sum('catches'), flees: sum('flees'), runs: sum('runs'), turns, startedAt: 0, updatedAt: 0, biomes }
}
const LOADED = new Map<string, StatsBiome>([
  ['whispering-forest', { name: 'Whispering Forest', accentColor: '#4caf50' }],
  ['ash-dunes', { name: 'Ash Dunes' }],
])

describe('statsLines', () => {
  test('nothing stored, or no turn yet, says there are no hunts', () => {
    expect(statsLines(undefined, LOADED).map(text)).toEqual([NO_STATS_TEXT])
    expect(statsLines(stats({}, 0), LOADED).map(text)).toEqual([NO_STATS_TEXT])
  })

  test('the totals read encounters, catches, flees, runs, catch ratio and turns', () => {
    const lines = statsLines(stats({ 'whispering-forest': counts(4, 2, 1, 1) }, 12), LOADED).map(text)
    expect(lines.slice(0, 2)).toEqual(['Encounters 4  Caught 2  Fled 1  Ran 1', 'Catch ratio 50%  Turns 12'])
  })

  test('turns without an encounter show the totals but no biome table', () => {
    expect(statsLines(stats({}, 3), LOADED).map(text)).toEqual(['Encounters 0  Caught 0  Fled 0  Ran 0', 'Catch ratio —  Turns 3'])
  })

  test('biomes list by encounters, most first, with their own ratio', () => {
    const lines = statsLines(stats({ 'whispering-forest': counts(2, 1, 1, 0), 'ash-dunes': counts(6, 2, 3, 1) }), LOADED).map(text)
    expect(lines.slice(2)).toEqual([
      '',
      'Biome               Seen Caught   Fled    Ran  Ratio',
      'Ash Dunes              6      2      3      1    33%',
      'Whispering Forest      2      1      1      0    50%',
    ])
  })

  test('a biome name takes its accent color; one no longer loaded shows its id, dim', () => {
    const lines = statsLines(stats({ 'whispering-forest': counts(2, 1, 0, 0), 'gone-biome': counts(1, 0, 1, 0) }), LOADED)
    expect(lines[4]?.[0]).toMatchObject({ text: 'Whispering Forest', color: '#4caf50' })
    expect(lines[5]?.[0]).toMatchObject({ text: 'gone-biome'.padEnd(17), dim: true })
  })

  test('the ratio rounds to a whole percent, and is a dash before any encounter', () => {
    expect([ratio(counts(3, 1, 0, 0)), ratio(counts(3, 2, 0, 0)), ratio(counts(0, 0, 0, 0))]).toEqual(['33%', '67%', '—'])
  })
})
