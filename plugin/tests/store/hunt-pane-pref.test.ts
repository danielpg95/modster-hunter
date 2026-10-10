import { describe, expect, test } from 'claude-code/testing'
import { HUNT_PANE_KEY, huntPanePref, prefAfterClose, readHuntPaneOpen } from '../../hooks/store'

describe('hunt pane pref (0019)', () => {
  test('is stored under prefs:huntPane as { v: 1, open }', () => {
    expect(HUNT_PANE_KEY).toBe('prefs:huntPane')
    expect(huntPanePref(true)).toEqual({ v: 1, open: true })
    expect(huntPanePref(false)).toEqual({ v: 1, open: false })
  })

  test('reads open only from a v1 value with open true', () => {
    expect(readHuntPaneOpen(huntPanePref(true))).toBe(true)
    expect(readHuntPaneOpen(huntPanePref(false))).toBe(false)
  })

  test('a missing or unreadable value means closed', () => {
    for (const raw of [undefined, null, 'open', 1, {}, { open: true }, { v: 2, open: true }, { v: 1, open: 'yes' }]) {
      expect(readHuntPaneOpen(raw)).toBe(false)
    }
  })

  test('only a close by hand stores open: false; a close by the mod or an unload changes nothing', () => {
    expect(prefAfterClose('person')).toEqual({ v: 1, open: false })
    expect(prefAfterClose('plugin')).toBeUndefined()
    expect(prefAfterClose('unload')).toBeUndefined()
  })
})
