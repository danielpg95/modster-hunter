import { describe, expect, test } from 'claude-code/testing'
import { addCatch, isCaught, readCaughtRecord, type CaughtRecord } from '../../hooks/store'
import { memoryStore } from '../fixtures/memory-store'

const first = { tier: 'common', biomeId: 'whispering-forest', at: 1_000, shiny: false } as const

describe('caught records', () => {
  test('a first catch starts a record', () => {
    expect(addCatch(undefined, first)).toEqual({
      v: 1,
      count: 1,
      shinyCount: 0,
      firstCaughtAt: 1_000,
      lastCaughtAt: 1_000,
      bestTier: 'common',
      biomes: { 'whispering-forest': 1 },
    })
  })

  test('more catches add up, per biome too', () => {
    let record = addCatch(undefined, first)
    record = addCatch(record, { ...first, at: 2_000 })
    record = addCatch(record, { ...first, biomeId: 'tidepool-shallows', at: 3_000 })
    expect([record.count, record.lastCaughtAt, record.biomes]).toEqual([3, 3_000, { 'whispering-forest': 2, 'tidepool-shallows': 1 }])
  })

  test('the best tier is the rarest one it was ever caught at (0004)', () => {
    let record = addCatch(undefined, { ...first, tier: 'rare' })
    record = addCatch(record, { ...first, tier: 'common' })
    expect(record.bestTier).toBe('rare')
    expect(addCatch(record, { ...first, tier: 'legendary' }).bestTier).toBe('legendary')
  })

  test('shinies are counted apart', () => {
    expect(addCatch(addCatch(undefined, first), { ...first, shiny: true }).shinyCount).toBe(1)
  })

  test('a catch never changes the record it was given', () => {
    const record = addCatch(undefined, first)
    const copy = structuredClone(record)
    addCatch(record, { ...first, at: 5_000 })
    expect(record).toEqual(copy)
  })

  test('reading accepts a v1 record and nothing else', () => {
    const record: CaughtRecord = addCatch(undefined, first)
    expect(readCaughtRecord(structuredClone(record))).toEqual(record)
    for (const raw of [undefined, null, 'x', 3, {}, { ...record, v: 2 }, { ...record, count: -1 }, { ...record, bestTier: 'epic' }]) {
      expect(readCaughtRecord(raw)).toBeUndefined()
    }
  })

  test('reading drops bad biome counts and fills missing optional numbers', () => {
    const raw = { v: 1, count: 2, bestTier: 'common', biomes: { a: 2, b: 'x' } }
    expect(readCaughtRecord(raw)).toEqual({ v: 1, count: 2, shinyCount: 0, firstCaughtAt: 0, lastCaughtAt: 0, bestTier: 'common', biomes: { a: 2 } })
  })

  test('isCaught is true only when the collection has a readable record (P5-10)', async () => {
    const { store } = memoryStore({ 'caught:sproutling': addCatch(undefined, first), 'caught:broken': { v: 99 } })
    expect(await isCaught(store, 'sproutling')).toBe(true)
    expect(await isCaught(store, 'mossling')).toBe(false)
    expect(await isCaught(store, 'broken')).toBe(false)
  })
})
