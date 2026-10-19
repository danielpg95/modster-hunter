import { describe, expect, test } from 'claude-code/testing'
import { catcherInUse, catcherPref, readCatcherId } from '../../hooks/store'

describe('catcher pref', () => {
  test('a stored pick reads back as its id', () => {
    expect(readCatcherId(catcherPref('net'))).toBe('net')
  })

  test('anything unreadable counts as no pick', () => {
    for (const raw of [undefined, null, 'net', 3, {}, { v: 2, id: 'net' }, { v: 1 }, { v: 1, id: 7 }]) expect(readCatcherId(raw)).toBe(undefined)
  })

  test('the picked catcher plays when it loaded, else the default, else none (decision 0035 point 10)', () => {
    const catchers = new Map([
      ['jar', 'Glass jar'],
      ['net', 'Net'],
    ])
    expect(catcherInUse(catchers, 'net', 'jar')).toBe('Net')
    expect(catcherInUse(catchers, 'bubble', 'jar')).toBe('Glass jar')
    expect(catcherInUse(catchers, undefined, 'jar')).toBe('Glass jar')
    expect(catcherInUse(new Map([['net', 'Net']]), undefined, 'jar')).toBe(undefined)
  })
})
