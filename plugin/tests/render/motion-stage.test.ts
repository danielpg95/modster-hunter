import { describe, expect, test } from 'claude-code/testing'
import { ARRIVAL, BUTTONS_AFTER_MS, DEPARTURE_S, motionStage } from '../../hooks/render'

// Decision 0051: the arrival plays as one Svg, then the Modster is up until the departure, which plays as another.

describe('motionStage', () => {
  test('the arrival takes about 2.1 s in the order set: flash, slide, silhouette, sprite, tag', () => {
    expect(ARRIVAL).toEqual({ slideAt: 0.4, silhouetteAt: 0.85, spriteAt: 1.6, tagAt: 1.85, endS: 2.1 })
    expect(DEPARTURE_S).toBe(0.85)
    expect(BUTTONS_AFTER_MS).toBe(850)
  })

  test('a Modster that just appeared arrives, then is up', () => {
    expect(motionStage({ appearedAt: 1000 }, 1000)).toBe('arrive')
    expect(motionStage({ appearedAt: 1000 }, 3099)).toBe('arrive')
    expect(motionStage({ appearedAt: 1000 }, 3100)).toBe('up')
  })

  test('a Modster up before this load skips the arrival', () => {
    expect(motionStage({}, 5)).toBe('up')
  })

  test('the departure starts at its time, then the scene is gone back to still', () => {
    const times = { appearedAt: 0, departAt: 10_000 }
    expect(motionStage(times, 9_999)).toBe('up')
    expect(motionStage(times, 10_000)).toBe('leave')
    expect(motionStage(times, 10_849)).toBe('leave')
    expect(motionStage(times, 10_850)).toBe('gone')
  })

  test('running during the arrival starts the departure at once', () => {
    expect(motionStage({ appearedAt: 0, departAt: 500 }, 600)).toBe('leave')
  })
})
