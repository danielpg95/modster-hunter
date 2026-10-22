import { describe, expect, test } from 'claude-code/testing'
import { CATCH } from '../../../hooks/constants'
import type { Catcher, Sprite } from '../../../hooks/content'
import { throwingMs } from '../../../hooks/game'
import { catchPreview, catchPreviewPage } from '../../../skills/create-modster-content/scripts/lib'
import { encodeFrame } from '../../fixtures/encode-frame'

// An 8×8 green Modster and an 8×8 red-and-blue jar; a 16×16 one for the size check
const modster = (size: number): Sprite => ({ schemaVersion: 1, width: size, height: size, palette: ['#00000000', '#30a030ff'], frames: [encodeFrame(new Array(size * size).fill(1))] })
const jar: Sprite = { schemaVersion: 1, width: 8, height: 8, palette: ['#00000000', '#ff0000ff', '#0000ffff'], frames: [encodeFrame(Array.from({ length: 64 }, (_, i) => (i < 16 ? 1 : 2)))] }
const catcher: Catcher = { schemaVersion: 1, id: 'jar', name: 'Jar', style: 'contain', sprite: { file: 'sprite.sprite.json' }, lidRows: 2 }

describe('catchPreview', () => {
  test('one frame per tick of the whole loop at 12 fps, a column per case and theme, a row per Modster', () => {
    const scale = 2
    const { frames, fits } = catchPreview(catcher, jar, [{ name: 'A', sprite: modster(8), fps: 4 }, { name: 'B', sprite: modster(16), fps: 4 }], scale)
    const loopMs = throwingMs('caught', CATCH.rocksToCatch) + CATCH.beatMs.caught + CATCH.previewPauseMs
    expect(frames.length).toBe(Math.ceil(loopMs / (1000 / CATCH.fps)))
    // Cells as big as the largest Modster (16 × 2), a 4-pixel gap: 6 columns and 2 rows
    expect([frames[0]?.width, frames[0]?.height]).toEqual([4 + 6 * (32 + 4), 4 + 2 * (32 + 4)])
    expect(fits).toEqual([true, true])
  })

  test('says where the catcher is bigger than the Modster', () => {
    const big: Sprite = { ...jar, width: 16, height: 16, frames: [encodeFrame(new Array(256).fill(2))] }
    expect(catchPreview(catcher, big, [{ name: 'A', sprite: modster(8), fps: 4 }], 1).fits).toEqual([false])
  })

  test('the jar shows up in the frames, and the dark and light cells differ', () => {
    const { frames } = catchPreview(catcher, jar, [{ name: 'A', sprite: modster(8), fps: 4 }], 1)
    // Settled: the jar at rest, the Modster inside it
    const frame = frames[Math.round(800 / (1000 / CATCH.fps))]
    const pixel = (x: number, y: number) => [...Array.from(frame?.data ?? []).slice((y * (frame?.width ?? 0) + x) * 4, (y * (frame?.width ?? 0) + x) * 4 + 3)]
    // Cell 0 starts at x 2, y 2; the jar's body fills its rows 2–7
    expect(pixel(2, 2 + 7)).toEqual([0, 0, 255])
  })

  test('a transparent pixel shows a dark terminal in the first cell and a light one in the next', () => {
    // A Modster with its top rows empty: at 0 ms only it is drawn, and the catcher is off to the left
    const short: Sprite = { ...modster(8), frames: [encodeFrame(Array.from({ length: 64 }, (_, i) => (i < 32 ? 0 : 1)))] }
    const frame = catchPreview(catcher, jar, [{ name: 'A', sprite: short, fps: 4 }], 1).frames[0]
    const pixel = (x: number, y: number) => [...Array.from(frame?.data ?? []).slice((y * (frame?.width ?? 0) + x) * 4, (y * (frame?.width ?? 0) + x) * 4 + 3)]
    expect(pixel(2 + 7, 2)).toEqual([0x1e, 0x1f, 0x22])
    expect(pixel(2 + 8 + 2 + 7, 2)).toEqual([0xfa, 0xfa, 0xf7])
  })
})

describe('catchPreviewPage', () => {
  test('plays every frame, the first one showing; the title is escaped and nothing loads from the network', () => {
    const page = catchPreviewPage('Jar <&>', ['Elderbark', 'Dunebun'], ['AAA', 'BBB', 'CCC'])
    expect(page.match(/<img /g)?.length).toBe(3)
    expect(page.match(/ hidden alt/g)?.length).toBe(2)
    expect(page.includes('<title>Jar &lt;&amp;&gt;</title>')).toBe(true)
    expect(page.includes('Top to bottom: Elderbark, Dunebun.')).toBe(true)
    expect(/https?:\/\//.test(page)).toBe(false)
  })
})
