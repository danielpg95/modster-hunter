import { describe, expect, test } from 'claude-code/testing'
import { leavesNoBiome, type LoadedBiome } from '../../hooks/content'

// Decision 0032 point 8: the pane never turns off the last thing standing between the player and a biome.

/** Biomes by id, each listing the given Modster ids. */
function biomes(lists: Record<string, string[]>): { biomes: Map<string, LoadedBiome> } {
  return {
    biomes: new Map(
      Object.entries(lists).map(([id, modsters]) => [
        id,
        { biome: { schemaVersion: 1, id, name: id, modsters: modsters.map((entry) => ({ id: entry })) }, file: `biomes/${id}/biome.json` },
      ]),
    ),
  }
}

describe('leavesNoBiome', () => {
  test('turning off the last biome would leave none', () => {
    expect(leavesNoBiome(biomes({ forest: ['sproutling'] }), { kind: 'biome', id: 'forest', off: true })).toBe(true)
  })

  test('turning off one of two biomes leaves the other', () => {
    expect(leavesNoBiome(biomes({ forest: ['sproutling'], dunes: ['emberkit'] }), { kind: 'biome', id: 'forest', off: true })).toBe(false)
  })

  test('turning off the only Modster of every biome left would leave none', () => {
    expect(leavesNoBiome(biomes({ forest: ['sproutling'], dunes: ['sproutling'] }), { kind: 'modster', id: 'sproutling', off: true })).toBe(true)
  })

  test('a Modster is fine to turn off while some biome has another', () => {
    expect(leavesNoBiome(biomes({ forest: ['sproutling'], dunes: ['sproutling', 'emberkit'] }), { kind: 'modster', id: 'sproutling', off: true })).toBe(false)
  })

  test('turning on, or turning off with no biome to play already, is never blocked', () => {
    expect(leavesNoBiome(biomes({ forest: ['sproutling'] }), { kind: 'biome', id: 'forest', off: false })).toBe(false)
    expect(leavesNoBiome(biomes({}), { kind: 'modster', id: 'sproutling', off: true })).toBe(false)
  })
})
