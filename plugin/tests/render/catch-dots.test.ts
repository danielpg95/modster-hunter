import { describe, expect, test } from 'claude-code/testing'
import { catchDots } from '../../hooks/render'

// Beat starts (decision 0035 point 5): rocks from 0.9 s, 0.5 s each
describe('catchDots', () => {
  test('empty while the catcher flies in, then one dot per rock', () => {
    expect([0, 500, 899].map((ms) => catchDots('caught', 3, ms))).toEqual(['○ ○ ○', '○ ○ ○', '○ ○ ○'])
    expect([900, 1400, 1900].map((ms) => catchDots('caught', 3, ms))).toEqual(['● ○ ○', '● ● ○', '● ● ●'])
  })

  test('a catch clicks after the third rock (0035 point 7)', () => {
    expect(catchDots('caught', 3, 2400)).toBe('● ● ● click!')
    expect(catchDots('caught', 3, 9_000)).toBe('● ● ● click!')
  })

  test('a miss marks where it broke free, after one or two rocks', () => {
    expect(catchDots('missed', 1, 1400)).toBe('● ✕ ○ broke free!')
    expect(catchDots('missed', 2, 1900)).toBe('● ● ✕ broke free!')
  })

  test('every stage keeps the dots at the same width', () => {
    const widths = new Set([0, 1000, 1500, 2000].map((ms) => catchDots('caught', 3, ms).length))
    expect(widths.size).toBe(1)
  })
})
