import { describe, expect, test } from 'claude-code/testing'
import { CATCH, CONTENT, DESKTOP } from '../../hooks/constants'
import { desktopSheet, type Catcher, type Sprite } from '../../hooks/content'
import { catchSvg, prepareCatch, prepareDesktopCatch } from '../../hooks/render'
import { base64FromBytes } from '../fixtures/base64-from-bytes'
import { catcherFiles } from '../fixtures/catcher-files'
import { desktopPng } from '../fixtures/desktop-png'
import { desktopSheetOf } from '../fixtures/desktop-sheet-of'
import { validSprite } from '../fixtures/valid-sprite'

// Decision 0045 point 5: a throw on desktop draws desktop sheets, a quarter of
// their pixels per terminal pixel, in the terminal's own throw geometry.

const files = catcherFiles()
const jar = JSON.parse(files['catchers/jar/catcher.json'] ?? '{}') as Catcher
const jarSprite = JSON.parse(files['catchers/jar/sprite.sprite.json'] ?? '{}') as Sprite
const sprite = validSprite() as unknown as Sprite
const glowJar: Catcher = { ...jar, desktopSprite: { file: 'desktop.png', frames: 2, glowColor: '#FFD54F', lidRows: 8 } }

const count = (svg: string, text: string): number => svg.split(text).length - 1
const CATCH_BEATS = ['throw', 'take', 'settle', 'rock', 'caught', 'broken'] as const

describe('prepareDesktopCatch', () => {
  test('without desktop sheets it is the terminal art', () => {
    expect(prepareDesktopCatch(jar, { sprite: jarSprite }, { sprite }, 6)).toEqual(prepareCatch(jar, jarSprite, sprite, 6))
  })

  test('a desktop sheet plays at a quarter of its pixels, with its measured bounds and colour', () => {
    const modster = desktopSheetOf(100, 124, 4, { bounds: { x0: 8, y0: 4, x1: 91, y1: 123 }, mainColor: '#88cc44' })
    const art = prepareDesktopCatch(glowJar, { desktop: desktopSheetOf(32, 32, 2) }, { desktop: modster }, 4)
    expect([art?.width, art?.height, art?.catcher.width, art?.lidRows]).toEqual([25, 31, 8, 2])
    expect(art?.bounds).toEqual({ x0: 2, y0: 1, x1: 22, y1: 30 })
    // The glow goes to the Modster's colour; its shapes come from the sheet (a stand-in PNG here has none)
    expect(art?.lit.glow?.to).toBe('#88cc44')
    expect(art?.fits).toBe(true)
  })

  test('a desktop Modster with a terminal catcher keeps the catcher’s palette glow in the Modster’s colour', () => {
    const art = prepareDesktopCatch({ ...jar, glowIndex: 2 }, { sprite: jarSprite }, { desktop: desktopSheetOf(48, 48, 2, { mainColor: '#88cc44' }) }, 4)
    expect(art?.lit.frames.length).toBe(1)
    expect(art?.lit.glow).toBe(undefined)
  })

  test('with no art on a side there is no throw art', () => {
    expect(prepareDesktopCatch(jar, {}, { sprite }, 6)).toBe(undefined)
    expect(prepareDesktopCatch(jar, { desktop: desktopSheetOf(32, 32, 1) }, {}, 6)).toBe(undefined)
  })
})

