import { describe, expect, test } from 'claude-code/testing'
import type { LoadedModster } from '../../hooks/content'
import { collectionEntries, dexNumber } from '../../hooks/render'
import type { CaughtRecord } from '../../hooks/store'

// P3-02: built-ins by dex number, then unnumbered Modsters by name (0017 point 3).

const loaded = (id: string, name: string, number?: number, types: string[] = ['grass']): LoadedModster =>
  ({
    modster: { schemaVersion: 1, id, name, sprite: { file: 's.sprite.json' }, dex: { ...(number === undefined ? {} : { number }), types } },
    sprite: { schemaVersion: 1, width: 8, height: 8, palette: [], frames: [] },
  }) as unknown as LoadedModster

const RECORD: CaughtRecord = { v: 1, count: 2, shinyCount: 0, firstCaughtAt: 0, lastCaughtAt: 0, bestTier: 'rare', biomes: {} }

describe('collectionEntries', () => {
  test('numbered Modsters come first by number, then the rest by name', () => {
    const entries = collectionEntries([loaded('zed', 'Zed'), loaded('b', 'Bee', 2), loaded('ann', 'Ann'), loaded('a', 'Ay', 1)], new Map())
    expect(entries.map((entry) => entry.id)).toEqual(['a', 'b', 'ann', 'zed'])
  })

  test('a caught Modster carries its record, types primary first (0022)', () => {
    const [entry] = collectionEntries([loaded('a', 'Ay', 1, ['grass', 'ghost'])], new Map([['a', RECORD]]))
    expect(entry).toEqual({ id: 'a', name: 'Ay', number: 1, types: ['grass', 'ghost'], record: RECORD })
  })

  test('records for Modsters that no longer load are left out', () => {
    expect(collectionEntries([loaded('a', 'Ay', 1)], new Map([['gone', RECORD]])).map((entry) => entry.id)).toEqual(['a'])
  })

  test('dex numbers read #001, and #— without one', () => {
    const [numbered, plain] = collectionEntries([loaded('a', 'Ay', 7), loaded('b', 'Bee')], new Map())
    expect([dexNumber(numbered!), dexNumber(plain!)]).toEqual(['#007', '#—'])
  })
})
