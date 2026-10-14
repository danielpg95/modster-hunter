import { describe, expect, test } from 'claude-code/testing'
import { checkTierBalance, type Biome, type Modster, type Rarity } from '../../hooks/content'
import { modsterNamed } from '../fixtures/modster-named'

const file = 'biomes/b/biome.json'

/** A biome with `count` Modsters of each tier given, ids like `common-0`. */
function pool(counts: Partial<Record<Rarity, number>>): { biome: Biome; modsters: Map<string, Modster> } {
  const modsters = new Map<string, Modster>()
  for (const [rarity, count] of Object.entries(counts) as [Rarity, number][]) {
    for (let i = 0; i < count; i++) modsters.set(`${rarity}-${i}`, modsterNamed(`${rarity}-${i}`, { rarity }))
  }
  return { biome: { schemaVersion: 1, id: 'b', name: 'B', modsters: [...modsters.keys()].map((id) => ({ id })) }, modsters }
}

describe('checkTierBalance', () => {
  test('the built-in shapes, a few per tier, raise no warning', () => {
    const { biome, modsters } = pool({ common: 3, uncommon: 3, rare: 3, legendary: 1 })
    expect(checkTierBalance(biome, modsters, file)).toEqual([])
  })

  test('100 commons next to one uncommon warn: each common appears less often', () => {
    const { biome, modsters } = pool({ common: 100, uncommon: 1 })
    expect(checkTierBalance(biome, modsters, file)).toEqual([
      {
        severity: 'warning',
        file,
        field: 'modsters',
        problem: 'each common Modster appears 0.8% of the time, less than each uncommon one (20.0%); move some to a rarer tier or out of this biome',
      },
    ])
  })

  test('the warning names the rarer tier whose Modsters appear most often', () => {
    // Out of 99.5: each common 76 / 20 ≈ 3.8%, each uncommon 19.1%, each rare 4.5%
    const { biome, modsters } = pool({ common: 20, uncommon: 1, rare: 1 })
    expect(checkTierBalance(biome, modsters, file).map((issue) => issue.problem)).toEqual([
      'each common Modster appears 3.8% of the time, less than each uncommon one (19.1%); move some to a rarer tier or out of this biome',
    ])
  })

  test("a biome entry's rarity counts, and missing Modsters are skipped", () => {
    const { biome, modsters } = pool({ common: 6 })
    // One moved to uncommon by its entry: out of 95, five commons at 16% each, the uncommon at 20%
    biome.modsters[0] = { id: 'common-0', rarity: 'uncommon' }
    biome.modsters.push({ id: 'missing', rarity: 'legendary' })
    expect(checkTierBalance(biome, modsters, file).map((issue) => issue.problem)).toEqual([
      'each common Modster appears 16.0% of the time, less than each uncommon one (20.0%); move some to a rarer tier or out of this biome',
    ])
  })
})