describe('catchSvg with desktop sheets', () => {
  test('each sheet is embedded once and reused, the Modster stepping through its frames', () => {
    const art = prepareDesktopCatch(glowJar, { desktop: desktopSheetOf(32, 32, 2) }, { desktop: desktopSheetOf(100, 124, 4) }, 4)
    const svg = art && catchSvg(art, 'caught', CATCH.rocksToCatch, { scale: 1 })
    expect(count(svg ?? '', 'data:image/png;base64,')).toBe(2)
    expect(svg).toContain('<image id="ms" ')
    expect(svg).toContain('<image id="cs" ')
    expect(count(svg ?? '', '<use href="#cs"')).toBeGreaterThan(1)
    expect(svg).toContain('<animate attributeName="x" values="0;-100;-200;-300"')
  })

  test('a lit desktop catcher paints its glowColor pixels, found in the sheet, in the Modster\'s colour', () => {
    // A 32×32, 2-frame sheet: a 4×2 block of the glow colour in each frame
    const png = desktopPng(32, 32, 2, (x, y) => (x % 32 >= 10 && x % 32 < 14 && y >= 20 && y < 22 ? [0xff, 0xd5, 0x4f, 255] : [40, 40, 40, 255]))
    const sheet = desktopSheet(base64FromBytes(png), { frames: 2, field: 'f', file: 'jar' }, CONTENT.desktop.catcher)
    if (!sheet.ok) throw new Error('sheet')
    const art = prepareDesktopCatch(glowJar, { desktop: sheet.value }, { sprite }, 6)
    expect(art?.lit.glow?.paths).toEqual(['M10 20h4v1h-4zM10 21h4v1h-4z', 'M42 20h4v1h-4zM42 21h4v1h-4z'])
    const svg = art && catchSvg(art, 'caught', CATCH.rocksToCatch, { scale: 1 })
    expect(svg).toContain('<path fill="#2b8a3e" d="M10 20h4v1h-4zM10 21h4v1h-4z"/>'.replace('#2b8a3e', art?.lit.glow?.to ?? ''))
    expect(svg).not.toContain('<filter id="glow"')
  })

  test('a desktop Modster before any catch is painted with the silhouette filter and holds still', () => {
    const art = prepareDesktopCatch(jar, { sprite: jarSprite }, { desktop: desktopSheetOf(48, 48, 4) }, 4)
    const svg = art && catchSvg(art, 'caught', CATCH.rocksToCatch, { scale: 1, silhouette: '#5a5a5a' })
    expect(svg).toContain('<use href="#ms" filter="url(#sil)">')
    expect(svg).not.toContain('values="0;-48')
  })

  test('a throw with the largest allowed Modster and catcher stays under the Svg limit (0045 point 7)', () => {
    const { modster, catcher } = CONTENT.desktop
    const big = desktopSheetOf(modster.widthMax, modster.heightMax, modster.framesMax, {}, modster.bytesMax)
    const cube = { ...jar, style: 'custom' as const, beats: Object.fromEntries(CATCH_BEATS.map((beat) => [beat, { frames: [0, 1, 2, 3], modster: 'hidden' as const }])) } as Catcher
    const desktopCube: Catcher = { ...cube, desktopSprite: { file: 'desktop.png', frames: 16, glowColor: '#ffd54f', lidRows: 24 } }
    const art = prepareDesktopCatch(desktopCube, { desktop: desktopSheetOf(catcher.widthMax, catcher.heightMax, 16, {}, catcher.bytesMax) }, { desktop: big }, 8)
    for (const outcome of ['caught', 'missed'] as const) {
      const svg = art && catchSvg(art, outcome, CATCH.rocksToCatch, { scale: 1 })
      expect(svg).toBeDefined()
      expect((svg ?? '').length).toBeLessThan(DESKTOP.svgMaxChars)
    }
  })
})

describe('catchSvg from a moment in the throw', () => {
  test('a throw drawn from 1 s in starts with that moment’s values: the Modster already inside', () => {
    const art = prepareDesktopCatch(jar, { sprite: jarSprite }, { desktop: desktopSheetOf(32, 32, 2) }, 4)
    const from = art && catchSvg(art, 'caught', CATCH.rocksToCatch, { scale: 1, fromMs: 1_000 })
    const start = art && catchSvg(art, 'caught', CATCH.rocksToCatch, { scale: 1 })
    expect(start).toContain('<g data-part="modster" display="inline">')
    expect(from).toContain('<g data-part="modster" display="none">')
  })
})
