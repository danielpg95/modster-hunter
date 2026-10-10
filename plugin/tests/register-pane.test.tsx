import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'

// The encounter pane (decision 0015): `/modsters hunt`, drawn on the terminal surface.
// The one-Modster forest spawns after 3 s of work and always catches (catchRate 1).

const PANE_PROPS = { title: 'Modster Hunter', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} }
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }

async function start($: any, on: On, panes: () => UiPane[] = () => []) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.panes', () => ({ value: panes() }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  stubContentFs(on, oneModsterForest())
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return clock
}

const mountPane = ($: any) =>
  $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Pane', requestId: 'modster-hunt', props: PANE_PROPS })
const mountBand = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })

/** An in-memory stand-in for $.store (the test engine has none), read back by the test. */
function stubStore(on: On, initial: Record<string, unknown> = {}): Record<string, unknown> {
  const store = structuredClone(initial)
  on('store.get', ($, e) => ({ value: structuredClone(store[e.key]) }))
  on('store.set', ($, e) => {
    store[e.key] = structuredClone(e.value)
    return { value: undefined }
  })
  return store
}

/** Records every `ui.open` the mod makes; the pane is placed unless `isPlaced` says otherwise. */
function recordOpens(on: On, isPlaced = () => true): { id: string; focus?: boolean }[] {
  const opens: { id: string; focus?: boolean }[] = []
  on('ui.open', ($, e) => {
    opens.push({ id: e.id, ...(e.focus ? { focus: e.focus } : {}) })
    return { value: isPlaced() ? { isPlaced: true } : { isPlaced: false, reason: 'narrow' } }
  })
  return opens
}

async function startSession($: any, on: On) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('classic.SessionStart', () => ({}))
  stubContentFs(on, oneModsterForest())
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return clock
}

const OPEN = { v: 1, open: true }
const CLOSED = { v: 1, open: false }

describe('register: encounter pane', () => {
  test('/modsters hunt opens the pane; it shows the biome while no Modster is here', async ($, on) => {
    await start($, on)
    expect(await $.command.run({ command: 'modsters', args: 'hunt' } as any)).toEqual({})
    const pane = await mountPane($)
    expect(await pane.find({ type: 'Text', text: 'Whispering Forest' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Listening for Modsters/ })).toBeDefined()
    await pane.unmount()
  })

  test('the pane shows the encounter at the sprite\'s normal size, and Throw works from it', async ($, on) => {
    const clock = await start($, on)
    const pane = await mountPane($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_250)
    expect(await pane.find({ type: 'Text', text: 'appeared!' })).toBeDefined()
    // The fixture sprite is 8×8 px: 8 columns, 4 rows, never scaled up (0015)
    const raster = await pane.find({ type: 'Raster', key: 'sprite' })
    expect([raster?.props.columns, raster?.props.rows]).toEqual([8, 4])

    await clock.advance(1_000)
    await pane.press({ key: 'throw' })
    await clock.advance(250)
    expect(await pane.find({ type: 'Text', text: 'wobble… wobble…' })).toBeDefined()
    await clock.advance(1_500)
    expect(await pane.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()
    await pane.unmount()
  })

  test('the band steps aside while the pane is shown, and takes the encounter back when it isn\'t', async ($, on) => {
    let paneShown = true
    const clock = await start($, on, () =>
      paneShown ? [{ id: 'modster-hunt', title: 'Modster Hunter', isShown: true, isFocused: false, isPlaced: true }] : [],
    )
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_250)
    expect(await band.find({ type: 'Raster' })).toBeUndefined()
    expect(await band.find({ type: 'Text', text: /Sproutling/ })).toBeUndefined()

    paneShown = false
    await band.redraw()
    expect(await band.find({ type: 'Raster', key: 'sprite' })).toBeDefined()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeDefined()
    await band.unmount()
  })

  test('a pane in another tab, or not placed yet, doesn\'t hide the band', async ($, on) => {
    let pane: UiPane = { id: 'modster-hunt', title: 'Modster Hunter', isShown: false, isFocused: false, isPlaced: true }
    const clock = await start($, on, () => [pane])
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_250)
    expect(await band.find({ type: 'Raster', key: 'sprite' })).toBeDefined()
    pane = { ...pane, isShown: true, isPlaced: false }
    await band.redraw()
    expect(await band.find({ type: 'Raster', key: 'sprite' })).toBeDefined()
    await band.unmount()
  })

  test('the mod never opens the pane by itself for someone who never opened it', async ($, on) => {
    const opened: string[] = []
    on('ui.open', ($, e) => {
      opened.push(e.id)
      return { value: { isPlaced: true } }
    })
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    stubContentFs(on, oneModsterForest())
    const clock = mock.clock(on)
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(60_000)
    expect(opened).toEqual([])
    await $.command.run({ command: 'modsters', args: 'hunt' } as any)
    expect(opened).toEqual(['modster-hunt'])
  })

  // Reopening for people who opened it (0019)
  test('/modsters hunt remembers the pane is open', async ($, on) => {
    const store = stubStore(on)
    recordOpens(on)
    const clock = await startSession($, on)
    await $.command.run({ command: 'modsters', args: 'hunt' } as any)
    await clock.advance(0)
    expect(store['prefs:huntPane']).toEqual(OPEN)
  })

  test('the pane reopens at session start, without focus, for someone who left it open', async ($, on) => {
    stubStore(on, { 'prefs:huntPane': OPEN })
    const opens = recordOpens(on)
    await startSession($, on)
    expect(opens).toEqual([{ id: 'modster-hunt' }])
  })

  test('/clear, /resume and /branch reopen it too', async ($, on) => {
    stubStore(on, { 'prefs:huntPane': OPEN })
    const opens = recordOpens(on)
    await startSession($, on)
    for (const source of ['clear', 'resume', 'fork'] as const) await $.classic.SessionStart({ source })
    expect(opens).toEqual(Array.from({ length: 4 }, () => ({ id: 'modster-hunt' })))
  })

  test('a pane closed by hand doesn\'t reopen', async ($, on) => {
    const store = stubStore(on, { 'prefs:huntPane': CLOSED })
    const opens = recordOpens(on)
    await startSession($, on)
    await $.classic.SessionStart({ source: 'clear' })
    expect(opens).toEqual([])
    expect(store['prefs:huntPane']).toEqual(CLOSED)
  })

  test('a pref it can\'t read doesn\'t reopen the pane', async ($, on) => {
    stubStore(on, { 'prefs:huntPane': { v: 2, open: true } })
    const opens = recordOpens(on)
    await startSession($, on)
    expect(opens).toEqual([])
  })

  test('a reopened pane that isn\'t placed leaves the encounter in the band', async ($, on) => {
    stubStore(on, { 'prefs:huntPane': OPEN })
    const opens = recordOpens(on, () => false)
    on('ui.panes', () => ({ value: [{ id: 'modster-hunt', title: 'Modster Hunter', isShown: true, isFocused: false, isPlaced: false }] }))
    on('ui.render', ($, e) => {
      const { Box } = $.ui.resolve(e)
      return <Box />
    })
    const clock = await startSession($, on)
    expect(opens).toEqual([{ id: 'modster-hunt' }])
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_250)
    expect(await band.find({ type: 'Raster', key: 'sprite' })).toBeDefined()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeDefined()
    await band.unmount()
  })
})
