import { describe, expect, test } from 'claude-code/testing'
import { deflate } from '../../hooks/vendor/deflate'
import { inflate } from '../../hooks/vendor/inflate'

/** Deterministic bytes: a small LCG, `range` values wide. */
function noise(length: number, range = 256, seed = 7): Uint8Array {
  const out = new Uint8Array(length)
  let state = seed
  for (let i = 0; i < length; i++) {
    state = (state * 1103515245 + 12345) >>> 0
    out[i] = (state >>> 16) % range
  }
  return out
}

const roundTrip = (data: Uint8Array): number[] => [...inflate(deflate(data), data.length + 1)]

describe('deflate', () => {
  test('empty input inflates back to nothing', () => {
    expect(roundTrip(new Uint8Array(0))).toEqual([])
  })

  test('one byte, and one byte repeated past the longest match, come back as they were', () => {
    expect(roundTrip(Uint8Array.of(42))).toEqual([42])
    const run = new Uint8Array(1000).fill(9)
    expect(roundTrip(run)).toEqual([...run])
  })

  test('noise and repeated noise come back as they were', () => {
    const random = noise(5000)
    expect(roundTrip(random)).toEqual([...random])
    const repeated = new Uint8Array(40000)
    for (let at = 0; at < repeated.length; at += 997) repeated.set(noise(997, 64).subarray(0, repeated.length - at), at)
    expect(roundTrip(repeated)).toEqual([...repeated])
  })

  test('a long input with matches far back, past the window, comes back as it was', () => {
    const data = noise(80000, 4, 3)
    expect(roundTrip(data)).toEqual([...data])
  })

  test('repetitive data shrinks', () => {
    const rows = new Uint8Array(129 * 128)
    for (let y = 0; y < 128; y++) rows.set(noise(128, 8, y % 4), y * 129 + 1)
    expect(deflate(rows).length).toBeLessThan(rows.length / 4)
  })
})
