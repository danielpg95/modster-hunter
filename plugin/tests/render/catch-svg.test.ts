import { describe, expect, test } from 'claude-code/testing'
import { CATCH, DESKTOP } from '../../hooks/constants'
import type { Catcher, Sprite } from '../../hooks/content'
import { catchBeatAt, type CatchOutcome } from '../../hooks/game'
import { anchoredMotion, modsterPose } from '../../hooks/render/catch-frame'
import { catchLengthMs, catchSvg, prepareCatch, type CatchArt } from '../../hooks/render'
import { catcherFiles } from '../fixtures/catcher-files'
import { encodeFrame } from '../fixtures/encode-frame'
import { validSprite } from '../fixtures/valid-sprite'

// Decision 0043: the desktop plays a throw as one vector SVG whose motion is
// catchFrame's own, sampled every DESKTOP.catchSampleMs. These tests read the
// SVG's SMIL tracks back at a time and compare them with catch-frame's motion.

/** A catcher from `catcherFiles` (jar: contain, lidRows 2; net: cover, rimIndex 2) on `modster`. */
function art(id: 'jar' | 'net', modster: Sprite = validSprite() as unknown as Sprite): CatchArt {
  const files = catcherFiles()
  const catcher = JSON.parse(files[`catchers/${id}/catcher.json`] ?? '{}') as Catcher
  const sprite = JSON.parse(files[`catchers/${id}/sprite.sprite.json`] ?? '{}') as Sprite
  return prepareCatch(catcher, sprite, modster, 6)
}

function svgOf(a: CatchArt, outcome: CatchOutcome, rocks: number): string {
  const svg = catchSvg(a, outcome, rocks, { scale: 1 })
  if (!svg) throw new Error('no svg')
  return svg
}

/** The sample times catchSvg uses, which its tracks hold exactly. */
function sampleTimes(outcome: CatchOutcome, rocks: number): number[] {
  const times: number[] = []
  for (let t = 0; t < catchLengthMs(outcome, rocks); t += DESKTOP.catchSampleMs) times.push(t)
  return times
}

/**
 * The value of `attribute` on the `data-part` group `part`, `ms` into the throw: its
 * plain value, or its animation's (discrete holds, linear blends number by number).
 */
function trackAt(svg: string, part: string, attribute: string, ms: number): string {
  const at = svg.indexOf(`data-part="${part}"`)
  if (at < 0) throw new Error(`no part ${part}`)
  const open = svg.slice(svg.lastIndexOf('<g', at), svg.indexOf('>', at) + 1)
  const plain = new RegExp(`\\s${attribute}="([^"]*)"`).exec(open)?.[1] ?? ''
  let rest = svg.slice(svg.indexOf('>', at) + 1)
  while (rest.startsWith('<animate')) {
    const tag = rest.slice(0, rest.indexOf('/>') + 2)
    rest = rest.slice(tag.length)
    const field = (name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? ''
    if (field('attributeName') !== attribute) continue
    const values = field('values').split(';')
    const keys = field('keyTimes').split(';').map(Number)
    const u = Math.min(1, ms / (parseFloat(field('dur')) * 1000))
    let i = 0
    while (i + 1 < keys.length && (keys[i + 1] ?? 1) <= u) i++
    if (field('calcMode') === 'discrete' || i + 1 >= keys.length) return values[i] ?? ''
    const span = (keys[i + 1] ?? 1) - (keys[i] ?? 0)
    const f = span > 0 ? (u - (keys[i] ?? 0)) / span : 0
    const a = (values[i] ?? '').split(' ').map(Number)
    const b = (values[i + 1] ?? '').split(' ').map(Number)
    return a.map((n, k) => String(+(n + ((b[k] ?? n) - n) * f).toFixed(2))).join(' ')
  }
  // A plain transform reads as "translate(x y)": keep what's inside
  return /\(([^)]*)\)/.exec(plain)?.[1] ?? plain
}

const near = (value: string, expected: number[]) => value.split(' ').map(Number).forEach((n, i) => expect(Math.abs(n - (expected[i] ?? 0)) < 0.01).toBe(true))

