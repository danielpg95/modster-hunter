import { describe, expect, test } from 'claude-code/testing'
import { CATCH } from '../../hooks/constants'
import type { Catcher, Sprite } from '../../hooks/content'
import { throwingMs } from '../../hooks/game'
import { catchFrame, prepareCatch, type CatchArt, type Frame } from '../../hooks/render'
import { encodeFrame } from '../fixtures/encode-frame'

// A 16×16 Modster: a green block (x 4–11, y 6–15) with a 2×2 yellow spot that
// moves between its two frames. The catcher is 8×8 and rests at x 4–11, y 8–15:
// rows 0–1 a red lid, rows 2–7 a blue body with a 2×2 glow spot in the middle.
// Frame 1 is all magenta.
const GREEN = '#30a030'
const YELLOW = '#f0e060'
const RED = '#ff0000'
const BLUE = '#0000ff'
const MAGENTA = '#ff00ff'
const RIM = '#6e4f2c'

function modsterSprite(): Sprite {
  const frame = (spotX: number) =>
    encodeFrame(
      Array.from({ length: 256 }, (_, i) => {
        const x = i % 16
        const y = Math.floor(i / 16)
        if (x < 4 || x > 11 || y < 6) return 0
        return (x === spotX || x === spotX + 1) && (y === 9 || y === 10) ? 2 : 1
      }),
    )
  return { schemaVersion: 1, width: 16, height: 16, palette: ['#00000000', `${GREEN}ff`, `${YELLOW}ff`], frames: [frame(6), frame(8)] }
}

function catcherSprite(): Sprite {
  const closed = Array.from({ length: 64 }, (_, i) => {
    const x = i % 8
    const y = Math.floor(i / 8)
    if (y < 2) return 1
    return (x === 3 || x === 4) && (y === 4 || y === 5) ? 3 : 2
  })
  return {
    schemaVersion: 1,
    width: 8,
    height: 8,
    palette: ['#00000000', `${RED}ff`, `${BLUE}ff`, '#123456ff', `${MAGENTA}ff`, `${RIM}ff`],
    frames: [encodeFrame(closed), encodeFrame(new Array(64).fill(4))],
  }
}

const catcher = (fields: Partial<Catcher> = {}): Catcher => ({
  schemaVersion: 1,
  id: 'jar',
  name: 'Jar',
  style: 'contain',
  sprite: { file: 'sprite.sprite.json' },
  ...fields,
})

const prepare = (fields: Partial<Catcher> = {}, art = catcherSprite()): CatchArt => prepareCatch(catcher(fields), art, modsterSprite(), 2)

/** `#rrggbb` at a pixel, or undefined when it's empty. */
function pixel(frame: Frame, x: number, y: number): string | undefined {
  const i = (y * frame.width + x) * 4
  if ((frame.rgba[i + 3] ?? 0) === 0) return undefined
  return `#${[0, 1, 2].map((c) => (frame.rgba[i + c] ?? 0).toString(16).padStart(2, '0')).join('')}`
}

/** Where a color shows: every [x, y]. */
function where(frame: Frame, color: string): [number, number][] {
  const found: [number, number][] = []
  for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) if (pixel(frame, x, y) === color) found.push([x, y])
  return found
}

const rows = (spots: [number, number][]): number[] => [...new Set(spots.map(([, y]) => y))].sort((a, b) => a - b)
const columns = (spots: [number, number][]): number[] => [...new Set(spots.map(([x]) => x))].sort((a, b) => a - b)

// Beat starts for a 3-rock catch and a 1-rock miss (decision 0035 point 5)
const TAKE = 350
const SETTLE = 750
const ROCK = 900
const CAUGHT = 2400
const BROKEN = 1400

