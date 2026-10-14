import { describe, expect, test } from 'claude-code/testing'
import { biomeRow, oddsRow, tierRow, type BiomeEntry, type BiomeOdds } from '../../hooks/render'

// P3-03: a biome row shows caught of total and marks the session's biome; an
// odds row reads `???` until caught, but its % always shows, under its tier's
// header and share (decision 0030 point 7).

const text = (line: ReturnType<typeof oddsRow>) => line.map((segment) => ('text' in segment ? segment.text : '')).join('')

const sproutling: BiomeOdds = {
  id: 'sproutling',
  name: 'Sproutling',
  tierChance: 60 / 79,
  tier: 'common',
  maxAttempts: 3,
  catchRate: 0.5,
  encounterChance: 60 / 79,
  catchChance: 0.875,
  number: 1,
  types: ['grass'],
  record: { v: 1, count: 4, shinyCount: 0, firstCaughtAt: 0, lastCaughtAt: 0, bestTier: 'common', biomes: { 'whispering-forest': 3, 'ash-dunes': 1 } },
}
const forest: BiomeEntry = { id: 'whispering-forest', name: 'Whispering Forest', accentColor: '#4caf50', isCurrent: true, caught: 1, odds: [sproutling] }

describe('biomeRows', () => {
  test('the session biome reads here, in its accent color, with caught of total', () => {
    const row = biomeRow(forest, true)
    expect(text(row)).toBe('▸ Whispering Forest 1/1 here')
    expect(row[1]).toMatchObject({ color: '#4caf50', bold: true })
    expect(text(biomeRow({ ...forest, isCurrent: false, caught: 0 }, false))).toBe('  Whispering Forest 0/1')
  })

  test('a long biome name is cut to fit the list', () => {
    expect(text(biomeRow({ ...forest, name: 'The Very Long Biome Name' }, false))).toBe('  The Very Long Bi… 1/1 here')
  })

  test('a caught row has the name in its type color, its %, and its catches in this biome', () => {
    const row = oddsRow(sproutling, 'whispering-forest')
    expect(text(row)).toBe('#001 Sproutling      75.9%  ×3')
    expect(row[1]).toMatchObject({ color: '#4caf50' })
  })

  test('caught only elsewhere: the name shows, with no count', () => {
    expect(text(oddsRow(sproutling, 'tide-pools'))).toBe('#001 Sproutling      75.9%')
  })

  test('an uncaught row reads ??? but keeps its %', () => {
    const { record, ...uncaught } = sproutling
    expect(text(oddsRow({ ...uncaught, tier: 'legendary', encounterChance: 0.025, number: 7 }, 'whispering-forest'))).toBe(
      '#007 ???              2.5%',
    )
  })

  test("a tier header shows the tier's share, lined up with its Modsters' own", () => {
    const header = text(tierRow({ tier: 'common', tierChance: 0.764, odds: [sproutling] }))
    expect(header).toBe('common               76.4%')
    expect(header.length).toBe(text(oddsRow(sproutling, 'tide-pools')).length)
    expect(text(tierRow({ tier: 'legendary', tierChance: 1, odds: [] }))).toBe('legendary           100.0%')
  })
})
