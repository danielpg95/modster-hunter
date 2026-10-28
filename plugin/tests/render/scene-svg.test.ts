import { describe, expect, test } from 'claude-code/testing'
import { DESKTOP, SCENE } from '../../hooks/constants'
import type { Biome, Sprite } from '../../hooks/content'
import { idleScene, particlePixel, sceneSvg, sceneSvgSize, type Particle } from '../../hooks/render'
import { encodeFrame } from '../fixtures/encode-frame'

// Decision 0044: on desktop a biome's idle scene is one vector SVG, the art tiled by a
// pattern and each particle a square moved by SMIL with idle-scene's own motion.

/** An 8×8 background (4 rows), two frames. */
const background: Sprite = {
  schemaVersion: 1,
  width: 8,
  height: 8,
  palette: ['#00000000', '#ff0000ff', '#00ff00ff'],
  frames: [encodeFrame(new Array(64).fill(1)), encodeFrame(new Array(64).fill(2))],
}

const scene = (style: 'sand' | 'sparkle' | 'bubble' | 'leaf' | 'snow', art = true) => {
  const made = idleScene({ particles: { style, color: '#ffffff' } } as Pick<Biome, 'accentColor' | 'backgroundFps' | 'particles'>, art ? background : undefined)
  if (!made) throw new Error('no scene')
  return made
}

const one: Particle[] = [{ x: 0.5, y: 0.25, phase: 0 }]

function svgOf(style: Parameters<typeof scene>[0], moving: boolean, art = true): string {
  const svg = sceneSvg(scene(style, art), one, { width: 40, scale: 2, moving })
  if (!svg) throw new Error('no svg')
  return svg
}

describe('sceneSvg', () => {
  test('sceneSvgSize: columnPx per pixel across bodyColumns × columnPx, smaller so the strip and a line fit maxRows × rowPx', () => {
    const s = scene('sand')
    expect(sceneSvgSize(s, 120)).toEqual({ width: 120, scale: DESKTOP.columnPx })
    // 2 rows leave one row of rowPx for the 8 px strip
    const tight = Math.floor(DESKTOP.rowPx / 8)
    expect(sceneSvgSize(s, 120, 2)).toEqual({ width: Math.ceil((120 * DESKTOP.columnPx) / tight), scale: tight })
    // One row is the line alone
    expect(sceneSvgSize(s, 120, 1)).toBeUndefined()
  })

  test('still: frame 0 of the art, and each particle where the terminal draws it at tick 0, with nothing animated', () => {
    const svg = svgOf('sand', false)
    expect(svg).not.toContain('<animate')
    expect(svg).toContain('#ff0000')
    expect(svg).not.toContain('#00ff00')
    const at = particlePixel(one[0]!, 'sand', 0, 40, 8)
    expect(svg).toContain(`<rect fill="#ffffff" x="${at?.x}" y="${at?.y}" width="1" height="1"/>`)
  })

  test('moving: the art loops its frames, tiled across the strip by a pattern', () => {
    const svg = svgOf('sand', true)
    expect(svg).toContain('<pattern id="bg" patternUnits="userSpaceOnUse" width="8" height="8">')
    expect(svg).toContain('<rect width="40" height="8" fill="url(#bg)"/>')
    expect(svg).toContain('#00ff00')
    expect(svg).toContain('repeatCount="indefinite"')
  })

  test('a drifting particle crosses one strip width at its speed, with a copy one strip behind so it wraps', () => {
    const svg = svgOf('sand', true)
    const seconds = 40 / SCENE.motion.sand.dx / SCENE.particleFps
    expect(svg).toContain(`values="0 0;40 0" dur="${+seconds.toFixed(3)}s" repeatCount="indefinite"`)
    expect(svg).toContain('<rect fill="#ffffff" x="-40" y="0" width="1" height="1"/>')
  })

  test('bubbles rise one strip height and wrap from below; leaves sway as well as drift', () => {
    const bubble = svgOf('bubble', true)
    expect(bubble).toContain('values="0 0;0 -8"')
    expect(bubble).toContain('<rect fill="#ffffff" x="0" y="8" width="1" height="1"/>')
    const leaf = svgOf('leaf', true)
    // Sway is sampled over one period of its sine: swaySamples + 1 values
    const moves = [...leaf.matchAll(/<animateTransform [^>]*values="([^"]*)"/g)].map((m) => (m[1] ?? '').split(';'))
    expect(moves.map((values) => values.length).sort((a, b) => a - b)).toEqual([2, 2, DESKTOP.swaySamples + 1])
  })

  test("a sparkle twinkles: on for sparkleTicks.on ticks out of every period, and doesn't move", () => {
    const svg = svgOf('sparkle', true)
    const values = /attributeName="display" values="([^"]*)"/.exec(svg)?.[1]?.split(';') ?? []
    expect(values).toHaveLength(SCENE.sparkleTicks.period)
    expect(values.filter((v) => v === 'inline')).toHaveLength(SCENE.sparkleTicks.on)
    expect(svg).not.toContain('animateTransform')
  })

  test('a particle-only biome is a transparent strip particleOnlyRows tall', () => {
    const svg = svgOf('snow', true, false)
    expect(svg).not.toContain('<pattern')
    expect(svg).toContain(`viewBox="0 0 40 ${SCENE.particleOnlyRows * 2}"`)
  })

  test('over maxChars there is no Svg (0044 point 7)', () => {
    expect(sceneSvg(scene('sand'), one, { width: 40, scale: 2, moving: true, maxChars: 100 })).toBeUndefined()
  })
})