describe('catchFrame', () => {
  test('every frame fills the Modster area, and every pixel is opaque or empty (terminal cells cannot blend)', () => {
    const arts = [prepare(), prepare({ style: 'cover', rimIndex: 5 }), prepare({ lidRows: 2, glowIndex: 3 })]
    for (const art of arts) {
      for (const [outcome, rocks] of [['caught', 3], ['missed', 1], ['missed', 2]] as const) {
        for (let ms = 0; ms < throwingMs(outcome, rocks) + 800; ms += 1000 / CATCH.fps) {
          const frame = catchFrame(art, outcome, rocks, ms)
          expect([frame.width, frame.height]).toEqual([16, 16])
          for (let i = 3; i < frame.rgba.length; i += 4) expect(frame.rgba[i] === 0 || frame.rgba[i] === 255).toBe(true)
        }
      }
    }
  })

  test('contain, throw: the catcher arcs in from the left while the Modster stands and animates at its fps', () => {
    const art = prepare()
    // It spins in from off the left edge, so it starts left of where it lands
    const start = catchFrame(art, 'caught', 3, 0)
    expect(Math.max(...columns(where(start, BLUE))) < 4).toBe(true)
    expect(where(start, GREEN).length > 0).toBe(true)
    // At 2 fps the spot moves at 500 ms; it's under the catcher by then, so look before it lands
    expect(pixel(catchFrame(art, 'caught', 3, 0), 6, 9)).toBe(YELLOW)
    expect(pixel(catchFrame(art, 'caught', 3, TAKE), 6, 9)).toBe(YELLOW)
  })

  test('contain, at rest: bottom center of the area, the lid over the body', () => {
    const frame = catchFrame(prepare(), 'caught', 3, SETTLE + 100)
    expect(rows(where(frame, RED))).toEqual([8, 9])
    expect(columns(where(frame, BLUE))).toEqual([4, 5, 6, 7, 8, 9, 10, 11])
    expect(Math.max(...rows(where(frame, BLUE)))).toBe(15)
  })

  test('contain, take: the lid lifts by lidLiftPx and the Modster shrinks into the opening, flashing white', () => {
    const art = prepare({ lidRows: 2 })
    const mid = catchFrame(art, 'caught', 3, TAKE + 200)
    expect(rows(where(mid, RED))).toEqual([8 - CATCH.lidLiftPx, 9 - CATCH.lidLiftPx])
    // Flashing: no plain green left, and fewer Modster pixels than it has
    expect(where(mid, GREEN).length).toBe(0)
    const end = catchFrame(art, 'caught', 3, SETTLE - 1)
    expect(where(end, GREEN).length + where(end, '#ffffff').length < 4).toBe(true)
  })

  test('without lidRows the lid never moves', () => {
    expect(rows(where(catchFrame(prepare(), 'caught', 3, TAKE + 200), RED))).toEqual([8, 9])
  })

  test('contain, settle and rocks: the Modster is hidden', () => {
    for (const ms of [SETTLE, ROCK + 100, ROCK + 1200]) expect(where(catchFrame(prepare(), 'caught', 3, ms), GREEN).length).toBe(0)
  })

  test('a rock made from frame 0 tilts it, and the next rock leans the other way', () => {
    const art = prepare()
    // A quarter through a rock is the top of its swing
    const first = catchFrame(art, 'caught', 3, ROCK + 100)
    const second = catchFrame(art, 'caught', 3, ROCK + 500 + 100)
    const lidFirst = Math.min(...columns(where(first, RED)))
    const lidSecond = Math.min(...columns(where(second, RED)))
    expect(lidFirst !== 4 && lidSecond !== 4).toBe(true)
    expect(Math.sign(lidFirst - 4)).toBe(-Math.sign(lidSecond - 4))
    // Still between swings
    expect(rows(where(catchFrame(art, 'caught', 3, ROCK + 450), RED))).toEqual([8, 9])
  })

  test("a beat's own frames play evenly over it, with no made motion", () => {
    const art = prepare({ beats: { rock: { frames: [1, 0] } } })
    expect(where(catchFrame(art, 'caught', 3, ROCK + 100), MAGENTA).length).toBe(64)
    const late = catchFrame(art, 'caught', 3, ROCK + 300)
    expect(where(late, MAGENTA).length).toBe(0)
    expect(rows(where(late, RED))).toEqual([8, 9])
  })

  test("glowIndex is painted in the Modster's most common bright color", () => {
    const frame = catchFrame(prepare({ glowIndex: 3 }), 'caught', 3, ROCK + 450)
    // Yellow is bright (summed RGB over glowMinBrightness) though green is more common
    expect(where(frame, YELLOW)).toEqual([
      [7, 12],
      [8, 12],
      [7, 13],
      [8, 13],
    ])
  })

  test('glowIndex keeps its own color until the Modster is inside: empty on the throw and the take, lit once it hides', () => {
    const art = prepare({ glowIndex: 3, beats: { throw: { path: 'none' } } })
    // The glow spot sits at x 7–8, y 12–13 of the resting catcher
    expect(pixel(catchFrame(art, 'caught', 3, 0), 7, 12)).toBe('#123456')
    expect(pixel(catchFrame(art, 'caught', 3, SETTLE + 100), 7, 12)).toBe(YELLOW)
    expect(pixel(catchFrame(art, 'missed', 1, BROKEN + 300), 7, 12)).not.toBe(YELLOW)
  })

  test('caught: sparkles burst around the catcher, then stop; the catcher stays', () => {
    const art = prepare()
    const burst = catchFrame(art, 'caught', 3, CAUGHT + 200)
    expect(where(burst, '#e0a800').length > 0).toBe(true)
    const after = catchFrame(art, 'caught', 3, CAUGHT + 5000)
    expect(where(after, '#e0a800').length).toBe(0)
    expect(where(after, BLUE).length > 0).toBe(true)
    expect(where(after, GREEN).length).toBe(0)
  })

  test('contain, broken: the lid flies up and away, the body goes, and the Modster pops back out whole', () => {
    const art = prepare({ lidRows: 2 })
    // Just after the white flash
    const flying = catchFrame(art, 'missed', 1, BROKEN + 90)
    expect(Math.min(...rows(where(flying, RED))) < 8 - CATCH.lidLiftPx).toBe(true)
    const done = catchFrame(art, 'missed', 1, BROKEN + 449)
    expect(where(done, BLUE).length).toBe(0)
    // Back at full size: every green pixel of the Modster, none white
    expect(where(done, GREEN).length + where(done, YELLOW).length).toBe(80)
  })

  test('behind: the Modster draws over the catcher; over: the catcher draws over the Modster', () => {
    const over = prepare({ style: 'custom', beats: beatsAll({ modster: 'visible' }) })
    const behind = prepare({ style: 'custom', beats: beatsAll({ modster: 'visible', place: 'behind' }) })
    expect(pixel(catchFrame(over, 'caught', 3, ROCK + 450), 5, 12)).toBe(BLUE)
    expect(pixel(catchFrame(behind, 'caught', 3, ROCK + 450), 5, 12)).toBe(GREEN)
  })

  test('throw paths: drop falls straight down over the resting spot; none starts there', () => {
    const drop = prepare({ beats: { throw: { path: 'drop' } } })
    const falling = catchFrame(drop, 'caught', 3, 100)
    expect(columns(where(falling, BLUE))).toEqual([4, 5, 6, 7, 8, 9, 10, 11])
    expect(Math.max(...rows(where(falling, BLUE))) < 15).toBe(true)
    const none = prepare({ beats: { throw: { path: 'none' } } })
    expect(rows(where(catchFrame(none, 'caught', 3, 0), RED))).toEqual([8, 9])
  })

  test('dim mixes the Modster halfway to black; hop-out lifts it by hopPx at the top of the hop', () => {
    const dim = prepare({ style: 'custom', beats: beatsAll({ modster: 'dim', place: 'behind' }) })
    expect(pixel(catchFrame(dim, 'caught', 3, ROCK), 4, 15)).toBe('#185018')
    const hop = prepare({ style: 'custom', beats: { ...beatsAll({ modster: 'visible', place: 'behind' }), broken: { modster: 'hop-out', place: 'behind' } } })
    const top = catchFrame(hop, 'missed', 1, BROKEN + 0.33 * 450)
    expect(Math.min(...rows(where(top, GREEN)))).toBe(6 - CATCH.hopPx)
  })

  test('cover, take: the frame tiles over the Modster outline, dropping from the top', () => {
    const art = prepare({ style: 'cover' })
    const early = catchFrame(art, 'caught', 3, TAKE + 50)
    const covered = rows(where(early, RED))
    expect(covered.length > 0 && Math.max(...covered) < 12).toBe(true)
    const full = catchFrame(art, 'caught', 3, SETTLE)
    expect(Math.max(...rows(where(full, BLUE)))).toBe(15)
  })

  test('cover: rimIndex draws the edge; without it the tile reaches the edge', () => {
    const withRim = catchFrame(prepare({ style: 'cover', rimIndex: 5 }), 'caught', 3, SETTLE)
    expect(where(withRim, RIM).length > 0).toBe(true)
    // The bottom row is all edge
    expect(rows(where(withRim, RIM))).toContain(15)
    const without = catchFrame(prepare({ style: 'cover' }), 'caught', 3, SETTLE)
    expect(where(without, RIM).length).toBe(0)
  })

  test('shake moves the Modster sideways at the top of each swing, and back between swings', () => {
    const art = prepare({ style: 'custom', beats: { ...beatsAll({ modster: 'visible', place: 'behind' }), rock: { modster: 'shake', place: 'behind' } } })
    const left = (ms: number) => Math.min(...columns(where(catchFrame(art, 'caught', 3, ms), GREEN)))
    expect(left(ROCK + 450)).toBe(4)
    expect(left(ROCK + 100)).not.toBe(4)
    expect(Math.sign(left(ROCK + 100) - 4)).toBe(-Math.sign(left(ROCK + 600) - 4))
  })

  test('cover, caught: the Modster shrinks where it stands and the rim ties a knot on top', () => {
    const art = prepare({ style: 'cover', rimIndex: 5 })
    const before = catchFrame(art, 'caught', 3, CAUGHT - 1)
    const after = catchFrame(art, 'caught', 3, CAUGHT + 600)
    expect(Math.min(...rows(where(after, RIM))) < Math.min(...rows(where(before, RIM))) + 4).toBe(true)
    expect(Math.min(...rows(where(after, BLUE))) > Math.min(...rows(where(before, BLUE)))).toBe(true)
  })

  test('cover, broken: it tears down the middle, and is gone at the end with the Modster free', () => {
    const art = prepare({ style: 'cover' })
    const tearing = catchFrame(art, 'missed', 1, BROKEN + 200)
    expect(pixel(tearing, 7, 7)).not.toBe(BLUE)
    const done = catchFrame(art, 'missed', 1, BROKEN + 5000)
    expect(where(done, BLUE).length + where(done, RED).length).toBe(0)
    expect(where(done, GREEN).length + where(done, YELLOW).length).toBe(80)
  })

  test('fits: an anchored catcher bigger than the area does not fit; one that only stretches always does (0035 point 8)', () => {
    const big: Sprite = { ...catcherSprite(), width: 20, height: 8, frames: [encodeFrame(new Array(160).fill(2))] }
    expect(prepare().fits).toBe(true)
    expect(prepare({}, big).fits).toBe(false)
    expect(prepare({ style: 'cover' }, big).fits).toBe(true)
  })
})

/** All six beats with the same fields, for a custom catcher. */
function beatsAll(beat: NonNullable<Catcher['beats']>['throw']): NonNullable<Catcher['beats']> {
  return { throw: { ...beat, path: 'none' }, take: beat, settle: beat, rock: beat, caught: beat, broken: beat }
}
