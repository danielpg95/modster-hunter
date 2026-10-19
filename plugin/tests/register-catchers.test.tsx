import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { COLLECTION } from '../hooks/constants'
import { catcherFiles } from './fixtures/catcher-files'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'

// The Catchers tab (decision 0035 point 9, P5-30): `4: Catchers` in /modsters.
// The fixture catchers are `jar` (a red lid over a blue body) and `net` (a rope tile).

const PANE_PROPS = { title: 'Modster collection', isFocused: true, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} }
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }
const BLUE = 0x0000ff
const ROPE = 0xc9a46a

const files = (): Record<string, string> => ({ ...oneModsterForest(), ...catcherFiles() })
const caught = { v: 1, count: 1, shinyCount: 0, firstCaughtAt: 1, lastCaughtAt: 1, bestTier: 'common', biomes: { 'whispering-forest': 1 } }

/** Starts a session with a fake clock and a store the test reads back; records blits as [key, cells]. */
async function start($: any, on: On, stored: Record<string, unknown> = {}, user: Record<string, string> = {}) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('store.get', ($, e) => ({ value: structuredClone(stored[e.key]) }))
  on('store.set', ($, e) => {
    stored[e.key] = structuredClone(e.value)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: Object.keys(stored) }))
  const blits: [string, string][] = []
  on('ui.blit', ($, e) => {
    if ('cells' in e) blits.push([e.key, e.cells])
    return { value: {} }
  })
  const { toasts } = stubContentFs(on, files(), user)
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { clock, blits, toasts }
}

const mountPane = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Pane', requestId: 'modster-collection', props: PANE_PROPS })
const mountBand = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })

/** The colors a Raster's cells use, foreground and background. */
function colorsIn(cells: string): Set<number> {
  const bytes = Uint8Array.from(atob(cells), (char) => char.charCodeAt(0))
  const words = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
  const colors = new Set<number>()
  for (let i = 0; i < words.length; i += 3) {
    colors.add(words[i + 1] ?? 0)
    colors.add(words[i + 2] ?? 0)
  }
  return colors
}

describe('register: Catchers tab', () => {
  test('lists every catcher with the jar first and in use, and previews it', async ($, on) => {
    await start($, on)
    const pane = await mountPane($)
    await pane.press({ key: 'catchers' })
    expect(await pane.find({ type: 'Text', text: 'Catchers 2' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: ' ✓ in use' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: 'Glass jar' })).toBeUndefined()
    // Nothing caught yet: it plays on a silhouette
    const preview = await pane.find({ type: 'Raster', key: 'catcher-preview' })
    expect(colorsIn(preview?.props.cells).has(parseInt(COLLECTION.silhouetteColor.slice(1, 7), 16))).toBe(true)
    // The one in use has no Use key
    expect(await pane.find({ type: 'Button', key: 'catcher-use' })).toBeUndefined()
    await pane.unmount()
  })

  test('the preview loops a catch while the tab shows, and stops on another tab', async ($, on) => {
    const { clock, blits } = await start($, on, { 'caught:sproutling': caught })
    const pane = await mountPane($)
    await pane.press({ key: 'catchers' })
    await clock.advance(1_000)
    const shown = blits.filter(([key]) => key === 'catcher-preview')
    expect(shown.length).toBeGreaterThanOrEqual(10)
    expect(shown.some(([, cells]) => colorsIn(cells).has(BLUE))).toBe(true)
    await pane.press({ key: 'stats' })
    const before = blits.filter(([key]) => key === 'catcher-preview').length
    await clock.advance(1_000)
    expect(blits.filter(([key]) => key === 'catcher-preview').length).toBe(before)
    await pane.unmount()
  })

  test('u makes the selected catcher the one in use and saves it as prefs:catcher', async ($, on) => {
    const stored: Record<string, unknown> = {}
    const { clock, toasts } = await start($, on, stored)
    const pane = await mountPane($)
    await pane.press({ key: 'catchers' })
    await pane.press({ key: 'catcher-down' })
    expect(await pane.find({ type: 'Button', key: 'catcher-use' })).toBeDefined()
    await pane.press({ key: 'catcher-use' })
    await clock.advance(10)
    expect(stored['prefs:catcher']).toEqual({ v: 1, id: 'net' })
    expect(toasts).toContain('Modster Hunter: catching with the net from the next throw')
    expect(await pane.find({ type: 'Button', key: 'catcher-use' })).toBeUndefined()
    await pane.unmount()
  })

  test('the next throw uses the new catcher; a throw in progress keeps its own', async ($, on) => {
    const { clock, blits } = await start($, on)
    const band = await mountBand($)
    const pane = await mountPane($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_250)
    // The jar is in use: throw, then switch to the net mid-throw
    await band.press({ key: 'throw' })
    await pane.press({ key: 'catchers' })
    await pane.press({ key: 'catcher-down' })
    await pane.press({ key: 'catcher-use' })
    blits.length = 0
    await clock.advance(1_000)
    const sprite = blits.filter(([key]) => key === 'sprite')
    expect(sprite.length > 0 && sprite.every(([, cells]) => !colorsIn(cells).has(ROPE))).toBe(true)
    expect(sprite.some(([, cells]) => colorsIn(cells).has(BLUE))).toBe(true)

    // The next throw plays the net
    await clock.advance(10_000)
    await $.turn.start({ text: 'again', turnId: 't2' } as any)
    await clock.advance(4_250)
    blits.length = 0
    await band.press({ key: 'throw' })
    // The net starts off the left edge; half a second in, it's over the Modster
    await clock.advance(500)
    expect(blits.some(([key, cells]) => key === 'sprite' && colorsIn(cells).has(ROPE))).toBe(true)
    await band.unmount()
    await pane.unmount()
  })

  test("the player's own catcher is marked yours, with the delete hint (0032 point 7)", async ($, on) => {
    const user: Record<string, string> = {}
    for (const [path, text] of Object.entries(catcherFiles())) {
      if (path.startsWith('catchers/net/')) user[`content/${path.replace('catchers/net/', 'catchers/sack/')}`] = path.endsWith('catcher.json') ? text.replace(/"net"/g, '"sack"') : text
    }
    await start($, on, {}, user)
    const pane = await mountPane($)
    await pane.press({ key: 'catchers' })
    await pane.press({ key: 'catcher-down' })
    await pane.press({ key: 'catcher-down' })
    expect(await pane.find({ type: 'Text', text: ' yours' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: 'Yours · to delete it, ask Claude: "delete my catcher sack"' })).toBeDefined()
    await pane.unmount()
  })
})
