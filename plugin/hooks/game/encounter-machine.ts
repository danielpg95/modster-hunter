import { CONTENT, ENCOUNTER } from '../constants'
import type { Biome, Modster, Rarity } from '../content'
import { pickWeighted } from './pick-weighted'
import type { RandomSource } from './random-source'
import { resolveCatchOdds } from './resolve-catch-odds'

// The encounter loop of decisions 0005 and 0014, as a pure reducer: every
// input carries `now` (ms), so tests drive it with a fake clock, and all
// randomness comes from `ctx.random` (decision 0003).
//
//   idle ─(work time reaches the next spawn)→ appearing ─1 s→ waiting
//   waiting ─throw→ throwing ─1.5 s→ caught → result
//                                   └→ missed → waiting, or fled → result when no attempts are left
//   appearing/waiting ─idle timeout→ fled → result ─4 s→ idle
//
// New encounters only spawn while a turn runs. The countdown to the next one
// counts "work time" only: it pauses between turns and carries over (0014).

export interface EncounterContext {
  biome: Biome
  modsters: ReadonlyMap<string, Modster>
  random: RandomSource
  /** `encounterIdleTimeoutSec` from the user's options, in ms */
  idleTimeoutMs: number
}

export type EncounterPhase = 'appearing' | 'waiting' | 'throwing' | 'result'

export interface Encounter {
  phase: EncounterPhase
  modsterId: string
  tier: Rarity
  maxAttempts: number
  catchRate: number
  attemptsLeft: number
  /** When the current timed phase (appearing, throwing, result) ends */
  phaseEndsAt: number
  /** Start of the idle-timeout window: appearance, the last throw, or the last turn start */
  idleSince: number
  /** Rolled when the throw is made; revealed when the wobble ends */
  throwLands?: boolean
  outcome?: 'caught' | 'fled'
  fledBecause?: 'attempts' | 'idle'
}

export interface EncounterState {
  turnRunning: boolean
  /** Work time (ms) counted up to `turnStartedAt`, or in total while no turn runs */
  workedMs: number
  turnStartedAt: number
  /** Work time at which the next Modster appears */
  nextSpawnAtWork: number
  encounter?: Encounter
}

export type EncounterInput =
  | { type: 'turnStart'; now: number }
  | { type: 'turnEnd'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'throw'; now: number }

/** What happened during a step, for storage and stats (P2-08). */
export type EncounterEvent =
  | { type: 'appeared'; modsterId: string; tier: Rarity }
  | { type: 'missed'; modsterId: string; attemptsLeft: number }
  | { type: 'caught'; modsterId: string; tier: Rarity }
  | { type: 'fled'; modsterId: string; tier: Rarity; because: 'attempts' | 'idle' }

export interface EncounterStep {
  state: EncounterState
  events: EncounterEvent[]
}

/** The state at session start: no turn running, the first spawn already scheduled. */
export function startEncounters(ctx: EncounterContext): EncounterState {
  return { turnRunning: false, workedMs: 0, turnStartedAt: 0, nextSpawnAtWork: spawnDelayMs(ctx) }
}

/** Applies one input at `input.now`, first running every timer that came due. */
export function stepEncounter(state: EncounterState, input: EncounterInput, ctx: EncounterContext): EncounterStep {
  const events: EncounterEvent[] = []
  let next = advance(state, input.now, ctx, events)

  switch (input.type) {
    case 'turnStart':
      if (!next.turnRunning) next = { ...next, turnRunning: true, turnStartedAt: input.now }
      // A new turn resets the idle timer of an encounter in progress (0005)
      if (next.encounter && (next.encounter.phase === 'appearing' || next.encounter.phase === 'waiting')) {
        next = { ...next, encounter: { ...next.encounter, idleSince: input.now } }
      }
      break
    case 'turnEnd':
      if (next.turnRunning) {
        next = { ...next, turnRunning: false, workedMs: workTime(next, input.now) }
      }
      break
    case 'throw':
      // Only while waiting; presses during appearing or the wobble are ignored (0014)
      if (next.encounter?.phase === 'waiting') {
        const encounter = next.encounter
        next = {
          ...next,
          encounter: {
            ...encounter,
            phase: 'throwing',
            attemptsLeft: encounter.attemptsLeft - 1,
            phaseEndsAt: input.now + ENCOUNTER.throwingMs,
            throwLands: ctx.random() < encounter.catchRate,
          },
        }
      }
      break
    case 'tick':
      break
  }

  // A turn start can make a spawn due right away (work time was already past it)
  next = maybeSpawn(next, input.now, ctx, events)
  return { state: next, events }
}

