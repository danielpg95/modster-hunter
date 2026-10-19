import { describe, expect, test } from 'claude-code/testing'
import { catchBeatAt, throwingMs } from '../../hooks/game'

describe('catch timeline', () => {
  test('a catch clicks at 2.4 s; a miss ends after 1.85 s or 2.35 s (decision 0035 point 6)', () => {
    expect(throwingMs('caught', 3)).toBe(2400)
    expect(throwingMs('missed', 1)).toBe(1850)
    expect(throwingMs('missed', 2)).toBe(2350)
  })

  test('beats follow throw 0.35 s, take 0.4 s, settle 0.15 s, then 0.5 s per rock (0035 point 5)', () => {
    const beat = (ms: number) => catchBeatAt(ms, 'caught', 3).beat
    expect([0, 349, 350, 749, 750, 899, 900, 2399, 2400].map(beat)).toEqual([
      'throw', 'throw', 'take', 'take', 'settle', 'settle', 'rock', 'rock', 'caught',
    ])
  })

  test('rocks are numbered from 0, with progress through each', () => {
    expect(catchBeatAt(900, 'caught', 3)).toEqual({ beat: 'rock', rock: 0, progress: 0, elapsedMs: 0 })
    expect(catchBeatAt(1650, 'caught', 3)).toEqual({ beat: 'rock', rock: 1, progress: 0.5, elapsedMs: 250 })
    expect(catchBeatAt(2150, 'caught', 3).rock).toBe(2)
  })

  test('a miss breaks after its rocks, and a catch plays caught', () => {
    expect(catchBeatAt(1400, 'missed', 1).beat).toBe('broken')
    expect(catchBeatAt(1400, 'missed', 2).beat).toBe('rock')
    expect(catchBeatAt(1900, 'missed', 2).beat).toBe('broken')
    expect(catchBeatAt(2400, 'caught', 3)).toEqual({ beat: 'caught', rock: 0, progress: 0, elapsedMs: 0 })
  })

  test('past the end the last beat holds at progress 1, and negative time is the start', () => {
    expect(catchBeatAt(10_000, 'caught', 3)).toEqual({ beat: 'caught', rock: 0, progress: 1, elapsedMs: 700 })
    expect(catchBeatAt(10_000, 'missed', 1)).toEqual({ beat: 'broken', rock: 0, progress: 1, elapsedMs: 450 })
    expect(catchBeatAt(-5, 'caught', 3)).toEqual({ beat: 'throw', rock: 0, progress: 0, elapsedMs: 0 })
  })
})
