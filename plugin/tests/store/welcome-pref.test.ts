import { describe, expect, test } from 'claude-code/testing'
import { WELCOMED_KEY, readWelcomed, welcomedPref } from '../../hooks/store'

describe('welcome pref (0038)', () => {
  test('is stored under prefs:welcomed as { v: 1 }', () => {
    expect(WELCOMED_KEY).toBe('prefs:welcomed')
    expect(welcomedPref()).toEqual({ v: 1 })
    expect(readWelcomed(welcomedPref())).toBe(true)
  })

  test('a missing or unreadable value means not welcomed yet', () => {
    for (const raw of [undefined, null, 'yes', 1, true, {}, { v: 2 }, { v: '1' }]) {
      expect(readWelcomed(raw)).toBe(false)
    }
  })
})
