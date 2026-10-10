import { describe, expect, test } from 'claude-code/testing'
import { BAND_BUTTONS, bandRows, bandView, lineWidth, type BandEncounter, type BandInput, type BandLine } from '../../hooks/render'

const encounter = (overrides: Partial<BandEncounter> = {}): BandEncounter => ({
  phase: 'waiting',
  name: 'Sproutling',
  tier: 'common',
  attemptsLeft: 3,
  spriteWidth: 12,
  spriteHeight: 12,
  ...overrides,
})
const input = (overrides: Partial<BandInput> = {}): BandInput => ({
  maxRows: 7,
  columns: 80,
  canDrawSprite: true,
  encounter: encounter(),
  biome: { name: 'Whispering Forest', accentColor: '#4caf50' },
  showIdleLine: true,
  ...overrides,
})
const text = (line: BandLine): string =>
  line.map((segment) => ('button' in segment ? `[${BAND_BUTTONS[segment.button].hotkey}: ${BAND_BUTTONS[segment.button].label}]` : segment.text)).join('')

const PHASES: Partial<BandEncounter>[] = [
  { phase: 'appearing' },
  { phase: 'waiting' },
  { phase: 'throwing', attemptsLeft: 2 },
  { phase: 'result', outcome: 'caught' },
  { phase: 'result', outcome: 'fled', fledBecause: 'attempts', attemptsLeft: 0 },
  { phase: 'result', outcome: 'fled', fledBecause: 'idle' },
  { phase: 'result', outcome: 'ran' },
]
const SPRITES = [
  { spriteWidth: 12, spriteHeight: 12 },
  { spriteWidth: 24, spriteHeight: 12 },
  { spriteWidth: 20, spriteHeight: 10 },
]