describe('catchSvg', () => {
  test('a throw plays once and holds its last frame; only the Modster idle loop repeats', () => {
    for (const [outcome, rocks] of [['caught', 3], ['missed', 1]] as const) {
      const svg = svgOf(art('jar'), outcome, rocks)
      const animations = svg.match(/<animate[^>]*\/>/g) ?? []
      expect(animations.length).toBeGreaterThan(0)
      for (const tag of animations) {
        if (tag.includes('repeatCount="indefinite"')) continue
        expect(tag).toContain(`dur="${catchLengthMs(outcome, rocks) / 1000}s"`)
        expect(tag).toContain('fill="freeze"')
      }
    }
  })

  test('the Modster shows exactly while catchFrame poses it, at every sample', () => {
    const a = art('jar')
    for (const [outcome, rocks] of [['caught', 3], ['missed', 1]] as const) {
      const svg = svgOf(a, outcome, rocks)
      for (const ms of sampleTimes(outcome, rocks)) {
        const at = catchBeatAt(ms, outcome, rocks)
        const pose = modsterPose(a, a.beats[at.beat], at)
        // 1 ms in: keyTimes are rounded to 4 places, and a sample's value holds until the next
        expect(trackAt(svg, 'modster', 'display', ms + 1)).toBe(pose && pose.scale > 0.02 ? 'inline' : 'none')
      }
    }
  })

  test('the catcher moves as catchFrame moves it: in from the left, then at rest at the bottom center', () => {
    const a = art('jar')
    const svg = svgOf(a, 'caught', 3)
    for (const ms of sampleTimes('caught', 3)) {
      const at = catchBeatAt(ms, 'caught', 3)
      const motion = anchoredMotion(a, a.beats[at.beat], at)
      near(trackAt(svg, 'catcher-move', 'transform', ms), [motion.x, motion.y])
    }
    expect(Number(trackAt(svg, 'catcher-move', 'transform', 0).split(' ')[0])).toBeLessThan(0)
  })

  test('the lid lifts on its own by lidLiftPx while the Modster goes in', () => {
    const svg = svgOf(art('jar'), 'caught', 3)
    // The take starts at 350 ms and lifts the lid fully a third of the way in
    near(trackAt(svg, 'lid', 'transform', CATCH.beatMs.throw + CATCH.beatMs.take / 2), [0, -CATCH.lidLiftPx])
    near(trackAt(svg, 'lid', 'transform', 0), [0, 0])
  })

  test('the white flash going in is a color matrix the filter animates', () => {
    const svg = svgOf(art('jar'), 'caught', 3)
    expect(svg).toContain('<filter id="mt"')
    expect(svg).toContain('<animate attributeName="values"')
  })

  test('cover: the rim is a ring, so the gaps in the tile show the Modster through', () => {
    const svg = svgOf(art('net'), 'missed', 1)
    expect(svg).toMatch(/<path fill="#6e4f2c" fill-rule="evenodd"/)
    expect(svg).toContain('<pattern id="tile"')
    expect(svg).toContain('fill="url(#tile)"')
    // A break tears it into two halves
    expect(svg).toContain('url(#tear-l)')
    expect(svg).toContain('url(#tear-r)')
  })

  test('sparkles show only during the caught beat, and a miss has none', () => {
    const svg = svgOf(art('jar'), 'caught', 3)
    const caughtAt = catchLengthMs('caught', 3) - CATCH.beatMs.caught
    expect(trackAt(svg, 'sparkles', 'display', caughtAt - 100)).toBe('none')
    expect(trackAt(svg, 'sparkles', 'display', caughtAt + 100)).toBe('inline')
    expect(svgOf(art('jar'), 'missed', 1)).not.toContain('data-part="sparkles"')
  })

  test('a worst-case Modster (48×32, 24 colors, 4 busy frames) stays under the Svg limit with either style', () => {
    const palette = ['#00000000', ...Array.from({ length: 24 }, (_, i) => `#${(i * 10 + 20).toString(16).padStart(2, '0')}${(240 - i * 9).toString(16).padStart(2, '0')}80ff`)]
    const frame = (f: number) => encodeFrame(Array.from({ length: 48 * 32 }, (_, i) => (((i % 48) * 7 + Math.floor(i / 48) * 13 + f * 5) % 24) + 1))
    const busy = { schemaVersion: 1, width: 48, height: 32, palette, frames: [0, 1, 2, 3].map(frame) } as unknown as Sprite
    for (const id of ['jar', 'net'] as const) {
      const svg = catchSvg(art(id, busy), 'caught', 3, { scale: 1, maxChars: Infinity }) ?? ''
      expect(svg.length).toBeLessThan(DESKTOP.svgMaxChars)
    }
  })

  test('with loopPauseMs it plays, holds its end for the pause, and starts over', () => {
    const svg = catchSvg(art('jar'), 'caught', 3, { scale: 1, loopPauseMs: CATCH.previewPauseMs }) ?? ''
    const loopMs = catchLengthMs('caught', 3) + CATCH.previewPauseMs
    for (const tag of svg.match(/<animate[^>]*\/>/g) ?? []) {
      expect(tag).toContain('repeatCount="indefinite"')
      expect(tag).not.toContain('fill="freeze"')
      if (!tag.includes('attributeName="visibility"')) expect(tag).toContain(`dur="${loopMs / 1000}s"`)
    }
    // The pause holds the last frame: sparkles gone, the Modster still inside
    expect(trackAt(svg, 'modster', 'display', loopMs - 100)).toBe('none')
    expect(trackAt(svg, 'modster', 'display', 1)).toBe('inline')
  })

  test('over maxChars there is no Svg (0043 point 8)', () => {
    expect(catchSvg(art('jar'), 'caught', 3, { scale: 1, maxChars: 100 })).toBeUndefined()
  })
})
