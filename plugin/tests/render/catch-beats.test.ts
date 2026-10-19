import { describe, expect, test } from 'claude-code/testing'
import type { Catcher } from '../../hooks/content'
import { resolveBeats } from '../../hooks/render'

const catcher = (style: Catcher['style'], beats?: Catcher['beats']): Catcher => ({
  schemaVersion: 1,
  id: 'jar',
  name: 'Jar',
  style,
  sprite: { file: 'sprite.sprite.json' },
  ...(beats ? { beats } : {}),
})

describe('resolveBeats', () => {
  test('contain: anchored over the Modster, which goes in, hides, and pops out on a break (CONTENT_FORMAT "Styles")', () => {
    const beats = resolveBeats(catcher('contain'))
    expect(Object.values(beats).map((beat) => [beat.place, beat.modster])).toEqual([
      ['over', 'visible'],
      ['over', 'shrink-in'],
      ['over', 'hidden'],
      ['over', 'hidden'],
      ['over', 'hidden'],
      ['over', 'pop-out'],
    ])
    expect(beats.throw.path).toBe('arc')
    // Frames are made from frame 0
    expect(Object.values(beats).every((beat) => beat.frames === undefined)).toBe(true)
  })

  test('cover: stretched over a Modster that stays, shakes, shrinks or hops out', () => {
    const beats = resolveBeats(catcher('cover'))
    expect(Object.values(beats).map((beat) => [beat.place, beat.modster])).toEqual([
      ['stretch', 'visible'],
      ['stretch', 'visible'],
      ['stretch', 'visible'],
      ['stretch', 'shake'],
      ['stretch', 'shrink'],
      ['stretch', 'hop-out'],
    ])
  })

  test('a preset beat the file gives keeps the preset for the fields it leaves out', () => {
    const beats = resolveBeats(catcher('contain', { rock: { frames: [1, 0, 2, 0] }, throw: { path: 'drop' } }))
    expect(beats.rock).toEqual({ frames: [1, 0, 2, 0], place: 'over', modster: 'hidden', path: 'arc' })
    expect(beats.throw.path).toBe('drop')
    expect(beats.take.frames).toBe(undefined)
  })

  test('custom has no preset: frames default to [0], place to over, path to arc', () => {
    const beats = resolveBeats(
      catcher('custom', {
        throw: { modster: 'visible' },
        take: { modster: 'dim', place: 'behind', frames: [1] },
        settle: { modster: 'dim' },
        rock: { modster: 'shake' },
        caught: { modster: 'shrink' },
        broken: { modster: 'hop-out' },
      }),
    )
    expect(beats.throw).toEqual({ frames: [0], place: 'over', modster: 'visible', path: 'arc' })
    expect(beats.take).toEqual({ frames: [1], place: 'behind', modster: 'dim', path: 'arc' })
  })
})
