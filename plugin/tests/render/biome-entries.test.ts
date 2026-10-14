import { describe, expect, test } from 'claude-code/testing'
import { validateBiome, type Biome, type LoadedBiome, type LoadedModster, type Sprite } from '../../hooks/content'
import { formatOddsTable, oddsTable } from '../../hooks/game'
import { biomeEntries, tierSections } from '../../hooks/render'
import type { CaughtRecord } from '../../hooks/store'
import { modsterNamed } from '../fixtures/modster-named'
import { validBiome } from '../fixtures/valid-biome'
import { validSprite } from '../fixtures/valid-sprite'

// P3-03: every biome by name, the session's marked, its odds straight from the P2-05 resolver.

function exampleBiome(): Biome {
  const result = validateBiome(validBiome(), { file: 'biome.json', folder: 'whispering-forest' })
  if (!result.ok) throw new Error('fixture biome must be valid')
  return result.value
}

const sprite = validSprite() as unknown as Sprite
const loaded = (id: string, name: string, number?: number): LoadedModster => ({
  modster: modsterNamed(id, { name, ...(number === undefined ? {} : { dex: { number, types: ['grass'] } }) }),
  sprite,
})
const modsters = new Map<string, LoadedModster>([
  ['sproutling', loaded('sproutling', 'Sproutling', 1)],
  ['mossbeast', loaded('mossbeast', 'Mossbeast', 2)],
  ['pinewraith', loaded('pinewraith', 'Pinewraith')],
])
const forest: LoadedBiome = { biome: exampleBiome(), file: 'biome.json' }
const dunes: LoadedBiome = {
  biome: { schemaVersion: 1, id: 'ash-dunes', name: 'Ash Dunes', encounterEverySec: [8, 20], modsters: [{ id: 'mossbeast' }] } as Biome,
  file: 'biome.json',
}
const record: CaughtRecord = { v: 1, count: 2, shinyCount: 0, firstCaughtAt: 0, lastCaughtAt: 0, bestTier: 'common', biomes: { 'ash-dunes': 2 } }

describe('biomeEntries', () => {
  test('biomes list by name, with the session biome marked', () => {
    const entries = biomeEntries([forest, dunes], modsters, new Map(), 'whispering-forest')
    expect(entries.map((entry) => [entry.name, entry.isCurrent])).toEqual([
      ['Ash Dunes', false],
      ['Whispering Forest', true],
    ])
    expect(entries[1]?.accentColor).toBe('#4caf50')
  })

  test('the percentages are the P2-05 resolver\'s, in the biome order', () => {
    const [, entry] = biomeEntries([forest, dunes], modsters, new Map(), undefined)
    const plain = new Map([...modsters].map(([id, { modster }]) => [id, modster]))
    const expected = oddsTable(forest.biome, plain)
    expect(entry?.odds.map(({ number, types, record, ...row }) => row)).toEqual(expected)
    // And they read the same as the contributors' table
    const table = formatOddsTable(expected)
    for (const row of entry?.odds ?? []) expect(table).toContain(`${(row.encounterChance * 100).toFixed(1)}%`)
  })

  test('caught counts Modsters caught in any biome, with their records and dex numbers', () => {
    const records = new Map([['mossbeast', record]])
    const [dunesEntry, forestEntry] = biomeEntries([forest, dunes], modsters, records, undefined)
    expect(dunesEntry?.caught).toBe(1)
    expect(forestEntry?.caught).toBe(1)
    expect(forestEntry?.odds.map((row) => [row.id, row.number, row.record?.count])).toEqual([
      ['sproutling', 1, undefined],
      ['mossbeast', 2, 2],
      ['pinewraith', undefined, undefined],
    ])
  })

  test('an entry whose Modster did not load is left out, and its share with it', () => {
    const [entry] = biomeEntries([forest], new Map([['sproutling', loaded('sproutling', 'Sproutling', 1)]]), new Map(), undefined)
    expect(entry?.odds.map((row) => [row.id, row.encounterChance])).toEqual([['sproutling', 1]])
  })

  test('tierSections groups the odds by tier, most common first, each in the biome order', () => {
    const dunesFirst: LoadedBiome = { ...forest, biome: { ...forest.biome, modsters: [{ id: 'pinewraith' }, { id: 'mossbeast' }, { id: 'sproutling', rarity: 'legendary' }] } }
    const [entry] = biomeEntries([dunesFirst], modsters, new Map(), undefined)
    const sections = tierSections(entry?.odds ?? [])
    expect(sections.map((section) => [section.tier, section.odds.map((row) => row.id)])).toEqual([
      ['common', ['pinewraith', 'mossbeast']],
      ['legendary', ['sproutling']],
    ])
    expect(sections.map((section) => section.tierChance)).toEqual([76 / 76.5, 0.5 / 76.5])
  })
})
