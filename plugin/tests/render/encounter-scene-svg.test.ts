import { describe, expect, test } from 'claude-code/testing'
import { DESKTOP } from '../../hooks/constants'
import type { Biome, Sprite } from '../../hooks/content'
import { desktopIdleScene, desktopSheetSvg, encounterSceneSvg, idleScene, pixelsToSvg, spriteRgba, type SceneActor } from '../../hooks/render'
import { desktopSheetOf } from '../fixtures/desktop-sheet-of'
import { encodeFrame } from '../fixtures/encode-frame'

// Decisions 0048 and 0049: on desktop the encounter draws the biome's idle scene behind, grown to
// the Modster's height, moving, with the Modster standing in front of it, as one Svg.

const biome = { backgroundFps: 2, particles: { style: 'leaf' as const, color: '#9ccc65' } }

/** An 8×8 terminal background (4 rows), two frames. */
const background: Sprite = {
  schemaVersion: 1,
  width: 8,
  height: 8,
  palette: ['#00000000', '#ff0000ff', '#00ff00ff'],
  frames: [encodeFrame(new Array(64).fill(1)), encodeFrame(new Array(64).fill(2))],
}

/** A 4×6 terminal sprite, two frames. */
const sprite: Sprite = {
  schemaVersion: 1,
  width: 4,
  height: 6,
  palette: ['#00000000', '#123456ff', '#654321ff'],
  frames: [encodeFrame(new Array(24).fill(1)), encodeFrame(new Array(24).fill(2))],
}

function spriteActor(): SceneActor {
  const frames = spriteRgba(sprite).map((rgba) => ({ width: sprite.width, height: sprite.height, rgba }))
  return { source: pixelsToSvg(frames, { scale: 1, fps: 2 }), width: sprite.width, height: sprite.height }
}

/** A 96×128 desktop sheet: 24×32 strip pixels at a quarter of its pixels each. */
function sheetActor(): SceneActor {
  const sheet = desktopSheetOf(96, 128, 4)
  const scale = 1 / DESKTOP.sheetPixels
  return { source: desktopSheetSvg(sheet, { scale, fps: 4 }), width: sheet.width * scale, height: sheet.height * scale }
}

const terminalScene = () => {
  const made = idleScene({ particles: { style: 'sand', color: '#ffffff' } } as Pick<Biome, 'accentColor' | 'backgroundFps' | 'particles'>, background)
  if (!made) throw new Error('no scene')
  return made
}

describe('encounterSceneSvg', () => {
  test('a desktop sheet stands on a desktop background: one Svg, the strip grown to its height, the Modster centred in front', () => {
    const scene = desktopIdleScene(biome, desktopSheetOf(192, 48, 2))
    const svg = encounterSceneSvg(scene, () => [], sheetActor(), { width: 120, center: 60, scale: 4 }) ?? ''
    // The Modster is 32 tall, the strip 12: the strip grows to 32 (45 of its pixels fill the 120), the Modster at x 60 − 12
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="128" viewBox="0 0 120 32"')).toBe(true)
    expect(svg).toContain('<svg x="0" y="0" xmlns="http://www.w3.org/2000/svg" width="120" height="32" viewBox="0 0 45 12"')
    expect(svg).toContain('<svg x="48" y="0" xmlns=')
    // The strip comes first, so the Modster is drawn in front of it
    expect(svg.indexOf('fill="url(#bg)"')).toBeLessThan(svg.indexOf('<svg x="48"'))
    expect(svg.split('data:image/png;base64,').length - 1).toBe(2)
  })

  test('the strip moves during the encounter', () => {
    const scene = desktopIdleScene(biome, desktopSheetOf(192, 48, 2))
    const svg = encounterSceneSvg(scene, () => [], sheetActor(), { width: 120, center: 60, scale: 4 }) ?? ''
    expect(svg).toContain('values="0;-192" keyTimes="0;0.5" calcMode="discrete" dur="1s"')
  })

  test('a terminal sprite stands on a biome with no desktop art', () => {
    const svg = encounterSceneSvg(terminalScene(), () => [], spriteActor(), { width: 40, center: 20, scale: 4 }) ?? ''
    // The strip is 8 tall and the sprite 6: the strip fills the height, the sprite stands on its bottom
    expect(svg).toContain('viewBox="0 0 40 8"')
    expect(svg).toContain('<svg x="0" y="0" xmlns=')
    expect(svg).toContain('<svg x="18" y="2" xmlns=')
    expect(svg).toContain('#123456')
    expect(svg).toContain('#00ff00')
  })

  test('the Modster stays inside the strip when the centre is near an edge', () => {
    const svg = encounterSceneSvg(terminalScene(), () => [], spriteActor(), { width: 40, center: 0, scale: 4 }) ?? ''
    expect(svg).toContain('<svg x="0" y="2" xmlns=')
    const right = encounterSceneSvg(terminalScene(), () => [], spriteActor(), { width: 40, center: 40, scale: 4 }) ?? ''
    expect(right).toContain('<svg x="36" y="2" xmlns=')
  })

  test('over the limit there is no scene, so the pane draws the Modster alone', () => {
    const scene = desktopIdleScene(biome, desktopSheetOf(192, 48, 2))
    const actor = sheetActor()
    const svg = encounterSceneSvg(scene, () => [], actor, { width: 120, center: 60, scale: 4 })
    expect(svg).toBeDefined()
    expect(encounterSceneSvg(scene, () => [], actor, { width: 120, center: 60, scale: 4, maxChars: (svg?.length ?? 0) - 1 })).toBeUndefined()
  })
})
