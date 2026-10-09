import { describe, expect, test } from 'claude-code/testing'
import type { Biome, Modster } from '../../hooks/content'
import { startEncounters, stepEncounter, type EncounterContext, type EncounterInput, type EncounterState } from '../../hooks/game'
import { modsterNamed } from '../fixtures/modster-named'
import { scriptedRandom } from '../fixtures/scripted-random'

// Time is a fake clock: every input carries `now` in ms, and nothing reads real time.
const S = 1000

// Sproutling 75% (common: 3 throws, 0.5 per throw), Mossbeast 25% (common too: 25 ≥ 20%)
const biome: Biome = {
  schemaVersion: 1,
  id: 'whispering-forest',
  name: 'Whispering Forest',
  encounterEverySec: [10, 30],
  modsters: [
    { id: 'sproutling', weight: 75 },
    { id: 'mossbeast', weight: 25 },
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
      tick: () => send({ type: 'tick', now }),
      throw: () => send({ type: 'throw', now }),
    }),
    get state() {
      return state
    },
    get phase() {
      return state.encounter?.phase ?? 'idle'
    },
  }
}

// Random draws, in order: [first spawn delay], then per encounter [which Modster], [one per throw], [next spawn delay]
// Delay r → 10 + r × 20 s. Modster r < 0.75 → Sproutling.

