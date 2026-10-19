import { describe, expect, test } from 'claude-code/testing'
import type { Biome, Modster } from '../../hooks/content'
import {
  isWorking,
  startEncounters,
  stepEncounter,
  workTime,
  type EncounterContext,
  type EncounterInput,
  type EncounterState,
} from '../../hooks/game'
import { modsterNamed } from '../fixtures/modster-named'
import { scriptedRandom } from '../fixtures/scripted-random'

// Time is a fake clock: every input carries `now` in ms, and nothing reads real time.
const S = 1000

// Both common, so each draws a tier (0 → common) then one of the two: < 0.5 Sproutling (3 throws, 0.5 per throw), else Mossbeast
const biome: Biome = {
  schemaVersion: 1,
  id: 'whispering-forest',
  name: 'Whispering Forest',
  encounterEverySec: [10, 30],
  modsters: [
    { id: 'sproutling' },
    { id: 'mossbeast' },
  ],
}
const modsters = new Map<string, Modster>([
  ['sproutling', modsterNamed('sproutling')],
  ['mossbeast', modsterNamed('mossbeast', { maxAttempts: 2, catchRate: 0.9 })],
])

function setup(...random: number[]) {
  const ctx: EncounterContext = { biome, modsters, random: scriptedRandom(...random), idleTimeoutMs: 90 * S }
  let state: EncounterState = startEncounters(ctx)
  const log: string[] = []
  const send = (input: EncounterInput) => {
    const step = stepEncounter(state, input, ctx)
    state = step.state
    for (const event of step.events) log.push(`${event.type} ${event.modsterId}`)
    return step.events
  }
  return {
    ctx,
    send,
    log,
    at: (now: number) => ({
      turnStart: () => send({ type: 'turnStart', now }),
      turnEnd: () => send({ type: 'turnEnd', now }),
      agentStart: (agentId: string) => send({ type: 'agentStart', now, agentId }),
      agentStop: (agentId: string) => send({ type: 'agentStop', now, agentId }),
      sessionEnd: () => send({ type: 'sessionEnd', now }),
      tick: () => send({ type: 'tick', now }),
      throw: () => send({ type: 'throw', now }),
      run: () => send({ type: 'run', now }),
    }),
    get state() {
      return state
    },
    get phase() {
      return state.encounter?.phase ?? 'idle'
    },
  }
}

// Random draws, in order: [first spawn delay], then per encounter [tier], [which Modster], per throw [lands?] and,
// for a miss, [rocks: < 0.5 → 1, else 2] (decision 0035), then [next spawn delay]
// Delay r → 10 + r × 20 s. Modster r < 0.75 → Sproutling.

