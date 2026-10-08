import { test, expect } from 'claude-code/testing'
import { FPS_STEPS, nextFrameIndex, periodMs } from '../lib/animation'

test('nextFrameIndex wraps after the last frame', () => {
  expect(nextFrameIndex(0, 4)).toBe(1)
  expect(nextFrameIndex(3, 4)).toBe(0)
})

test('nextFrameIndex stays at 0 for an empty sheet', () => {
  expect(nextFrameIndex(0, 0)).toBe(0)
})

test('periodMs matches the 6 to 12 fps range', () => {
  expect(periodMs(FPS_STEPS[0])).toBe(167)
  expect(periodMs(12)).toBe(83)
})

test('periodMs never drops below 1 ms', () => {
  expect(periodMs(100000)).toBe(1)
})
