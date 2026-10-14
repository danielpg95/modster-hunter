import { describe, expect, test } from 'claude-code/testing'
import { resolveCatchOdds } from '../../hooks/game'
import { modsterNamed } from '../fixtures/modster-named'

// Sproutling is common in its file: 3 attempts, 0.5 per throw
const entry = { id: 'sproutling' }

describe('resolveCatchOdds', () => {
  test('with no overrides, the Modster file sets the tier and its defaults', () => {
    expect(resolveCatchOdds(entry, modsterNamed('sproutling'))).toEqual({ tier: 'common', maxAttempts: 3, catchRate: 0.5 })
  })

  test('each tier has the defaults of decision 0004', () => {
    const at = (rarity: 'common' | 'uncommon' | 'rare' | 'legendary') => resolveCatchOdds({ id: 'm' }, modsterNamed('m', { rarity }))
    expect([at('common'), at('uncommon'), at('rare'), at('legendary')].map(({ tier, maxAttempts, catchRate }) => [tier, maxAttempts, catchRate])).toEqual([
      ['common', 3, 0.5],
      ['uncommon', 3, 0.35],
      ['rare', 4, 0.2],
      ['legendary', 5, 0.08],
    ])
  })

  test('null in the Modster file means the tier default', () => {
    const modster = modsterNamed('sproutling', { maxAttempts: null, catchRate: null })
    const odds = resolveCatchOdds(entry, modster)
    expect([odds.tier, odds.maxAttempts, odds.catchRate]).toEqual(['common', 3, 0.5])
  })

  test("the biome entry's rarity wins over the Modster's, with that tier's defaults", () => {
    const odds = resolveCatchOdds({ ...entry, rarity: 'legendary' }, modsterNamed('sproutling'))
    expect([odds.tier, odds.maxAttempts, odds.catchRate]).toEqual(['legendary', 5, 0.08])
  })

  test('the Modster file overrides the tier default', () => {
    const odds = resolveCatchOdds(entry, modsterNamed('sproutling', { maxAttempts: 7, catchRate: 0.9 }))
    expect([odds.maxAttempts, odds.catchRate]).toEqual([7, 0.9])
  })

  test('the biome entry overrides the Modster file', () => {
    const modster = modsterNamed('sproutling', { maxAttempts: 7, catchRate: 0.9 })
    const odds = resolveCatchOdds({ ...entry, maxAttempts: 2, catchRate: 0.1 }, modster)
    expect([odds.maxAttempts, odds.catchRate]).toEqual([2, 0.1])
  })

  test('the biome entry overrides the tier default when the Modster file is silent', () => {
    const odds = resolveCatchOdds({ ...entry, catchRate: 0.25 }, modsterNamed('sproutling'))
    expect([odds.maxAttempts, odds.catchRate]).toEqual([3, 0.25])
  })

  test('attempts and catch rate resolve independently', () => {
    const modster = modsterNamed('sproutling', { catchRate: 0.9 })
    const odds = resolveCatchOdds({ ...entry, maxAttempts: 1 }, modster)
    expect([odds.maxAttempts, odds.catchRate]).toEqual([1, 0.9])
  })
})
