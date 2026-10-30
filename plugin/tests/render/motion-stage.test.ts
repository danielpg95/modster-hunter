import { describe, expect, test } from 'claude-code/testing'
import { ARRIVAL, BUTTONS_AFTER_MS, departure, motionStage } from '../../hooks/render'

// Decision 0051: the arrival plays as one Svg, then the Modster is up until the departure, which plays as another.

describe('motionStage', () => {
  test('the arrival takes about 2.1 s in the order set: flash, slide, silhouette, sprite, tag', () => {
    expect(ARRIVAL).toEqual({ slideAt: 0.4, silhouetteAt: 0.85, spriteAt: 1.6, tagAt: 1.85, endS: 2.1 })
    expect(BUTTONS_AFTER_MS).toBe(850)
  })

  test('a catch leaves as its catcher fades, then slides back; any other departure reverses the arrival first (0053)', () => {
    expect(departure(true)).toEqual({ slideAt: 0.25, endS: 0.7 })
    expect(departure(false)).toEqual({ slideAt: 1, endS: 1.45 })
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
    const caught = { appearedAt: 0, departAt: 10_000, caught: true }
    expect(motionStage(caught, 9_999)).toBe('up')
    expect(motionStage(caught, 10_000)).toBe('leave')
    expect(motionStage(caught, 10_699)).toBe('leave')
    expect(motionStage(caught, 10_700)).toBe('gone')
    const fled = { appearedAt: 0, departAt: 10_000 }
    expect(motionStage(fled, 11_449)).toBe('leave')
    expect(motionStage(fled, 11_450)).toBe('gone')
  })

  test('running during the arrival starts the departure at once', () => {
    expect(motionStage({ appearedAt: 0, departAt: 500 }, 600)).toBe('leave')
  })
})