/** Work time so far: what was counted before this turn, plus this turn's share. */
export function workTime(state: EncounterState, now: number): number {
  return state.workedMs + (state.turnRunning ? Math.max(now - state.turnStartedAt, 0) : 0)
}

function advance(state: EncounterState, now: number, ctx: EncounterContext, events: EncounterEvent[]): EncounterState {
  let next = state
  // Each pass resolves one due timer; a phase change can make the next one due at once
  for (let guard = 0; guard < 8; guard++) {
    const before = next
    next = resolveDuePhase(next, now, ctx, events)
    next = maybeSpawn(next, now, ctx, events)
    if (next === before) break
  }
  return next
}

function resolveDuePhase(state: EncounterState, now: number, ctx: EncounterContext, events: EncounterEvent[]): EncounterState {
  const encounter = state.encounter
  if (!encounter) return state

  if ((encounter.phase === 'appearing' || encounter.phase === 'waiting') && now - encounter.idleSince >= ctx.idleTimeoutMs) {
    // Wandered off: counted as fled, like running out of attempts (0005)
    events.push({ type: 'fled', modsterId: encounter.modsterId, tier: encounter.tier, because: 'idle' })
    return toResult(state, encounter, 'fled', 'idle', encounter.idleSince + ctx.idleTimeoutMs)
  }
  if (now < encounter.phaseEndsAt) return state

  switch (encounter.phase) {
    case 'appearing':
      return { ...state, encounter: { ...encounter, phase: 'waiting' } }
    case 'throwing': {
      const at = encounter.phaseEndsAt
      if (encounter.throwLands) {
        events.push({ type: 'caught', modsterId: encounter.modsterId, tier: encounter.tier })
        return toResult(state, encounter, 'caught', undefined, at)
      }
      if (encounter.attemptsLeft <= 0) {
        events.push({ type: 'fled', modsterId: encounter.modsterId, tier: encounter.tier, because: 'attempts' })
        return toResult(state, encounter, 'fled', 'attempts', at)
      }
      events.push({ type: 'missed', modsterId: encounter.modsterId, attemptsLeft: encounter.attemptsLeft })
      const { throwLands: _rolled, ...rest } = encounter
      return { ...state, encounter: { ...rest, phase: 'waiting', idleSince: at } }
    }
    case 'result':
      // The band clears; the countdown to the next Modster starts when the card ended,
      // not when the next tick happened to arrive
      return { ...withoutEncounter(state), nextSpawnAtWork: workTime(state, encounter.phaseEndsAt) + spawnDelayMs(ctx) }
    case 'waiting':
      return state
  }
}

function toResult(
  state: EncounterState,
  encounter: Encounter,
  outcome: 'caught' | 'fled',
  because: 'attempts' | 'idle' | undefined,
  at: number,
): EncounterState {
  const { throwLands: _rolled, ...rest } = encounter
  const result: Encounter = { ...rest, phase: 'result', outcome, phaseEndsAt: at + ENCOUNTER.resultMs }
  if (because) result.fledBecause = because
  return { ...state, encounter: result }
}

function withoutEncounter(state: EncounterState): EncounterState {
  const { encounter: _gone, ...rest } = state
  return rest
}

function maybeSpawn(state: EncounterState, now: number, ctx: EncounterContext, events: EncounterEvent[]): EncounterState {
  // Only one encounter at a time, and new ones only while a turn runs (0005)
  if (state.encounter || !state.turnRunning || workTime(state, now) < state.nextSpawnAtWork) return state
  const totalWeight = ctx.biome.modsters.reduce((sum, entry) => sum + entry.weight, 0)
  const entry = pickWeighted(
    ctx.biome.modsters.filter((candidate) => ctx.modsters.has(candidate.id)),
    ctx.random,
  )
  const modster = entry && ctx.modsters.get(entry.id)
  if (!entry || !modster) return state
  const odds = resolveCatchOdds(entry, modster, totalWeight)
  events.push({ type: 'appeared', modsterId: modster.id, tier: odds.tier })
  return {
    ...state,
    encounter: {
      phase: 'appearing',
      modsterId: modster.id,
      tier: odds.tier,
      maxAttempts: odds.maxAttempts,
      catchRate: odds.catchRate,
      attemptsLeft: odds.maxAttempts,
      phaseEndsAt: now + ENCOUNTER.appearingMs,
      idleSince: now,
    },
  }
}

/** A delay drawn uniformly from the biome's `encounterEverySec` range (CONTENT_FORMAT). */
function spawnDelayMs(ctx: EncounterContext): number {
  const [min, max] = ctx.biome.encounterEverySec ?? CONTENT.biome.defaultEncounterEverySec
  return Math.round((min + ctx.random() * (max - min)) * 1000)
}
