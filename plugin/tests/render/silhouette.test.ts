import { describe, expect, test } from 'claude-code/testing'
import type { Sprite } from '../../hooks/content'
import { silhouettePalette } from '../../hooks/render'

// P3-02: an uncaught Modster's shape in one gray, transparency kept.

describe('silhouette', () => {
  test('every color turns gray and keeps its alpha', () => {
    const sprite = { palette: ['#00000000', '#2e7d32ff', '#a5d6a780', '#123456'] } as Sprite
    expect(silhouettePalette(sprite, '#5a5a5a')).toEqual(['#5a5a5a00', '#5a5a5aff', '#5a5a5a80', '#5a5a5aff'])
  })
})
