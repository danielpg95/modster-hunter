import { describe, expect, test } from 'claude-code/testing'
import { MOTION } from '../../hooks/constants'
import { encounterMotionSvg, motionLayout, type MotionSvgInput } from '../../hooks/render'

// Decision 0051: one Svg per motion, at the idle strip's size, stamped with the motion's start.

const strip = { source: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120" viewBox="0 0 150 30"><rect id="strip"/></svg>', width: 600, height: 120 }
const actor = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32" shape-rendering="crispEdges"><rect id="modster"/></svg>'
const layout = motionLayout(strip, 520, { width: 60, height: 80 })

const input = (over: Partial<MotionSvgInput> = {}): MotionSvgInput => ({ strip, layout, stage: 'arrive', stamp: 1234, actor, tag: 'Sproutling ● · common', ...over })

describe('encounterMotionSvg', () => {
  test('the arrival keeps the strip size, stamped with its start, over the dark backdrop', () => {
    const svg = encounterMotionSvg(input()) ?? ''
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" data-motion="arrive/1234" width="600" height="120" viewBox="0 0 600 120">')).toBe(true)
    expect(svg).toContain(`fill="${MOTION.backdrop}"`)
    // The strip, nested at its own size, slides with the Modster
    expect(svg).toContain('<svg x="0" y="0" xmlns="http://www.w3.org/2000/svg" width="600" height="120" viewBox="0 0 150 30">')
  })

  test('the arrival flashes, then slides right, then the silhouette, the sprite and the tag fade in, in order', () => {
    const svg = encounterMotionSvg(input()) ?? ''
    expect(svg).toContain('values="0;0.45;0" dur="0.4s"')
    expect(svg).toContain('from="0 0" to="120 0" begin="0.4s" dur="0.45s"')
    expect(svg).toContain('values="0;1;1;0" keyTimes="0;0.25;0.75;1" begin="0.85s" dur="1s"')
    expect(svg).toContain('begin="1.6s" dur="0.25s"')
    expect(svg).toContain('begin="1.85s" dur="0.25s"')
    expect(svg.indexOf('filter="url(#mm-dark)"')).toBeLessThan(svg.indexOf('begin="1.6s"'))
  })

  test('the Modster is drawn at its place in the sliding group, its own size replaced', () => {
    const svg = encounterMotionSvg(input()) ?? ''
    // Shown at x 290; the group is slid by 120
    expect(svg).toContain('<svg x="170" y="40" width="60" height="80" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" shape-rendering="crispEdges">')
  })

  test('up, the scene stands slid with the Modster and its tag, and nothing plays but the art', () => {
    const svg = encounterMotionSvg(input({ stage: 'up' })) ?? ''
    expect(svg).toContain('data-motion="up/1234"')
    expect(svg).toContain('<g transform="translate(120 0)"><svg x="0"')
    expect(svg).not.toContain('<animate')
    expect(svg).toContain('>Sproutling ● · common</text>')
  })

  test('leaving, a grey puff where the Modster stood as it fades with its tag, then the slide back', () => {
    const svg = encounterMotionSvg(input({ stage: 'leave', stamp: 9000, tag: 'Sproutling fled!' })) ?? ''
    expect(svg).toContain('data-motion="leave/9000"')
    expect(svg).toContain(`fill="${MOTION.fledCue}"`)
    expect(svg).toContain('>Sproutling fled!</text>')
    expect(svg).toContain('from="120 0" to="0 0" begin="0.4s" dur="0.45s"')
    expect(svg).toContain('<svg x="170"')
  })

  test('a caught Modster leaves as a gold burst, already inside its catcher', () => {
    const svg = encounterMotionSvg(input({ stage: 'leave', actor: undefined, caught: true, tag: 'Caught Sproutling!' })) ?? ''
    expect(svg).toContain(`fill="${MOTION.caughtCue}"`)
    expect(svg).not.toContain('id="modster"')
  })

  test('tag text is escaped', () => {
    expect(encounterMotionSvg(input({ stage: 'up', tag: 'A<b>&"' }))).toContain('>A&lt;b&gt;&amp;&quot;</text>')
  })

  test('over the limit there is no Svg', () => {
    const svg = encounterMotionSvg(input()) ?? ''
    expect(encounterMotionSvg(input({ maxChars: svg.length - 1 }))).toBeUndefined()
  })
})
