import { describe, expect, test } from 'claude-code/testing'
import { detailLines, type CollectionEntry } from '../../hooks/render'

// P3-02: the dex (0017), both types (0022), habitat and catches; `???` until caught.
// The entry comes last: the text has a fixed height, so a long entry is what gets cut.

// Midday, so the local date is the same in every time zone the tests run in
const FIRST = Date.UTC(2026, 9, 8, 12)
const LAST = Date.UTC(2026, 9, 12, 12)
const entry: CollectionEntry = {
  id: 'twiggle',
  name: 'Twiggle',
  number: 7,
  types: ['grass', 'ghost'],
  record: { v: 1, count: 3, shinyCount: 0, firstCaughtAt: FIRST, lastCaughtAt: LAST, bestTier: 'rare', biomes: {} },
}
const dex = { number: 7, types: ['grass', 'ghost'] as const, category: 'Twig Modster', heightM: 0.3, weightKg: 1.2, entry: 'It hides as a branch.' }
const texts = (lines: ReturnType<typeof detailLines>) => lines.map((line) => line.map((segment) => ('text' in segment ? segment.text : '')).join(''))

describe('collectionDetail', () => {
  test('a caught Modster shows its dex, catches and where it lives', () => {
    const lines = detailLines({ entry, dex: { ...dex, types: [...dex.types] }, habitat: ['Whispering Forest', 'Saltbreeze Bay'] })
    expect(texts(lines)).toEqual([
      'Twiggle  #007',
      'grass · ghost · Twig Modster',
      '0.3 m · 1.2 kg',
      'Caught ×3 · best rare',
      'First 2026-10-08 · last 2026-10-12',
      'Lives in Whispering Forest, Saltbreeze Bay',
      'It hides as a branch.',
    ])
  })

  test('both types show in their own colors, the primary first', () => {
    const [, kind] = detailLines({ entry, dex: { ...dex, types: [...dex.types] }, habitat: [] })
    expect(kind?.filter((segment) => 'color' in segment && segment.color).map((segment) => ('text' in segment ? [segment.text, segment.color] : []))).toEqual([
      ['grass', '#4caf50'],
      ['ghost', '#6a5acd'],
    ])
  })

  test('an uncaught Modster shows only its number; the rest is ???', () => {
    const { record, ...uncaught } = entry
    const lines = texts(detailLines({ entry: uncaught, dex: { ...dex, types: [...dex.types] }, habitat: ['Whispering Forest'] }))
    expect(lines).toEqual(['???  #007', '???', 'Not caught yet'])
    expect(lines.join(' ')).not.toContain('Twiggle')
    expect(lines.join(' ')).not.toContain('Forest')
  })

  test('missing dex fields are left out, not shown empty', () => {
    expect(texts(detailLines({ entry: { ...entry, types: [] }, habitat: [] }))).toEqual(['Twiggle  #007', 'Caught ×3 · best rare', 'First 2026-10-08 · last 2026-10-12'])
  })
})
