import { describe, expect, test } from 'claude-code/testing'
import { IDLE_TAG } from '../../hooks/constants'
import { desktopIdleScene, idleTagSize, idleTagSvg, sceneSvg } from '../../hooks/render'
import { desktopSheetOf } from '../fixtures/desktop-sheet-of'

// Decision 0047: on desktop the idle line is a name tag in the scene that fades.

const tag = { name: 'Whispering <Forest>', color: '#4caf50', pulse: false, fading: false }

describe('idleTag', () => {
  test('the name on a translucent backing, sized from its length, in the accent colour', () => {
    const svg = idleTagSvg(tag)
    expect(svg).toContain('>Whispering &lt;Forest&gt;</text>')
    expect(svg).toContain(`fill="#4caf50"`)
    expect(svg).toContain(`fill-opacity="${IDLE_TAG.backingOpacity}"`)
    expect(idleTagSize(tag)).toEqual({ width: Math.ceil(IDLE_TAG.padX * 2 + IDLE_TAG.dotR * 2 + IDLE_TAG.gap + 19 * IDLE_TAG.charPx), height: IDLE_TAG.height })
  })

  test('the dot pulses while Claude works and rests dim between turns; fading, it goes out', () => {
    expect(idleTagSvg({ ...tag, pulse: true })).toContain('values="1;0.3;1"')
    expect(idleTagSvg(tag)).toContain('opacity="0.45"')
    expect(idleTagSvg({ ...tag, fading: true })).toContain(`<animate attributeName="opacity" from="1" to="0" dur="${IDLE_TAG.fadeMs / 1000}s" fill="freeze"/>`)
  })

  test('in a scene it sits at the bottom-left, in CSS pixels whatever the strip\'s scale', () => {
    const scene = desktopIdleScene({}, desktopSheetOf(192, 48, 1))
    const svg = sceneSvg(scene, [], { width: 100, scale: 4, moving: false, tag }) ?? ''
    // 12 strip pixels tall at 4 CSS px each: the tag's top is margin + height above the bottom
    expect(svg).toContain(`<g transform="translate(${IDLE_TAG.margin / 4} ${12 - (IDLE_TAG.margin + IDLE_TAG.height) / 4}) scale(0.25)">`)
  })
})
