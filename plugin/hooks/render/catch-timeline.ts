import { CATCH } from '../constants'
import type { CatcherBeatName } from '../content'

// Where a throw is at a given time (decision 0035 points 5–6): throw, take,
// settle, a rock per `rocks`, then caught or broken. Every catcher shares it.

export type CatchOutcome = 'caught' | 'missed'

export interface CatchBeatAt {
  beat: CatcherBeatName
  /** 0-based rock number, during `rock` */
  rock: number
  /** How far through the beat, 0 to 1; 1 once the timeline has ended */
  progress: number
  /** Milliseconds since the beat began */
  elapsedMs: number
}

const { beatMs } = CATCH
const RISE_MS = beatMs.throw + beatMs.take + beatMs.settle

/** When the throwing phase ends: the click for a catch (its `caught` beat plays in the result card), or the end of `broken` for a miss. */
export function throwingMs(outcome: CatchOutcome, rocks: number): number {
  return RISE_MS + rocks * beatMs.rock + (outcome === 'missed' ? beatMs.broken : 0)
}

/** The beat playing `ms` after the throw; past the end it holds the last beat at progress 1. */
export function catchBeatAt(ms: number, outcome: CatchOutcome, rocks: number): CatchBeatAt {
  const t = Math.max(0, ms)
  const at = (beat: CatcherBeatName, start: number, length: number, rock = 0): CatchBeatAt => {
    const elapsedMs = Math.min(t - start, length)
    return { beat, rock, progress: length > 0 ? elapsedMs / length : 1, elapsedMs }
  }
  if (t < beatMs.throw) return at('throw', 0, beatMs.throw)
  if (t < beatMs.throw + beatMs.take) return at('take', beatMs.throw, beatMs.take)
  if (t < RISE_MS) return at('settle', beatMs.throw + beatMs.take, beatMs.settle)
  const rocksEnd = RISE_MS + rocks * beatMs.rock
  if (t < rocksEnd) {
    const rock = Math.floor((t - RISE_MS) / beatMs.rock)
    return at('rock', RISE_MS + rock * beatMs.rock, beatMs.rock, rock)
  }
  return outcome === 'caught' ? at('caught', rocksEnd, beatMs.caught) : at('broken', rocksEnd, beatMs.broken)
}
