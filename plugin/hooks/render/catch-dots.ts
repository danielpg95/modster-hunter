import { CATCH } from '../constants'
import { catchBeatAt, type CatchOutcome } from '../game'

// The throw in text, for places that can't draw it (decision 0035 point 7): one
// dot per rock, `● ○ ○` → `● ● ○` → `● ● ● click!`, or `● ✕ ○ broke free!`
// for a miss after one rock. Fixed width, so the line never jumps.

const FULL = '●'
const EMPTY = '○'
const BROKE = '✕'

/** The dot count `ms` after a throw that rocks `rocks` times, then is caught or missed. */
export function catchDots(outcome: CatchOutcome, rocks: number, ms: number): string {
  const at = catchBeatAt(ms, outcome, rocks)
  const dots = (filled: number, broke = false) =>
    Array.from({ length: CATCH.rocksToCatch }, (_, i) => (i < filled ? FULL : i === filled && broke ? BROKE : EMPTY)).join(' ')
  switch (at.beat) {
    case 'rock':
      return dots(at.rock + 1)
    case 'caught':
      return `${dots(CATCH.rocksToCatch)} click!`
    case 'broken':
      return `${dots(rocks, true)} broke free!`
    default:
      return dots(0)
  }
}