describe('encounter machine', () => {
  test('nothing spawns while no turn runs', () => {
    const game = setup(0)
    game.at(60 * S).tick()
    expect(game.phase).toBe('idle')
  })

  test('a Modster appears once the turn has run for the drawn delay', () => {
    const game = setup(0, 0, 0.1)
    game.at(0).turnStart()
    game.at(10 * S - 1).tick()
    expect(game.phase).toBe('idle')
    expect(game.at(10 * S).tick()).toEqual([{ type: 'appeared', modsterId: 'sproutling', tier: 'common' }])
    expect(game.phase).toBe('appearing')
    expect(game.state.encounter?.attemptsLeft).toBe(3)
  })

  test('the delay is drawn from the biome encounterEverySec range', () => {
    const game = setup(1, 0, 0.1) // r = 1 → 30 s
    game.at(0).turnStart()
    game.at(30 * S - 1).tick()
    expect(game.phase).toBe('idle')
    game.at(30 * S).tick()
    expect(game.phase).toBe('appearing')
  })

  test('the countdown pauses between turns and carries over (0014)', () => {
    const game = setup(0, 0, 0.1)
    game.at(0).turnStart()
    game.at(6 * S).turnEnd() // 6 s of work
    game.at(100 * S).tick()
    expect(game.phase).toBe('idle')
    game.at(200 * S).turnStart()
    game.at(203 * S).tick()
    expect(game.phase).toBe('idle') // 9 s of work
    game.at(204 * S).tick()
    expect(game.phase).toBe('appearing') // 10 s of work
  })

  test('appearing turns into waiting after 1 s', () => {
    const game = setup(0, 0, 0.1)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S - 1).tick()
    expect(game.phase).toBe('appearing')
    game.at(11 * S).tick()
    expect(game.phase).toBe('waiting')
  })

  test('a throw that lands rocks 3 times and clicks at 2.4 s, then the card shows for 4 s (decision 0035)', () => {
    const game = setup(0, 0, 0.1, 0.49, 0) // 0.49 < 0.5 lands; a catch draws no rock count
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).throw()
    expect(game.phase).toBe('throwing')
    expect([game.state.encounter?.attemptsLeft, game.state.encounter?.rocks, game.state.encounter?.throwAt]).toEqual([2, 3, 11 * S])
    game.at(13.4 * S - 1).tick()
    expect(game.phase).toBe('throwing')
    expect(game.at(13.4 * S).tick()).toEqual([{ type: 'caught', modsterId: 'sproutling', tier: 'common' }])
    expect([game.phase, game.state.encounter?.outcome]).toEqual(['result', 'caught'])
    // The card keeps the throw, so its caught beat can play
    expect([game.state.encounter?.rocks, game.state.encounter?.throwAt]).toEqual([3, 11 * S])
    game.at(17.4 * S - 1).tick()
    expect(game.phase).toBe('result')
    game.at(17.4 * S).tick()
    expect(game.phase).toBe('idle')
  })

  test('a throw that misses rocks once, breaks free at 1.85 s, and goes back to waiting with one attempt fewer', () => {
    const game = setup(0, 0, 0.1, 0.5, 0.49) // 0.5 is not < 0.5: miss; 0.49 → 1 rock
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).throw()
    expect(game.state.encounter?.rocks).toBe(1)
    game.at(12.85 * S - 1).tick()
    expect(game.phase).toBe('throwing')
    expect(game.at(12.85 * S).tick()).toEqual([{ type: 'missed', modsterId: 'sproutling', attemptsLeft: 2 }])
    expect(game.phase).toBe('waiting')
    expect([game.state.encounter?.rocks, game.state.encounter?.throwAt]).toEqual([undefined, undefined])
  })

  test('a miss may rock twice instead, breaking free at 2.35 s', () => {
    const game = setup(0, 0, 0.1, 0.5, 0.5) // 0.5 → 2 rocks
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).throw()
    expect(game.state.encounter?.rocks).toBe(2)
    game.at(13.35 * S - 1).tick()
    expect(game.phase).toBe('throwing')
    game.at(13.35 * S).tick()
    expect(game.phase).toBe('waiting')
  })

  test('missing every attempt makes it flee', () => {
    const game = setup(0, 0, 0.1, 0.9, 0, 0.9, 0, 0.9, 0, 0)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    for (const t of [11, 13, 15]) {
      game.at(t * S).throw()
      game.at((t + 1.85) * S).tick()
    }
    expect(game.log).toEqual(['appeared sproutling', 'missed sproutling', 'missed sproutling', 'fled sproutling'])
    expect([game.phase, game.state.encounter?.outcome, game.state.encounter?.fledBecause]).toEqual(['result', 'fled', 'attempts'])
  })

  test('throws during appearing or the catch animation are ignored and cost nothing (0014)', () => {
    const game = setup(0, 0, 0.1, 0.9, 0)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(10.5 * S).throw() // appearing
    expect([game.phase, game.state.encounter?.attemptsLeft]).toEqual(['appearing', 3])
    game.at(11 * S).throw()
    game.at(11.5 * S).throw() // the catcher is rocking
    expect([game.phase, game.state.encounter?.attemptsLeft]).toEqual(['throwing', 2])
  })

  test('an idle encounter wanders off after the timeout, counted as fled', () => {
    const game = setup(0, 0, 0.1, 0)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(100 * S - 1).tick()
    expect(game.phase).toBe('waiting')
    expect(game.at(100 * S).tick()).toEqual([{ type: 'fled', modsterId: 'sproutling', tier: 'common', because: 'idle' }])
    expect(game.state.encounter?.fledBecause).toBe('idle')
  })

  test('the idle timer restarts after each throw', () => {
    const game = setup(0, 0, 0.1, 0.9, 0)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(50 * S).throw()
    game.at(51.85 * S).tick() // missed after 1 rock; idle window starts at 51.85 s
    game.at(141.85 * S - 1).tick()
    expect(game.phase).toBe('waiting')
    game.at(141.85 * S).tick()
    expect(game.state.encounter?.fledBecause).toBe('idle')
  })

  test('a new turn resets the idle timer', () => {
    const game = setup(0, 0, 0.1)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(20 * S).turnEnd()
    game.at(80 * S).turnStart() // 70 s idle so far; restarts the window
    game.at(169 * S).tick()
    expect(game.phase).toBe('waiting')
    game.at(170 * S).tick()
    expect(game.state.encounter?.fledBecause).toBe('idle')
  })

  test('an encounter keeps going after the turn ends (0005)', () => {
    const game = setup(0, 0, 0.1, 0.1, 0)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(10.5 * S).turnEnd()
    game.at(30 * S).throw()
    expect(game.at(32.4 * S).tick()).toEqual([{ type: 'caught', modsterId: 'sproutling', tier: 'common' }])
  })

  test('only one encounter at a time, however long the turn runs', () => {
    const game = setup(0, 0, 0.1)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(60 * S).tick()
    game.at(89 * S).tick()
    expect(game.log).toEqual(['appeared sproutling'])
  })

  test('the next countdown starts when the result card ends', () => {
    const game = setup(0, 0, 0.1, 0, 0, 0, 0.1) // caught; next delay 10 s
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).throw()
    game.at(13.4 * S).tick() // caught; card until 17.4 s
    game.at(27.4 * S - 1).tick()
    expect(game.log).toEqual(['appeared sproutling', 'caught sproutling'])
    game.at(27.4 * S).tick()
    expect(game.log.at(-1)).toBe('appeared sproutling')
  })

  test('a late tick runs every timer that came due, in order', () => {
    const game = setup(0, 0, 0.1, 0.1, 0, 0, 0.8)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).throw()
    // The catch clicked at 13.4 s, the card ended at 17.4 s, the next 10 s countdown at 27.4 s
    game.at(60 * S).tick()
    expect(game.log).toEqual(['appeared sproutling', 'caught sproutling', 'appeared mossbeast'])
    expect(game.phase).toBe('appearing')
  })

  test('which Modster appears follows the tier-first pick', () => {
    const game = setup(0, 0, 0.8) // common, then 0.8 ≥ 0.5 → Mossbeast
    game.at(0).turnStart()
    game.at(10 * S).tick()
    expect(game.state.encounter?.modsterId).toBe('mossbeast')
  })

  test('attempts and catch rate come from the resolver (Modster overrides here)', () => {
    const game = setup(0, 0, 0.8, 0.85) // Mossbeast catches at 0.9
    game.at(0).turnStart()
    game.at(10 * S).tick()
    expect([game.state.encounter?.maxAttempts, game.state.encounter?.catchRate]).toEqual([2, 0.9])
    game.at(11 * S).throw()
    game.at(13.4 * S).tick()
    expect(game.state.encounter?.outcome).toBe('caught')
  })

  test('a biome whose Modsters are all missing never spawns', () => {
    const ctx: EncounterContext = { biome, modsters: new Map(), random: scriptedRandom(0), idleTimeoutMs: 90 * S }
    let state = startEncounters(ctx)
    state = stepEncounter(state, { type: 'turnStart', now: 0 }, ctx).state
    expect(stepEncounter(state, { type: 'tick', now: 60 * S }, ctx).state.encounter).toBeUndefined()
  })

  // The player can run (decision 0020)

  test('running while waiting ends the encounter as ran, with the usual card', () => {
    const game = setup(0, 0, 0.1, 0) // the last number is the next delay, drawn when the card ends
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).tick() // waiting
    expect(game.at(20 * S).run()).toEqual([{ type: 'ran', modsterId: 'sproutling', tier: 'common' }])
    expect([game.phase, game.state.encounter?.outcome, game.state.encounter?.attemptsLeft]).toEqual(['result', 'ran', 3])
    game.at(24 * S - 1).tick()
    expect(game.phase).toBe('result')
    game.at(24 * S).tick()
    expect(game.phase).toBe('idle')
  })

  test('after a run, the next countdown starts when the card ends, like any result', () => {
    const game = setup(0, 0, 0.1, 0, 0, 0.1) // next delay 10 s
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).run() // card until 15 s
    game.at(25 * S - 1).tick()
    expect(game.log).toEqual(['appeared sproutling', 'ran sproutling'])
    game.at(25 * S).tick()
    expect(game.log.at(-1)).toBe('appeared sproutling')
  })

  test('runs during appearing or the catch animation are ignored, so a rolled throw still resolves', () => {
    const game = setup(0, 0, 0.1, 0.1)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    expect(game.at(10.5 * S).run()).toEqual([]) // appearing
    game.at(11 * S).throw()
    expect(game.at(11.5 * S).run()).toEqual([]) // the catcher is rocking
    expect(game.at(13.4 * S).tick()).toEqual([{ type: 'caught', modsterId: 'sproutling', tier: 'common' }])
  })

  test('with no encounter, run does nothing', () => {
    const game = setup(0)
    const before = game.state
    game.at(5 * S).run()
    expect(game.state).toBe(before)
  })

  // Background subagents count as work time (decision 0018)

  test('a Modster appears while only a subagent runs', () => {
    const game = setup(0, 0, 0.1)
    game.at(0).agentStart('a1')
    game.at(10 * S - 1).tick()
    expect(game.phase).toBe('idle')
    expect(game.at(10 * S).tick()).toEqual([{ type: 'appeared', modsterId: 'sproutling', tier: 'common' }])
  })

  test('the countdown pauses when the last subagent stops and carries over', () => {
    const game = setup(0, 0, 0.1)
    game.at(0).agentStart('a1')
    game.at(6 * S).agentStop('a1') // 6 s of work
    game.at(100 * S).tick()
    expect(game.phase).toBe('idle')
    game.at(200 * S).turnStart()
    game.at(204 * S - 1).tick()
    expect(game.phase).toBe('idle')
    game.at(204 * S).tick()
    expect(game.phase).toBe('appearing') // 10 s of work
  })

  test('overlapping turns and subagents count once', () => {
    const game = setup(0, 0, 0.1)
    game.at(0).turnStart()
    game.at(1 * S).agentStart('a1')
    game.at(2 * S).agentStart('a2')
    game.at(4 * S).turnEnd()
    game.at(5 * S).agentStop('a1')
    expect(workTime(game.state, 5 * S)).toBe(5 * S)
    // Only a2 runs now; counted twice or three times, it would have spawned already
    game.at(10 * S - 1).tick()
    expect(game.phase).toBe('idle')
    game.at(10 * S).tick()
    expect(game.phase).toBe('appearing')
  })

  test('a subagent with no stop event stops counting after 30 minutes', () => {
    const MIN = 60 * S
    const game = setup(0, 0, 0.1)
    game.at(0).agentStart('lost')
    expect(isWorking(game.state, 30 * MIN - 1)).toBe(true)
    expect(isWorking(game.state, 30 * MIN)).toBe(false)
    // The first tick comes late: by then nothing counts as running, so nothing appears
    game.at(45 * MIN).tick()
    expect(game.phase).toBe('idle')
    expect(workTime(game.state, 45 * MIN)).toBe(30 * MIN)
    expect(game.state.agents).toEqual({})
    // The countdown was already past due, so the next turn brings the Modster at once
    game.at(50 * MIN).turnStart()
    expect(game.phase).toBe('appearing')
  })

  test('a stop for an unknown subagent changes nothing', () => {
    const game = setup(0)
    const before = game.state
    game.at(5 * S).agentStop('never-started')
    expect(game.state).toBe(before)
  })

  test('session end clears every running subagent and the turn', () => {
    const game = setup(0, 0, 0.1)
    game.at(0).turnStart()
    game.at(1 * S).agentStart('a1')
    game.at(5 * S).sessionEnd()
    expect([game.state.turnRunning, game.state.agents]).toEqual([false, {}])
    game.at(60 * S).tick()
    expect(game.phase).toBe('idle')
    expect(workTime(game.state, 60 * S)).toBe(5 * S)
  })

  test('the state is never changed in place', () => {
    const game = setup(0, 0, 0.1)
    game.at(0).turnStart()
    const before = game.state
    const copy = JSON.stringify(before)
    game.at(10 * S).tick()
    expect(JSON.stringify(before)).toBe(copy)
  })
})
