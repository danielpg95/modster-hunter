import { describe, expect, test } from 'claude-code/testing'
import { resolveCatchOdds } from '../../hooks/game'
import { modsterNamed } from '../fixtures/modster-named'

// 60 of 100 → common by weight: 3 attempts, 0.5 per throw
const entry = { id: 'sproutling', weight: 60 }

describe('resolveCatchOdds', () => {
  test('with no overrides, the tier from weight gives the defaults', () => {
    expect(resolveCatchOdds(entry, modsterNamed('sproutling'), 100)).toEqual({
      tier: 'common',
      encounterChance: 0.6,
      maxAttempts: 3,
      catchRate: 0.5,
    })
  })

  test('each tier has the defaults of decision 0004', () => {
    const at = (weight: number) => resolveCatchOdds({ id: 'm', weight }, modsterNamed('m'), 1000)
    expect([at(200), at(50), at(10), at(9)].map(({ tier, maxAttempts, catchRate }) => [tier, maxAttempts, catchRate])).toEqual([
      ['common', 3, 0.5],
      ['uncommon', 3, 0.35],
      ['rare', 4, 0.2],
      ['legendary', 5, 0.08],
    ])
  })

  test('null in the Modster file means the tier default', () => {
    const modster = modsterNamed('sproutling', { rarity: null, maxAttempts: null, catchRate: null })
    const odds = resolveCatchOdds(entry, modster, 100)
    expect([odds.tier, odds.maxAttempts, odds.catchRate]).toEqual(['common', 3, 0.5])
  })

  test('an explicit rarity sets the tier and its defaults, whatever the weight', () => {
    const odds = resolveCatchOdds(entry, modsterNamed('sproutling', { rarity: 'legendary' }), 100)
    expect([odds.tier, odds.maxAttempts, odds.catchRate]).toEqual(['legendary', 5, 0.08])
  })

  test('the Modster file overrides the tier default', () => {
    const odds = resolveCatchOdds(entry, modsterNamed('sproutling', { maxAttempts: 7, catchRate: 0.9 }), 100)
    expect([odds.maxAttempts, odds.catchRate]).toEqual([7, 0.9])
  })

  test('the biome entry overrides the Modster file', () => {
    const modster = modsterNamed('sproutling', { maxAttempts: 7, catchRate: 0.9 })
    const odds = resolveCatchOdds({ ...entry, maxAttempts: 2, catchRate: 0.1 }, modster, 100)
    expect([odds.maxAttempts, odds.catchRate]).toEqual([2, 0.1])
  })

  test('the biome entry overrides the tier default when the Modster file is silent', () => {
    const odds = resolveCatchOdds({ ...entry, catchRate: 0.25 }, modsterNamed('sproutling'), 100)
    expect([odds.maxAttempts, odds.catchRate]).toEqual([3, 0.25])
  })

  test('attempts and catch rate resolve independently', () => {
    const modster = modsterNamed('sproutling', { catchRate: 0.9 })
    const odds = resolveCatchOdds({ ...entry, maxAttempts: 1 }, modster, 100)
    expect([odds.maxAttempts, odds.catchRate]).toEqual([1, 0.9])
  })

  test('the same Modster can be common in one biome and rare in another', () => {
    const modster = modsterNamed('sproutling')
    expect(resolveCatchOdds({ id: 'sproutling', weight: 50 }, modster, 100).tier).toBe('common')
    expect(resolveCatchOdds({ id: 'sproutling', weight: 2 }, modster, 100).tier).toBe('rare')
  })
})
