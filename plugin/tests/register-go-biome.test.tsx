import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'
import { twoBiomes } from './fixtures/two-biomes'

// Decision 0060: `g: Go here` in the Biomes tab moves the game to the selected biome,
// and Keep last biome starts a session in the last one played. Keep last biome on with
// a stored forest makes the start deterministic. The forest spawns after 3 s of work;
// the appearing phase lasts 1 s.

const KEEP = { options: { autoStart: true, keepBiome: true } }
const PANE_PROPS = { title: 'Modster collection', isFocused: true, bodyColumns: 120, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 30 }, view: {} }
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120, scroll: { offset: 0, bodyRows: 7 }, view: {} }
const WAITING = 4_250
const IN_FOREST = { 'prefs:welcomed': { v: 1 }, 'prefs:lastBiome': { v: 1, id: 'whispering-forest' } }

/** Starts a session on `files` with `stored` in $.store; returns the toasts, the store and the $.state writes. */
async function start($: any, on: On, files: Record<string, string>, stored: Record<string, unknown> = IN_FOREST) {
  const store: Record<string, unknown> = structuredClone(stored)
  const state: Record<string, unknown> = {}
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.blit', () => ({ value: {} }))
  on('store.get', ($, e) => ({ value: structuredClone(store[e.key]) }))
  on('store.set', ($, e) => {
    store[e.key] = structuredClone(e.value)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: Object.keys(store) }))
  on('state.set', ($, e: any, next: any) => {
    state[e.key] = e.value
    return next(e)
  })
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const { toasts } = stubContentFs(on, files)
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { clock, toasts, store, state }
}

/** The Biomes tab, with Ash Dunes selected (the list is by name; it opens on the session's biome). */
async function onAshDunes($: any) {
  const pane = await $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Pane', requestId: 'modster-collection', props: PANE_PROPS })
  await pane.press({ key: 'biomes' })
  await pane.press({ key: 'biome-up' })
  return pane
}

const goButton = (pane: any) => pane.find({ type: 'Button', key: 'biome-go' })

describe('register: go to a biome', () => {
  test('with Keep last biome on, a session starts in the last biome and keeps it as the last one', KEEP, async ($, on) => {
    const { state, store } = await start($, on, twoBiomes())
    expect(state.biomeId).toBe('whispering-forest')
    expect(store['prefs:lastBiome']).toEqual({ v: 1, id: 'whispering-forest' })
  })

  test('a last biome that no longer loads starts in a random one, quietly', KEEP, async ($, on) => {
    const { state, toasts } = await start($, on, oneModsterForest(), { 'prefs:welcomed': { v: 1 }, 'prefs:lastBiome': { v: 1, id: 'marsh' } })
    expect(state.biomeId).toBe('whispering-forest')
    expect(toasts.some((toast) => toast.includes('marsh'))).toBe(false)
  })

  test('Go here moves to the selected biome at once and remembers it', KEEP, async ($, on) => {
    const { state, store, toasts } = await start($, on, twoBiomes())
    const pane = await onAshDunes($)
    expect((await goButton(pane))?.props).toMatchObject({ label: 'Go here', hotkey: 'g' })
    await pane.press({ key: 'biome-go' })
    expect(toasts.at(-1)).toBe('Modster Hunter: now in Ash Dunes')
    expect(state.biomeId).toBe('ash-dunes')
    expect(store['prefs:lastBiome']).toEqual({ v: 1, id: 'ash-dunes' })
    // Already there, so there's nowhere to go
    expect(await goButton(pane)).toBeUndefined()
    await pane.unmount()
  })

  test('during an encounter, Go here waits for it to end (0060 point 2)', KEEP, async ($, on) => {
    const { clock, state, toasts } = await start($, on, twoBiomes())
    const band = await $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    const pane = await onAshDunes($)
    await pane.press({ key: 'biome-go' })
    expect(toasts.at(-1)).toBe('Modster Hunter: off to Ash Dunes after this encounter')
    expect(await goButton(pane)).toBeUndefined()
    expect(state.biomeId).toBe('whispering-forest')
    await clock.advance(90_000)
    await band.redraw()
    expect(await band.find({ type: 'Text', text: 'Sproutling wandered off.' })).toBeDefined()
    // Once the departure is over, the encounter has ended and the game moves
    await clock.advance(4_000)
    expect(state.biomeId).toBe('ash-dunes')
    expect(toasts.at(-1)).toBe('Modster Hunter: now in Ash Dunes')
    await pane.unmount()
    await band.unmount()
  })

  test('Go here back to the biome being played, before the encounter ends, stays put', KEEP, async ($, on) => {
    const { clock, state, toasts } = await start($, on, twoBiomes())
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    const pane = await onAshDunes($)
    await pane.press({ key: 'biome-go' })
    await pane.press({ key: 'biome-down' })
    await pane.press({ key: 'biome-go' })
    expect(toasts.at(-1)).toBe('Modster Hunter: staying in Whispering Forest')
    await clock.advance(94_000)
    expect(state.biomeId).toBe('whispering-forest')
    await pane.unmount()
  })

  test('on desktop the button names the biome, under its scene (0060 point 1)', KEEP, async ($, on) => {
    await start($, on, twoBiomes())
    const pane = await $.ui.mount({ plugin: 'modster-hunter', surface: 'desktop', component: 'Pane', requestId: 'modster-collection', props: PANE_PROPS })
    await pane.press({ key: 'biomes' })
    await pane.press({ key: 'biome-up' })
    expect((await goButton(pane))?.props).toMatchObject({ label: 'Go to Ash Dunes', hotkey: 'g' })
    await pane.unmount()
  })

  test('a turned-off biome has no Go here', KEEP, async ($, on) => {
    await start($, on, twoBiomes())
    const pane = await onAshDunes($)
    await pane.press({ key: 'biome-toggle' })
    expect(await goButton(pane)).toBeUndefined()
    await pane.unmount()
  })
})
