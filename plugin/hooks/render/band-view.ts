import { BAND } from '../constants'
import type { Rarity } from '../content'
import type { EncounterPhase } from '../game'

// What the band above the prompt shows, as plain data (decision 0012). The
// hook turns it into Raster/Text/Button elements; keeping the choice here
// makes "never more rows than maxRows" testable for every phase and size.

export interface BandEncounter {
  phase: EncounterPhase
  outcome?: 'caught' | 'fled'
  fledBecause?: 'attempts' | 'idle'
  name: string
  tier: Rarity
  attemptsLeft: number
  spriteWidth: number
  spriteHeight: number
}

export interface BandInput {
  maxRows: number
  columns: number
  /** Raster sprites draw on the terminal only (until P5-06) */
  canDrawSprite: boolean
  encounter?: BandEncounter
  biome?: { name: string; accentColor?: string }
  showIdleLine: boolean
}

/** A line is text segments, with the Throw button possibly among them. */
export type BandSegment = { text: string; bold?: true; dim?: true; color?: string } | { button: 'throw' }
export type BandLine = BandSegment[]

export type BandView =
  | { kind: 'none' }
  | { kind: 'idle'; line: BandLine }
  | { kind: 'full'; spriteColumns: number; spriteRows: number; lines: BandLine[] }
  | { kind: 'compact'; lines: BandLine[] }

export function bandView(input: BandInput): BandView {
  const rows = Math.max(0, Math.floor(input.maxRows))
  if (rows === 0) return { kind: 'none' }

  const encounter = input.encounter
  if (!encounter) {
    if (!input.showIdleLine || !input.biome) return { kind: 'none' }
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
  if (rows === 1) return { kind: 'compact', lines: [singleLine(encounter)] }
  return { kind: 'compact', lines: compactLines(encounter) }
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

const left = (n: number): string => `${n} ${n === 1 ? 'throw' : 'throws'} left`

function resultLines(e: BandEncounter): BandLine[] {
  if (e.outcome === 'caught') return [[{ text: `Caught ${e.name}!`, bold: true }], [{ text: e.tier, dim: true }]]
  if (e.fledBecause === 'idle') return [[{ text: `${e.name} wandered off.` }]]
  return [[{ text: `${e.name} fled!` }], [{ text: 'Better luck next time.', dim: true }]]
}

// Full layout: beside the sprite, one line each for name and tier, throws left, and Throw
function fullLines(e: BandEncounter): BandLine[] {
  const title: BandLine = [{ text: e.name, bold: true }, { text: ` · ${e.tier}`, dim: true }]
  switch (e.phase) {
    case 'appearing':
      return [title, [{ text: 'appeared!' }]]
    case 'waiting':
      return [title, [{ text: left(e.attemptsLeft), dim: true }], [{ button: 'throw' }]]
    case 'throwing':
      return [title, [{ text: left(e.attemptsLeft), dim: true }], [{ text: 'wobble… wobble…' }]]
    case 'result':
      return resultLines(e)
  }
}

// Compact layout: no sprite, at most 2 lines
function compactLines(e: BandEncounter): BandLine[] {
  const wild: BandLine = [{ text: `A wild ${e.name} appeared!`, bold: true }, { text: ` (${e.tier})`, dim: true }]
  switch (e.phase) {
    case 'appearing':
      return [wild]
    case 'waiting':
      return [wild, [{ button: 'throw' }, { text: ` · ${e.attemptsLeft} left`, dim: true }]]
    case 'throwing':
      return [wild, [{ text: 'wobble…' }, { text: ` · ${e.attemptsLeft} left`, dim: true }]]
    case 'result':
      return resultLines(e).slice(0, 2)
  }
}

// One row: everything on a single line
function singleLine(e: BandEncounter): BandLine {
  const who: BandSegment[] = [{ text: e.name, bold: true }, { text: ` (${e.tier})`, dim: true }]
  switch (e.phase) {
    case 'appearing':
      return [...who, { text: ' appeared!' }]
    case 'waiting':
      return [...who, { text: ' · ' }, { button: 'throw' }, { text: ` · ${e.attemptsLeft} left`, dim: true }]
    case 'throwing':
      return [...who, { text: ' · wobble…' }, { text: ` · ${e.attemptsLeft} left`, dim: true }]
    case 'result':
      return resultLines(e)[0] ?? []
  }
}
