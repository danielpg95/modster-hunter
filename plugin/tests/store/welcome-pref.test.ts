import { describe, expect, test } from 'claude-code/testing'
import { WELCOMED_KEY, hasPlayed, readWelcomed, welcomedPref } from '../../hooks/store'

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

  test('a catch or a stats record means the player already played (point 2)', () => {
    expect(hasPlayed(['caught:sproutling'])).toBe(true)
    expect(hasPlayed(['prefs:catcher', 'stats:total'])).toBe(true)
    expect(hasPlayed(['stats:s1'])).toBe(true)
  })

  test('prefs alone, or nothing, means a new player', () => {
    expect(hasPlayed([])).toBe(false)
    expect(hasPlayed(['prefs:catcher', 'prefs:huntPane', 'prefs:welcomed'])).toBe(false)
  })
})
