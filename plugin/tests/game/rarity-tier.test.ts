import { describe, expect, test } from 'claude-code/testing'
import { rarityTier } from '../../hooks/game'

describe('rarityTier', () => {
  test('20% of the biome weight or more is common', () => {
    expect(rarityTier(20, 100)).toBe('common')
    expect(rarityTier(100, 100)).toBe('common')
  })

  test('5% up to under 20% is uncommon', () => {
    expect(rarityTier(19, 100)).toBe('uncommon')
    expect(rarityTier(5, 100)).toBe('uncommon')
  })

  test('1% up to under 5% is rare', () => {
    expect(rarityTier(4, 100)).toBe('rare')
    expect(rarityTier(1, 100)).toBe('rare')
  })

  test('under 1% is legendary', () => {
    expect(rarityTier(99, 10_000)).toBe('legendary')
    expect(rarityTier(1, 101)).toBe('legendary')
  })

  test('exact thresholds hold for shares that are not round in binary', () => {
    expect(rarityTier(7, 35)).toBe('common') // 20%
    expect(rarityTier(3, 60)).toBe('uncommon') // 5%
    expect(rarityTier(3, 300)).toBe('rare') // 1%
  })
})
