import { describe, expect, test } from 'claude-code/testing'
import { pickWeighted } from '../../hooks/game'

const items = [{ id: 'a', weight: 3 }, { id: 'b', weight: 1 }]
const always = (value: number) => () => value

describe('pickWeighted', () => {
  test('each item gets a slice of the range the size of its weight', () => {
    expect([0, 0.74, 0.75, 0.99].map((r) => pickWeighted(items, always(r))?.id)).toEqual(['a', 'a', 'b', 'b'])
  })

  test('items with no weight are never picked', () => {
    expect(pickWeighted([{ id: 'a', weight: 0 }, { id: 'b', weight: 1 }], always(0))?.id).toBe('b')
  })

  test('nothing to pick from gives undefined', () => {
    expect(pickWeighted([], always(0.5))).toBeUndefined()
    expect(pickWeighted([{ id: 'a', weight: 0 }], always(0.5))).toBeUndefined()
  })

  test('a source returning exactly 1 picks the last item', () => {
    expect(pickWeighted(items, always(1))?.id).toBe('b')
  })
})
