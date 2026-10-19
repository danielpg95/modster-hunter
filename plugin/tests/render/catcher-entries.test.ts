import { describe, expect, test } from 'claude-code/testing'
import type { Catcher } from '../../hooks/content'
import { catcherEntries, catcherRow, previewModsterId } from '../../hooks/render'
import type { CaughtRecord } from '../../hooks/store'

const catcher = (id: string, name: string, description?: string): Catcher => ({
  schemaVersion: 1,
  id,
  name,
  style: 'contain',
  sprite: { file: 'sprite.sprite.json' },
  ...(description ? { description } : {}),
})
const record = (lastCaughtAt: number): CaughtRecord => ({ v: 1, count: 1, shinyCount: 0, firstCaughtAt: 0, lastCaughtAt, bestTier: 'common', biomes: {} })
const text = (row: ReturnType<typeof catcherRow>) => row.map((segment) => ('text' in segment ? segment.text : '')).join('')

describe('catcherEntries', () => {
  test('the default catcher comes first, then the rest by name', () => {
    const entries = catcherEntries([catcher('net', 'Net'), catcher('pod', 'Seed pod'), catcher('jar', 'Glass jar'), catcher('lantern', 'Lantern')], 'jar', new Set())
    expect(entries.map((entry) => entry.id)).toEqual(['jar', 'lantern', 'net', 'pod'])
  })

  test('the one in use and the player\'s own are marked', () => {
    const entries = catcherEntries([catcher('jar', 'Glass jar'), catcher('bubble', 'Bubble', 'Floats.')], 'bubble', new Set(['bubble']))
    expect(entries).toEqual([
      { id: 'jar', name: 'Glass jar', isInUse: false },
      { id: 'bubble', name: 'Bubble', description: 'Floats.', isInUse: true, isYours: true },
    ])
  })

  test('catcherRow: the selection arrow, the name to a fixed width, then the marks', () => {
    expect(text(catcherRow({ id: 'jar', name: 'Glass jar', isInUse: true }, true))).toBe('▸ Glass jar          ✓ in use')
    expect(text(catcherRow({ id: 'bubble', name: 'Bubble', isInUse: false, isYours: true }, false))).toBe('  Bubble             yours')
  })

  test('previewModsterId: the loaded Modster caught last, or none', () => {
    const records = new Map([
      ['sproutling', record(100)],
      ['dunebun', record(300)],
      ['gone', record(900)],
    ])
    expect(previewModsterId(records, new Set(['sproutling', 'dunebun']))).toBe('dunebun')
    expect(previewModsterId(new Map(), new Set(['sproutling']))).toBe(undefined)
  })
})