describe('bandView', () => {
  test('never takes more rows than maxRows, for every phase, size and surface', () => {
    for (const maxRows of [0, 1, 2, 3, 4, 5, 6, 7]) {
      for (const phase of PHASES) {
        for (const sprite of SPRITES) {
          for (const columns of [40, 80, 120]) {
            for (const canDrawSprite of [true, false]) {
              const view = bandView(input({ maxRows, columns, canDrawSprite, encounter: encounter({ ...phase, ...sprite }) }))
              expect([maxRows, phase.phase, bandRows(view) <= maxRows]).toEqual([maxRows, phase.phase, true])
            }
          }
        }
      }
    }
  })

  test('maxRows 0 draws nothing', () => {
    expect(bandView(input({ maxRows: 0 }))).toEqual({ kind: 'none' })
  })

  test('maxRows 1 is a single line with both buttons (0020)', () => {
    const view = bandView(input({ maxRows: 1 }))
    expect(view.kind === 'compact' && view.lines.map(text)).toEqual(['Sproutling (common) · [1: Throw] · [2: Run] · 3 left'])
  })

  test('maxRows 2 is the compact layout: no sprite, two lines', () => {
    const view = bandView(input({ maxRows: 2 }))
    expect(view.kind === 'compact' && view.lines.map(text)).toEqual(['A wild Sproutling appeared! (common)', '[1: Throw] · [2: Run] · 3 left'])
  })

  test('maxRows 5 is still compact for a 12 px tall sprite (6 rows)', () => {
    expect(bandView(input({ maxRows: 5 })).kind).toBe('compact')
  })

  test('maxRows 5 fits a 10 px tall sprite in the full layout', () => {
    expect(bandView(input({ maxRows: 5, encounter: encounter({ spriteWidth: 20, spriteHeight: 10 }) })).kind).toBe('full')
  })

  test('maxRows 6 and 7 use the full layout: sprite, then name, throws left and the buttons', () => {
    for (const maxRows of [6, 7]) {
      const view = bandView(input({ maxRows }))
      expect(view).toEqual({
        kind: 'full',
        spriteColumns: 12,
        spriteRows: 6,
        lines: [
          [{ text: 'Sproutling', bold: true }, { text: ' · common', dim: true }],
          [{ text: '3 throws left', dim: true }],
          [{ button: 'throw' }, { text: '   ' }, { button: 'run' }],
        ],
      })
    }
  })

  test('a band too narrow for sprite + gap + 24 columns falls back to compact', () => {
    expect(bandView(input({ columns: 12 + 2 + 23 })).kind).toBe('compact')
    expect(bandView(input({ columns: 12 + 2 + 24 })).kind).toBe('full')
  })

  test('off the terminal, no sprite: compact text (until P5-06)', () => {
    expect(bandView(input({ canDrawSprite: false })).kind).toBe('compact')
  })

  test('a band too narrow for both buttons leaves Run out and keeps Throw (0020)', () => {
    const withRun = 'Sproutling (common) · [1: Throw] · [2: Run] · 3 left'
    const withoutRun = 'Sproutling (common) · [1: Throw] · 3 left'
    // Buttons are measured as drawn, `1: Throw`, without the test's brackets
    const fits = withRun.length - 4
    const one = (columns: number) => {
      const view = bandView(input({ maxRows: 1, columns }))
      return view.kind === 'compact' ? view.lines.map(text) : []
    }
    expect(one(fits)).toEqual([withRun])
    expect(one(fits - 1)).toEqual([withoutRun])

    const two = bandView(input({ maxRows: 2, columns: 20 }))
    expect(two.kind === 'compact' && two.lines.map(text)[1]).toBe('[1: Throw] · 3 left')
  })

  test('a line is measured as the terminal draws it', () => {
    expect(lineWidth([{ button: 'throw' }, { text: '   ' }, { button: 'run' }])).toBe('1: Throw   2: Run'.length)
  })

  test('the Throw button shows only while waiting (0014)', () => {
    for (const maxRows of [1, 2, 7]) {
      for (const phase of PHASES) {
        const view = bandView(input({ maxRows, encounter: encounter(phase) }))
        const lines = view.kind === 'full' || view.kind === 'compact' ? view.lines : []
        const hasButton = lines.some((line) => line.some((segment) => 'button' in segment))
        expect([maxRows, phase.phase, hasButton]).toEqual([maxRows, phase.phase, phase.phase === 'waiting'])
      }
    }
  })

  test('each phase has its own words', () => {
    const lines = (phase: Partial<BandEncounter>) => {
      const view = bandView(input({ encounter: encounter(phase) }))
      return view.kind === 'full' ? view.lines.map(text) : []
    }
    expect(lines({ phase: 'appearing' })).toEqual(['Sproutling · common', 'appeared!'])
    expect(lines({ phase: 'throwing', attemptsLeft: 1 })).toEqual(['Sproutling · common', '1 throw left', 'wobble… wobble…'])
    expect(lines({ phase: 'result', outcome: 'caught' })).toEqual(['Caught Sproutling!', 'common'])
    expect(lines({ phase: 'result', outcome: 'fled', fledBecause: 'attempts' })).toEqual(['Sproutling fled!', 'Better luck next time.'])
    expect(lines({ phase: 'result', outcome: 'fled', fledBecause: 'idle' })).toEqual(['Sproutling wandered off.'])
    expect(lines({ phase: 'result', outcome: 'ran' })).toEqual(['You ran from Sproutling.'])
  })

  test('between encounters, the idle line names the biome in its accent color', () => {
    const { encounter: _none, ...rest } = input()
    const view = bandView(rest)
    expect(view).toEqual({
      kind: 'idle',
      line: [{ text: 'Whispering Forest', color: '#4caf50' }, { text: ' · listening for Modsters', dim: true }],
    })
  })

  test('the idle line can be turned off, and needs a biome', () => {
    const { encounter: _none, ...rest } = input()
    expect(bandView({ ...rest, showIdleLine: false }).kind).toBe('none')
    const { biome: _noBiome, ...noBiome } = rest
    expect(bandView(noBiome).kind).toBe('none')
  })
})
