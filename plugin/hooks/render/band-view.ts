import { BAND } from '../constants'
import type { Rarity } from '../content'
import type { EncounterPhase } from '../game'

// What the band above the prompt shows, as plain data (decision 0012). The
// hook turns it into Raster/Text/Button elements; keeping the choice here
// makes "never more rows than maxRows" testable for every phase and size.

export interface BandEncounter {
  phase: EncounterPhase
  outcome?: 'caught' | 'fled' | 'ran'
  fledBecause?: 'attempts' | 'idle'
  name: string
  tier: Rarity
  attemptsLeft: number
  spriteWidth: number
  spriteHeight: number
  /** The collection had this Modster when it appeared (P5-10) */
  alreadyCaught?: true
}

export interface BandInput {
  maxRows: number
  columns: number
  /** Raster sprites draw on the terminal only (until P5-06) */
  canDrawSprite: boolean
  encounter?: BandEncounter
  biome?: { name: string; accentColor?: string }
  showIdleLine: boolean
  /** The band is turned off (0023 point 3): one row during an encounter, nothing between them */
  oneRow?: boolean
}

/** The band's buttons; a plain Button draws as `1: Throw`, so a line's width is known (0020). */
export const BAND_BUTTONS = {
  throw: { hotkey: '1', label: 'Throw' },
  run: { hotkey: '2', label: 'Run' },
} as const
export type BandButton = keyof typeof BAND_BUTTONS

/** A line is text segments, with the Throw and Run buttons possibly among them. */
export type BandSegment = { text: string; bold?: true; dim?: true; color?: string } | { button: BandButton }
export type BandLine = BandSegment[]

export type BandView =
  | { kind: 'none' }
  | { kind: 'idle'; line: BandLine }
  | { kind: 'full'; spriteColumns: number; spriteRows: number; lines: BandLine[] }
  | { kind: 'compact'; lines: BandLine[] }

export function bandView(input: BandInput): BandView {
  const rows = Math.min(Math.max(0, Math.floor(input.maxRows)), input.oneRow ? 1 : Infinity)
  if (rows === 0) return { kind: 'none' }

  const encounter = input.encounter
  if (!encounter) {
    if (input.oneRow || !input.showIdleLine || !input.biome) return { kind: 'none' }
    const name: BandSegment = input.biome.accentColor
      ? { text: input.biome.name, color: input.biome.accentColor }
      : { text: input.biome.name }
    return { kind: 'idle', line: [name, { text: ' · listening for Modsters', dim: true }] }
  }

  const spriteRows = Math.ceil(encounter.spriteHeight / 2)
  const fullFits =
    input.canDrawSprite &&
    spriteRows <= rows &&
    encounter.spriteWidth + BAND.gapColumns + BAND.textColumns <= input.columns
  if (fullFits) return { kind: 'full', spriteColumns: encounter.spriteWidth, spriteRows, lines: fullLines(encounter) }
  if (rows === 1) return { kind: 'compact', lines: [singleLine(encounter, input.columns)] }
  return { kind: 'compact', lines: compactLines(encounter, input.columns) }
}

/** Rows the view takes; never more than `maxRows` (checked in tests for every phase and size). */
export function bandRows(view: BandView): number {
  switch (view.kind) {
    case 'none':
      return 0
    case 'idle':
      return 1
    case 'full':
      return Math.max(view.spriteRows, view.lines.length)
    case 'compact':
      return view.lines.length
  }
}

/** Columns a line takes: text as written, a plain Button as `hotkey: label`. */
export function lineWidth(line: BandLine): number {
  return line.reduce((sum, segment) => {
    if ('button' in segment) {
      const { hotkey, label } = BAND_BUTTONS[segment.button]
      return sum + hotkey.length + 2 + label.length
    }
    return sum + segment.text.length
  }, 0)
}

/** The line with Run, or without it when it doesn't fit: buttons don't truncate, Throw always stays (0020). */
function withRunIfFits(withRun: BandLine, withoutRun: BandLine, columns: number): BandLine {
  return lineWidth(withRun) <= columns ? withRun : withoutRun
}

