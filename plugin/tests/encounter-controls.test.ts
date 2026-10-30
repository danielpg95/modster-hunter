import { describe, expect, test } from 'claude-code/testing'
import { pips } from '../hooks/encounter-controls'

// Decision 0051 point 3: the throws left show as pips under Throw and Run.

describe('encounterControls', () => {
  test('a filled pip per throw left, an empty one per throw used', () => {
    expect(pips(3, 3)).toBe('● ● ●')
    expect(pips(1, 3)).toBe('● ○ ○')
    expect(pips(0, 2)).toBe('○ ○')
  })

  test('never fewer pips than throws left', () => {
    expect(pips(4, 3)).toBe('● ● ● ●')
  })
})
