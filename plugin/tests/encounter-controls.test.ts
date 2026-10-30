import { describe, expect, test } from 'claude-code/testing'
import { panelPlace, pips } from '../hooks/encounter-controls'

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

  test('the stack sits a row below centre, the gap kept, the pips going first when short of room (P5-59)', () => {
    // 8 rows: Throw, gap, Run and pips (4) centred start at 2, so at 3
    expect(panelPlace(8, true, true)).toEqual({ top: 3, pips: true })
    // 5 rows: the four of them still fit a row down
    expect(panelPlace(5, true, true)).toEqual({ top: 1, pips: true })
    // 4 rows: with the pips the stack couldn't move, so the pips go and it moves down a row
    expect(panelPlace(4, true, true)).toEqual({ top: 1, pips: false })
    // 3 rows: no room to move at all; the gap stays
    expect(panelPlace(3, true, true)).toEqual({ top: 0, pips: false })
    // While throwing only the pips show, a row below centre
    expect(panelPlace(5, false, true)).toEqual({ top: 3, pips: true })
  })
})