/** The result card's first line as plain text, for places that draw text only (0023). */
export function resultText(e: BandEncounter): string {
  return (resultLines(e)[0] ?? []).map((segment) => ('text' in segment ? segment.text : '')).join('')
}

/** The name, bold, then the caught mark when the Modster is already in the collection (P5-10). */
function nameSegments(e: BandEncounter, text = e.name): BandSegment[] {
  const name: BandSegment = { text, bold: true }
  return e.alreadyCaught ? [name, { text: ` ${BAND.caughtMark}` }] : [name]
}

const left = (n: number): string => `${n} ${n === 1 ? 'throw' : 'throws'} left`

function resultLines(e: BandEncounter): BandLine[] {
  if (e.outcome === 'caught') return [[{ text: `Caught ${e.name}!`, bold: true }], [{ text: e.tier, dim: true }]]
  if (e.outcome === 'ran') return [[{ text: `You ran from ${e.name}.` }]]
  if (e.fledBecause === 'idle') return [[{ text: `${e.name} wandered off.` }]]
  return [[{ text: `${e.name} fled!` }], [{ text: 'Better luck next time.', dim: true }]]
}

// Full layout: beside the sprite, one line each for name and tier, throws left, and Throw and Run
function fullLines(e: BandEncounter): BandLine[] {
  const title: BandLine = [...nameSegments(e), { text: ` · ${e.tier}`, dim: true }]
  switch (e.phase) {
    case 'appearing':
      return [title, [{ text: 'appeared!' }]]
    case 'waiting':
      // `1: Throw   2: Run` is 17 columns, inside the full layout's 24-column text block
      return [title, [{ text: left(e.attemptsLeft), dim: true }], [{ button: 'throw' }, { text: '   ' }, { button: 'run' }]]
    case 'throwing':
      return [title, [{ text: left(e.attemptsLeft), dim: true }], [{ text: 'wobble… wobble…' }]]
    case 'result':
      return resultLines(e)
  }
}

// Compact layout: no sprite, at most 2 lines
function compactLines(e: BandEncounter, columns: number): BandLine[] {
  const wild: BandLine = [
    ...(e.alreadyCaught
      ? [...nameSegments(e, `A wild ${e.name}`), { text: ' appeared!', bold: true } as const]
      : [{ text: `A wild ${e.name} appeared!`, bold: true } as const]),
    { text: ` (${e.tier})`, dim: true },
  ]
  switch (e.phase) {
    case 'appearing':
      return [wild]
    case 'waiting': {
      const attempts: BandSegment = { text: ` · ${e.attemptsLeft} left`, dim: true }
      return [wild, withRunIfFits([{ button: 'throw' }, { text: ' · ' }, { button: 'run' }, attempts], [{ button: 'throw' }, attempts], columns)]
    }
    case 'throwing':
      return [wild, [{ text: 'wobble…' }, { text: ` · ${e.attemptsLeft} left`, dim: true }]]
    case 'result':
      return resultLines(e).slice(0, 2)
  }
}

// One row: everything on a single line
function singleLine(e: BandEncounter, columns: number): BandLine {
  const who: BandSegment[] = [...nameSegments(e), { text: ` (${e.tier})`, dim: true }]
  switch (e.phase) {
    case 'appearing':
      return [...who, { text: ' appeared!' }]
    case 'waiting': {
      const attempts: BandSegment = { text: ` · ${e.attemptsLeft} left`, dim: true }
      return withRunIfFits(
        [...who, { text: ' · ' }, { button: 'throw' }, { text: ' · ' }, { button: 'run' }, attempts],
        [...who, { text: ' · ' }, { button: 'throw' }, attempts],
        columns,
      )
    }
    case 'throwing':
      return [...who, { text: ' · wobble…' }, { text: ` · ${e.attemptsLeft} left`, dim: true }]
    case 'result':
      return resultLines(e)[0] ?? []
  }
}
