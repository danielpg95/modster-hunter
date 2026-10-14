import { describe, expect, test } from 'claude-code/testing'
import { rarityTier } from '../../hooks/game'
import { modsterNamed } from '../fixtures/modster-named'

describe('rarityTier', () => {
  test("a biome entry without a rarity takes the Modster's", () => {
    expect(rarityTier({ id: 'm' }, modsterNamed('m', { rarity: 'rare' }))).toBe('rare')
  })

  test("a biome entry's rarity wins, so one Modster can be common here and rare there", () => {
    const modster = modsterNamed('m', { rarity: 'common' })
    expect(rarityTier({ id: 'm', rarity: 'rare' }, modster)).toBe('rare')
    expect(rarityTier({ id: 'm' }, modster)).toBe('common')
  })
})
