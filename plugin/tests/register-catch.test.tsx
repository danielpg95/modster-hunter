import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'
import { CATCH } from '../hooks/constants'
import type { Catcher, Sprite } from '../hooks/content'
import { throwingMs } from '../hooks/game'
import { catchFrame, pixelsToCells, prepareCatch, spriteCells } from '../hooks/render'
import { catcherFiles } from './fixtures/catcher-files'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'
import { validSprite } from './fixtures/valid-sprite'

// The game runs only while autoStart is on (decision 0038); these tests play it
const HUNTING = { options: { autoStart: true } }

// The catch animation in the band and the encounter pane (decision 0035, P5-32).
// The one-Modster forest spawns after 3 s of work and always catches (catchRate 1),
// so every throw here is a 3-rock catch: 2.4 s, then its caught beat in the result card.

const BAND_TICK = 250
const CATCH_THROW_MS = throwingMs('caught', CATCH.rocksToCatch)
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }
const PANE_PROPS = { title: 'Modster Hunter', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} }
const SHOWN: UiPane[] = [{ id: 'modster-hunt', title: 'Modster Hunter', isShown: true, isFocused: false, isPlaced: true }]

const files = (): Record<string, string> => ({ ...oneModsterForest(), ...catcherFiles() })
const IDLE = new Set(spriteCells(validSprite() as unknown as Sprite))

/** The cells a catcher from `catcherFiles` draws on the fixture Modster, `ms` into a catch. */
function expectedCells(id: 'jar' | 'net', ms: number): string {
  const all = catcherFiles()
  const catcher = JSON.parse(all[`catchers/${id}/catcher.json`] ?? '{}') as Catcher
  const art = JSON.parse(all[`catchers/${id}/sprite.sprite.json`] ?? '{}') as Sprite
  // The fixture Modster has no fps, so it animates at the default 6
  const prepared = prepareCatch(catcher, art, validSprite() as unknown as Sprite, 6)
  return pixelsToCells(catchFrame(prepared, 'caught', CATCH.rocksToCatch, ms))
}

/** Starts a session with a fake clock and a store; records the sprite's blits as [site, cells]. */
async function start($: any, on: On, content = files(), stored: Record<string, unknown> = {}, panes: () => UiPane[] = () => []) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.panes', () => ({ value: panes() }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('store.get', ($, e) => ({ value: structuredClone(stored[e.key]) }))
  on('store.set', ($, e) => {
    stored[e.key] = structuredClone(e.value)
    return { value: undefined }
  })
  const blits: [string, string][] = []
  on('ui.blit', ($, e) => {
    if (e.key === 'sprite' && 'cells' in e) blits.push([e.requestId, e.cells])
    return { value: {} }
  })
  stubContentFs(on, content)
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { clock, blits }
}

const mountBand = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
const mountPane = ($: any) =>
  $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Pane', requestId: 'modster-hunt', props: PANE_PROPS })

/** Runs a turn until the Modster waits for a throw. */
async function untilWaiting($: any, clock: { advance: (ms: number) => Promise<void> }): Promise<void> {
  await $.turn.start({ text: 'go', turnId: 't1' } as any)
  await clock.advance(3_000 + BAND_TICK)
  await clock.advance(1_000)
}

describe('register: catch animation', () => {
  test('a throw draws the catcher in use from its first frame, the jar by default (0035 point 10)', HUNTING, async ($, on) => {
    const { clock } = await start($, on)
    const band = await mountBand($)
    await untilWaiting($, clock)
    await band.press({ key: 'throw' })
    expect((await band.find({ type: 'Raster', key: 'sprite' }))?.props.cells).toBe(expectedCells('jar', 0))
    await band.unmount()
  })

  test('the catcher picked in prefs:catcher plays instead', HUNTING, async ($, on) => {
    const { clock } = await start($, on, files(), { 'prefs:catcher': { v: 1, id: 'net' } })
    const band = await mountBand($)
    await untilWaiting($, clock)
    await band.press({ key: 'throw' })
    expect((await band.find({ type: 'Raster', key: 'sprite' }))?.props.cells).toBe(expectedCells('net', 0))
    await band.unmount()
  })

  test('a picked catcher that did not load falls back to the jar', HUNTING, async ($, on) => {
    const { clock } = await start($, on, files(), { 'prefs:catcher': { v: 1, id: 'bubble' } })
    const band = await mountBand($)
    await untilWaiting($, clock)
    await band.press({ key: 'throw' })
    expect((await band.find({ type: 'Raster', key: 'sprite' }))?.props.cells).toBe(expectedCells('jar', 0))
    await band.unmount()
  })

  test('frames are blitted at 12 fps while the idle loop waits, through the caught beat, then the idle loop comes back', HUNTING, async ($, on) => {
    const { clock, blits } = await start($, on)
    const band = await mountBand($)
    await untilWaiting($, clock)
    blits.length = 0
    await band.press({ key: 'throw' })
    await clock.advance(1_000)
    expect(blits.length).toBeGreaterThanOrEqual(CATCH.fps - 1)
    expect(blits.every(([, cells]) => !IDLE.has(cells))).toBe(true)

    // The card shows while the caught beat still plays
    await clock.advance(CATCH_THROW_MS - 1_000 + 300)
    expect(await band.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()
    expect(IDLE.has(blits.at(-1)?.[1] ?? '')).toBe(false)

    await clock.advance(CATCH.beatMs.caught)
    expect(IDLE.has(blits.at(-1)?.[1] ?? '')).toBe(true)
    await band.unmount()
  })

  test('the band and the encounter pane both get the frames', HUNTING, async ($, on) => {
    const { clock, blits } = await start($, on, files(), {}, () => SHOWN)
    await $.command.run({ command: 'modsters', args: 'pane' } as any)
    const pane = await mountPane($)
    await untilWaiting($, clock)
    await pane.press({ key: 'throw' })
    await clock.advance(500)
    expect(blits.some(([site, cells]) => site === 'modster-hunt' && !IDLE.has(cells))).toBe(true)
    await pane.unmount()
  })

  test('with no catcher drawn, the Modster holds still and the text tells the throw (0035 point 8)', HUNTING, async ($, on) => {
    const { clock, blits } = await start($, on, oneModsterForest())
    const band = await mountBand($)
    await untilWaiting($, clock)
    blits.length = 0
    await band.press({ key: 'throw' })
    await clock.advance(1_000)
    expect(await band.find({ type: 'Text', text: '● ○ ○' })).toBeDefined()
    expect(blits).toHaveLength(0)
    await band.unmount()
  })

  test('a catcher too big for the sprite area holds the Modster still too', HUNTING, async ($, on) => {
    const content = files()
    // Twice the 8×8 fixture Modster
    const big = JSON.parse(content['catchers/jar/sprite.sprite.json'] ?? '{}')
    content['catchers/jar/sprite.sprite.json'] = JSON.stringify({ ...big, width: 16, height: 16, frames: [btoa(String.fromCharCode(...new Array(256).fill(2)))] })
    const { clock, blits } = await start($, on, content)
    const band = await mountBand($)
    await untilWaiting($, clock)
    blits.length = 0
    await band.press({ key: 'throw' })
    await clock.advance(1_000)
    expect(blits).toHaveLength(0)
    expect(await band.find({ type: 'Text', text: '● ○ ○' })).toBeDefined()
    await band.unmount()
  })
})
