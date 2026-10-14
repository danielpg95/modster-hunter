import { describe, expect, test } from 'claude-code/testing'
import type { Biome, Modster, Rarity } from '../../hooks/content'
import { encounterPool, pickEncounter, tierChances } from '../../hooks/game'
import { modsterNamed } from '../fixtures/modster-named'
import { scriptedRandom } from '../fixtures/scripted-random'

const tiers: Record<string, Rarity> = { a: 'common', b: 'common', c: 'uncommon', d: 'rare', e: 'legendary' }
const modsters = new Map<string, Modster>(Object.entries(tiers).map(([id, rarity]) => [id, modsterNamed(id, { rarity })]))
const biomeOf = (...ids: string[]): Biome => ({ schemaVersion: 1, id: 'b', name: 'B', modsters: ids.map((id) => ({ id })) })
const pick = (biome: Biome, ...random: number[]) => pickEncounter(encounterPool(biome, modsters), scriptedRandom(...random))?.modster.id

describe('pickEncounter', () => {
  test('the first draw picks a tier by the tier weights 76 / 19 / 4.5 / 0.5', () => {
    const all = biomeOf('a', 'c', 'd', 'e')
    // Out of 100: common [0, 76), uncommon [76, 95), rare [95, 99.5), legendary [99.5, 100)
    expect([0, 0.7599, 0.7601, 0.9499, 0.9501, 0.9949, 0.9951, 0.9999].map((r) => pick(all, r, 0))).toEqual(['a', 'a', 'c', 'c', 'd', 'd', 'e', 'e'])
  })

  test('the second draw picks one Modster of that tier, each equally likely', () => {
    const biome = biomeOf('a', 'c', 'b')
    expect([pick(biome, 0, 0), pick(biome, 0, 0.49), pick(biome, 0, 0.5), pick(biome, 0, 0.99)]).toEqual(['a', 'a', 'b', 'b'])
  })

  test('a tier with no Modster in the biome is left out, and the others keep their proportions', () => {
    // No legendary: out of 99.5, rare starts at 95 / 99.5 ≈ 0.9548
    const biome = biomeOf('a', 'c', 'd')
    expect([pick(biome, 0.9547, 0), pick(biome, 0.9549, 0), pick(biome, 0.9999, 0)]).toEqual(['c', 'd', 'd'])
    // Only uncommon and rare: uncommon is 19 / 23.5 ≈ 0.8085
    expect([pick(biomeOf('c', 'd'), 0.8, 0), pick(biomeOf('c', 'd'), 0.81, 0)]).toEqual(['c', 'd'])
  })

  test("a biome entry's rarity puts the Modster in that tier", () => {
    const biome: Biome = { ...biomeOf('a'), modsters: [{ id: 'a' }, { id: 'b', rarity: 'legendary' }] }
    expect([pick(biome, 0.5, 0.99), pick(biome, 0.999, 0)]).toEqual(['a', 'b'])
  })

  test('Modsters that did not load are left out, and an empty pool draws nothing', () => {
    expect(pick(biomeOf('missing', 'c'), 0, 0)).toBe('c')
    const random = scriptedRandom()
    expect(pickEncounter(encounterPool(biomeOf('missing'), modsters), random)).toBeUndefined()
    expect(random.remaining()).toBe(0)
  })

  test('a draw of exactly 1 still picks the last Modster of the last tier', () => {
    expect(pick(biomeOf('a', 'b', 'c'), 1, 1)).toBe('c')
    expect(pick(biomeOf('a', 'b'), 0, 1)).toBe('b')
  })

  test('tierChances: present tiers share 100% in the 76 / 19 / 4.5 / 0.5 proportions', () => {
    const chances = tierChances(encounterPool(biomeOf('a', 'b', 'c', 'd'), modsters))
    expect([...chances.keys()]).toEqual(['common', 'uncommon', 'rare'])
    expect(chances.get('common')).toBe(76 / 99.5)
    expect(chances.get('rare')).toBe(4.5 / 99.5)
  })
})
