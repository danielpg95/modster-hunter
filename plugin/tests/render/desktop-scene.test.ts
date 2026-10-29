import { describe, expect, test } from 'claude-code/testing'
import { CONTENT, DESKTOP, SCENE } from '../../hooks/constants'
import { desktopIdleScene, sceneSvg } from '../../hooks/render'
import { desktopSheetOf } from '../fixtures/desktop-sheet-of'

// Decision 0045 points 4 and 9: a desktop background is tiled in the idle scene at a
// quarter of its pixels per strip pixel, its frames stepped by SMIL.

const biome = { backgroundFps: 2, particles: { style: 'leaf' as const, color: '#9ccc65' } }

describe('desktopIdleScene and sceneSvg', () => {
  test('a 48 px sheet takes the rows a 12 px terminal background did; only particles need a timer', () => {
    const scene = desktopIdleScene(biome, desktopSheetOf(192, 48, 2))
    expect([scene.rows, scene.artFps, scene.timerFps]).toEqual([6, 2, SCENE.particleFps])
    expect(desktopIdleScene({}, desktopSheetOf(192, 48, 2)).timerFps).toBe(0)
  })

  test('the sheet is embedded once and tiled, a quarter of its pixels per strip pixel', () => {
    const scene = desktopIdleScene({}, desktopSheetOf(192, 48, 2))
    const svg = sceneSvg(scene, [], { width: 120, scale: 2, moving: true }) ?? ''
    expect(svg.split('data:image/png;base64,').length - 1).toBe(1)
    expect(svg).toContain('<pattern id="bg" patternUnits="userSpaceOnUse" width="48" height="12">')
    expect(svg).toContain('<rect width="120" height="12" fill="url(#bg)"/>')
    expect(svg).toContain('values="0;-192" keyTimes="0;0.5" calcMode="discrete" dur="1s"')
  })

  test('between turns it holds frame 0', () => {
    const svg = sceneSvg(desktopIdleScene({}, desktopSheetOf(192, 48, 2)), [], { width: 120, scale: 2, moving: false }) ?? ''
    expect(svg).not.toContain('<animate')
  })

  test('the largest background stays well under the Svg limit', () => {
    const { background } = CONTENT.desktop
    const sheet = desktopSheetOf(background.widthMax, background.heightMax, background.framesMax, {}, background.bytesMax)
    const svg = sceneSvg(desktopIdleScene(biome, sheet), [], { width: 400, scale: 2, moving: true }) ?? ''
    expect(svg.length).toBeLessThan(DESKTOP.svgMaxChars / 2)
  })
})

describe('particle art (decision 0046)', () => {
  const leafy = { particles: { style: 'leaf' as const } }
  const sheet = desktopSheetOf(12, 8, 4)
  const particles = [{ x: 0.1, y: 0.2, phase: 0 }, { x: 0.6, y: 0.5, phase: 0.5 }]

  test('each particle is a window on the sheet, embedded once, centred where its square would be', () => {
    const scene = { ...desktopIdleScene(leafy, desktopSheetOf(192, 48, 1)), particleSheet: sheet }
    const svg = sceneSvg(scene, particles, { width: 100, scale: 2, moving: false }) ?? ''
    expect(svg).toContain('<image id="pt" ')
    expect(svg.split('data:image/png;base64,').length - 1).toBe(2)
    expect(svg).toContain('width="3" height="2" viewBox="0 0 12 8"><use href="#pt"')
    expect(svg).not.toContain('<rect fill=')
  })

  test('moving, each particle tumbles through the frames from its own frame', () => {
    const scene = { ...desktopIdleScene(leafy, desktopSheetOf(192, 48, 1)), particleSheet: sheet }
    const svg = sceneSvg(scene, particles, { width: 100, scale: 2, moving: true }) ?? ''
    expect(svg).toContain(`values="0;-12;-24;-36" keyTimes="0;0.25;0.5;0.75" calcMode="discrete" dur="${4 / SCENE.particleFps}s"`)
    expect(svg).toContain('values="-24;-36;0;-12"')
  })

  test('without particle art, particles stay squares', () => {
    const svg = sceneSvg(desktopIdleScene(leafy, desktopSheetOf(192, 48, 1)), particles, { width: 100, scale: 2, moving: false }) ?? ''
    expect(svg).toContain('<rect fill=')
    expect(svg).not.toContain('id="pt"')
  })
})
