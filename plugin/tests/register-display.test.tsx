import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'

// Display settings (decision 0023): band, encounter pane, spinner and status line,
// each on and off. The one-Modster forest spawns after 3 s of work and always
// catches (catchRate 1); the appearing phase lasts 1 s.

const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }
const SPINNER_PROPS = { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' }
const SPAWN = 3_250
const WAITING = 4_250

interface Seen {
  statuses: (string | undefined)[]
  spinner: (string | null)[]
  opens: string[]
  closes: string[]
  store: Record<string, unknown>
}

/** Starts a session on the one-Modster forest with a fake clock, recording what the mod shows. */
async function start($: any, on: On, init: { panes?: () => UiPane[]; store?: Record<string, unknown> } = {}) {
  const seen: Seen = { statuses: [], spinner: [], opens: [], closes: [], store: structuredClone(init.store ?? {}) }
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.end', () => ({ sessionId: 's1' }))
  on('classic.SessionStart', () => ({}))
  on('classic.SubagentStart', () => ({}))
  on('ui.status', ($, e) => {
    seen.statuses.push(e.text)
    return { value: undefined }
  })
  on('ui.open', ($, e) => {
    seen.opens.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, e) => {
    seen.closes.push(`${e.id}:${e.origin.kind}`)
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: init.panes?.() ?? [] }))
  // The test engine has no $.store; an in-memory one the test reads back
  on('store.get', ($, e) => ({ value: structuredClone(seen.store[e.key]) }))
  on('store.set', ($, e) => {
    seen.store[e.key] = structuredClone(e.value)
    return { value: undefined }
  })
  // What the spinner would draw after the mod's rewrite
  on('ui.render', { component: 'Spinner' }, ($, e) => {
    seen.spinner.push(e.props.message)
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  stubContentFs(on, oneModsterForest())
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { clock, seen }
}

const mountBand = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
const mountSpinner = ($: any, requestId = 'main') =>
  $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Spinner', requestId, props: SPINNER_PROPS })
const last = <T,>(list: T[]): T | undefined => list[list.length - 1]

describe('register: display settings', () => {
  // Spinner (0023 point 5)
  test('by default the spinner names the Modster while Claude works, then shows the result', async ($, on) => {
    const { clock, seen } = await start($, on)
    const band = await mountBand($)
    const spinner = await mountSpinner($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    expect(last(seen.spinner)).toBeNull()

    await clock.advance(SPAWN)
    await spinner.redraw()
    expect(last(seen.spinner)).toBe('A wild Sproutling appeared!')

    await clock.advance(1_000)
    await band.press({ key: 'throw' })
    await clock.advance(1_500 + 250)
    await spinner.redraw()
    expect(last(seen.spinner)).toBe('Caught Sproutling!')
    await spinner.unmount()
    await band.unmount()
  })

  test('the spinner is left alone with showInSpinner off', { options: { showInSpinner: false } }, async ($, on) => {
    const { clock, seen } = await start($, on)
    const spinner = await mountSpinner($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(SPAWN)
    await spinner.redraw()
    expect(seen.spinner.every((message) => message === null)).toBe(true)
    await spinner.unmount()
  })

  test('a subagent\'s spinner row keeps its own words', async ($, on) => {
    const { clock, seen } = await start($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await $.classic.SubagentStart({ agent_id: 'a1', agent_type: 'general-purpose' } as any)
    await clock.advance(SPAWN)
    const spinner = await mountSpinner($, 'a1')
    expect(last(seen.spinner)).toBeNull()
    await spinner.unmount()
  })

  // Status line (0023 point 6)
  test('by default the status line shows only while an encounter is up', async ($, on) => {
    const { clock, seen } = await start($, on)
    const band = await mountBand($)
    // Cleared at load, nothing pinned between encounters
    expect(seen.statuses).toEqual([undefined])

    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(SPAWN)
    expect(last(seen.statuses)).toBe('A wild Sproutling (common) appeared!')
    await clock.advance(1_000)
    expect(last(seen.statuses)).toBe('Sproutling (common) · 3 left · 1: Throw in the band or pane')

    await band.press({ key: 'throw' })
    await clock.advance(1_500 + 250)
    expect(last(seen.statuses)).toBe('Caught Sproutling!')
    await clock.advance(4_000)
    expect(last(seen.statuses)).toBeUndefined()
    await band.unmount()
  })

  test('the status line stays empty with showInStatusLine off', { options: { showInStatusLine: false } }, async ($, on) => {
    const { clock, seen } = await start($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    expect(seen.statuses.every((text) => text === undefined)).toBe(true)
  })

  test('the status line is cleared when the session ends mid-encounter', async ($, on) => {
    const { clock, seen } = await start($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    expect(last(seen.statuses)).toBeDefined()
    await $.session.end({ reason: 'exit' } as any)
    expect(last(seen.statuses)).toBeUndefined()
  })

  // Band (0023 point 3)
  test('with the band off, nothing shows between encounters', { options: { showInBand: false } }, async ($, on) => {
    await start($, on)
    const band = await mountBand($)
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    await band.unmount()
  })

  test('with the band off, an encounter takes one row and Throw still catches, once', { options: { showInBand: false } }, async ($, on) => {
    const { clock, seen } = await start($, on)
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    expect(await band.find({ type: 'Raster' })).toBeUndefined()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeDefined()

    await band.press({ key: 'throw' })
    await clock.advance(1_500 + 250)
    expect(await band.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()
    expect(seen.store['caught:sproutling']).toMatchObject({ count: 1 })
    await band.unmount()
  })

  test('with the band off, the shown pane still takes the encounter', { options: { showInBand: false } }, async ($, on) => {
    const pane: UiPane = { id: 'modster-hunt', title: 'Modster Hunter', isShown: true, isFocused: false, isPlaced: true }
    const { clock } = await start($, on, { panes: () => [pane] })
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeUndefined()
    await band.unmount()
  })

  // Encounter pane (0023 point 4)
  test('encounterPane always opens the pane every session, even for someone who never opened it', { options: { encounterPane: 'always' } }, async ($, on) => {
    const { seen } = await start($, on)
    for (const source of ['clear', 'resume', 'fork'] as const) await $.classic.SessionStart({ source })
    expect(seen.opens).toEqual(Array.from({ length: 4 }, () => 'modster-hunt'))
  })

  test('encounterPane always opens it after a close by hand too', { options: { encounterPane: 'always' } }, async ($, on) => {
    const { seen } = await start($, on, { store: { 'prefs:huntPane': { v: 1, open: false } } })
    expect(seen.opens).toEqual(['modster-hunt'])
  })

  test('encounterPane off: /modsters hunt says so and opens nothing', { options: { encounterPane: 'off' } }, async ($, on) => {
    const { seen } = await start($, on, { store: { 'prefs:huntPane': { v: 1, open: true } } })
    const reply = await $.command.run({ command: 'modsters', args: 'hunt' } as any)
    expect(reply).toEqual({ text: 'The encounter pane is off · turn it on in /config' })
    expect(seen.opens).toEqual([])
    expect(seen.store['prefs:huntPane']).toEqual({ v: 1, open: true })
  })

  test('encounterPane off closes a pane left open, keeping the reopen pref', { options: { encounterPane: 'off' } }, async ($, on) => {
    const pane: UiPane = { id: 'modster-hunt', title: 'Modster Hunter', isShown: true, isFocused: false, isPlaced: true }
    const { seen } = await start($, on, { panes: () => [pane], store: { 'prefs:huntPane': { v: 1, open: true } } })
    expect(seen.closes).toEqual(['modster-hunt:plugin'])
    expect(seen.store['prefs:huntPane']).toEqual({ v: 1, open: true })
  })
})