describe('encounter machine', () => {
  test('nothing spawns while no turn runs', () => {
    const game = setup(0)
    game.at(60 * S).tick()
    expect(game.phase).toBe('idle')
  })

  test('a Modster appears once the turn has run for the drawn delay', () => {
    const game = setup(0, 0.1)
    game.at(0).turnStart()
    game.at(10 * S - 1).tick()
    expect(game.phase).toBe('idle')
    expect(game.at(10 * S).tick()).toEqual([{ type: 'appeared', modsterId: 'sproutling', tier: 'common' }])
    expect(game.phase).toBe('appearing')
    expect(game.state.encounter?.attemptsLeft).toBe(3)
  })

  test('the delay is drawn from the biome encounterEverySec range', () => {
    const game = setup(1, 0.1) // r = 1 → 30 s
    game.at(0).turnStart()
    game.at(30 * S - 1).tick()
    expect(game.phase).toBe('idle')
    game.at(30 * S).tick()
    expect(game.phase).toBe('appearing')
  })

  test('the countdown pauses between turns and carries over (0014)', () => {
    const game = setup(0, 0.1)
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
    const game = setup(0, 0.1)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S - 1).tick()
    expect(game.phase).toBe('appearing')
    game.at(11 * S).tick()
    expect(game.phase).toBe('waiting')
  })

  test('a throw that lands: wobble for 1.5 s, then caught, then the card for 4 s', () => {
    const game = setup(0, 0.1, 0.49, 0) // 0.49 < 0.5 lands
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).throw()
    expect(game.phase).toBe('throwing')
    expect(game.state.encounter?.attemptsLeft).toBe(2)
    game.at(12.5 * S - 1).tick()
    expect(game.phase).toBe('throwing')
    expect(game.at(12.5 * S).tick()).toEqual([{ type: 'caught', modsterId: 'sproutling', tier: 'common' }])
    expect([game.phase, game.state.encounter?.outcome]).toEqual(['result', 'caught'])
    game.at(16.5 * S - 1).tick()
    expect(game.phase).toBe('result')
    game.at(16.5 * S).tick()
    expect(game.phase).toBe('idle')
  })

  test('a throw that misses goes back to waiting with one attempt fewer', () => {
    const game = setup(0, 0.1, 0.5) // 0.5 is not < 0.5: miss
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).throw()
    expect(game.at(12.5 * S).tick()).toEqual([{ type: 'missed', modsterId: 'sproutling', attemptsLeft: 2 }])
    expect(game.phase).toBe('waiting')
  })

  test('missing every attempt makes it flee', () => {
    const game = setup(0, 0.1, 0.9, 0.9, 0.9, 0)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    for (const t of [11, 13, 15]) {
      game.at(t * S).throw()
      game.at((t + 1.5) * S).tick()
    }
    expect(game.log).toEqual(['appeared sproutling', 'missed sproutling', 'missed sproutling', 'fled sproutling'])
    expect([game.phase, game.state.encounter?.outcome, game.state.encounter?.fledBecause]).toEqual(['result', 'fled', 'attempts'])
  })

  test('throws during appearing or the wobble are ignored and cost nothing (0014)', () => {
    const game = setup(0, 0.1, 0.9)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(10.5 * S).throw() // appearing
    expect([game.phase, game.state.encounter?.attemptsLeft]).toEqual(['appearing', 3])
    game.at(11 * S).throw()
    game.at(11.5 * S).throw() // wobbling
    expect([game.phase, game.state.encounter?.attemptsLeft]).toEqual(['throwing', 2])
  })

  test('an idle encounter wanders off after the timeout, counted as fled', () => {
    const game = setup(0, 0.1, 0)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(100 * S - 1).tick()
    expect(game.phase).toBe('waiting')
    expect(game.at(100 * S).tick()).toEqual([{ type: 'fled', modsterId: 'sproutling', tier: 'common', because: 'idle' }])
    expect(game.state.encounter?.fledBecause).toBe('idle')
  })

  test('the idle timer restarts after each throw', () => {
    const game = setup(0, 0.1, 0.9)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(50 * S).throw()
    game.at(51.5 * S).tick() // missed; idle window starts at 51.5 s
    game.at(141.5 * S - 1).tick()
    expect(game.phase).toBe('waiting')
    game.at(141.5 * S).tick()
    expect(game.state.encounter?.fledBecause).toBe('idle')
  })

  test('a new turn resets the idle timer', () => {
    const game = setup(0, 0.1)
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
    const game = setup(0, 0.1, 0.1, 0)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(10.5 * S).turnEnd()
    game.at(30 * S).throw()
    expect(game.at(31.5 * S).tick()).toEqual([{ type: 'caught', modsterId: 'sproutling', tier: 'common' }])
  })

  test('only one encounter at a time, however long the turn runs', () => {
    const game = setup(0, 0.1)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(60 * S).tick()
    game.at(89 * S).tick()
    expect(game.log).toEqual(['appeared sproutling'])
  })

  test('the next countdown starts when the result card ends', () => {
    const game = setup(0, 0.1, 0, 0, 0.1) // caught; next delay 10 s
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).throw()
    game.at(12.5 * S).tick() // caught; card until 16.5 s
    game.at(26.5 * S - 1).tick()
    expect(game.log).toEqual(['appeared sproutling', 'caught sproutling'])
    game.at(26.5 * S).tick()
    expect(game.log.at(-1)).toBe('appeared sproutling')
  })

  test('a late tick runs every timer that came due, in order', () => {
    const game = setup(0, 0.1, 0.1, 0, 0.8)
    game.at(0).turnStart()
    game.at(10 * S).tick()
    game.at(11 * S).throw()
    // Wobble ended at 12.5 s, the card at 16.5 s, the next 10 s countdown at 26.5 s
    game.at(60 * S).tick()
    expect(game.log).toEqual(['appeared sproutling', 'caught sproutling', 'appeared mossbeast'])
    expect(game.phase).toBe('appearing')
  })

  test('which Modster appears follows the weights', () => {
    const game = setup(0, 0.8) // 0.8 ≥ 0.75 → Mossbeast
    game.at(0).turnStart()
    game.at(10 * S).tick()
    expect(game.state.encounter?.modsterId).toBe('mossbeast')
  })

  test('attempts and catch rate come from the resolver (Modster overrides here)', () => {
    const game = setup(0, 0.8, 0.85) // Mossbeast catches at 0.9
    game.at(0).turnStart()
    game.at(10 * S).tick()
    expect([game.state.encounter?.maxAttempts, game.state.encounter?.catchRate]).toEqual([2, 0.9])
    game.at(11 * S).throw()
    game.at(12.5 * S).tick()
    expect(game.state.encounter?.outcome).toBe('caught')
  })

  test('a biome whose Modsters are all missing never spawns', () => {
    const ctx: EncounterContext = { biome, modsters: new Map(), random: scriptedRandom(0), idleTimeoutMs: 90 * S }
    let state = startEncounters(ctx)
    state = stepEncounter(state, { type: 'turnStart', now: 0 }, ctx).state
    expect(stepEncounter(state, { type: 'tick', now: 60 * S }, ctx).state.encounter).toBeUndefined()
  })

  test('the state is never changed in place', () => {
    const game = setup(0, 0.1)
    game.at(0).turnStart()
    const before = game.state
    const copy = JSON.stringify(before)
    game.at(10 * S).tick()
    expect(JSON.stringify(before)).toBe(copy)
  })
})
