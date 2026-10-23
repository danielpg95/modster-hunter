import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'

// The Settings tab (decision 0040): every option as a row, k/j to choose, o to
// change it through /config, applied at once. The one-Modster forest spawns after
// 3 s of work; the appearing phase lasts 1 s.

const PANE_PROPS = { title: 'Modster collection', isFocused: true, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} }
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }
const WAITING = 4_250
const WELCOMED = { 'prefs:welcomed': { v: 1 } }

interface Seen {
  opens: string[]
  configSets: string[]
  toasts: string[]
  store: Record<string, unknown>
  /** The mod's $.state writes, last value per key */
  state: Record<string, unknown>
}

/** Starts a session on the one-Modster forest with a fake clock; `config.set` answers as /config would, or refuses. */
async function start($: any, on: On, init: { denyConfig?: string; panes?: () => UiPane[] } = {}) {
  const seen: Seen = { opens: [], configSets: [], toasts: [], store: structuredClone(WELCOMED), state: {} }
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.open', ($, e) => {
    seen.opens.push(e.focus ? `${e.id}:focus` : e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: init.panes?.() ?? [] }))
  on('ui.blit', () => ({ value: {} }))
  on('config.set', ($, e) => {
    seen.configSets.push(`${e.key}=${String(e.value)}`)
    return init.denyConfig ? { deny: init.denyConfig } : { value: e.value }
  })
  on('store.get', ($, e) => ({ value: structuredClone(seen.store[e.key]) }))
  on('store.set', ($, e) => {
    seen.store[e.key] = structuredClone(e.value)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: Object.keys(seen.store) }))
  // Watch the mod's $.state writes; the kit beneath keeps the values
  on('state.set', ($, e: any, next: any) => {
    seen.state[e.key] = e.value
    return next(e)
  })
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const { toasts } = stubContentFs(on, oneModsterForest())
  seen.toasts = toasts
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { clock, seen }
}

const mountPane = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Pane', requestId: 'modster-collection', props: PANE_PROPS })
const mountBand = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
const run = ($: any, args: string) => $.command.run({ command: 'modsters', args } as any)

/** The Settings tab, opened as /modsters settings opens it. */
async function settingsPane($: any) {
  await run($, 'settings')
  return mountPane($)
}

/** A setting row's text: the mark, the label and the value. */
async function row(pane: any, field: string): Promise<string> {
  return (await pane.find({ type: 'Button', key: `setting-${field}` }))?.text ?? ''
}

/** Selects `field` by pressing its row, then presses o. */
async function change(pane: any, field: string) {
  await pane.press({ key: `setting-${field}` })
  await pane.press({ key: 'setting-change' })
}

describe('register: Settings tab', () => {
  test('/modsters settings opens the collection pane with focus, on the Settings tab, Auto start selected', async ($, on) => {
    const { seen } = await start($, on)
    const pane = await settingsPane($)
    expect(seen.opens).toEqual(['modster-collection:focus'])
    expect(await row(pane, 'autoStart')).toMatch(/^▸ Auto start +on$/)
    expect(await row(pane, 'encounterPane')).toMatch(/^ {2}Encounter pane +when-opened$/)
    expect(await row(pane, 'encounterIdleTimeoutSec')).toMatch(/^ {2}Idle timeout +90 s$/)
    expect(await pane.find({ type: 'Button', key: 'setting-sounds' })).toBeUndefined()
    await pane.unmount()
  })

  test('j and k move the selection; o changes the selected row', async ($, on) => {
    const { seen } = await start($, on)
    const pane = await settingsPane($)
    await pane.press({ key: 'setting-down' })
    expect(await row(pane, 'showInBand')).toMatch(/^▸ /)
    await pane.press({ key: 'setting-up' })
    expect(await row(pane, 'autoStart')).toMatch(/^▸ /)
    await pane.press({ key: 'setting-down' })
    await pane.press({ key: 'setting-change' })
    expect(seen.configSets).toEqual(['modster-hunter.showInBand=false'])
    expect(await row(pane, 'showInBand')).toMatch(/off$/)
    await pane.unmount()
  })

  test('Auto start off stops the game at once, like /modsters stop', async ($, on) => {
    const { clock, seen } = await start($, on)
    const pane = await settingsPane($)
    await change(pane, 'autoStart')
    expect(seen.configSets).toEqual(['modster-hunter.autoStart=false'])
    expect(await row(pane, 'autoStart')).toMatch(/off$/)
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    await band.redraw()
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeUndefined()
    await band.unmount()
    await pane.unmount()
  })

  test('Show in the band off leaves the band empty between encounters at once', async ($, on) => {
    await start($, on)
    const band = await mountBand($)
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    const pane = await settingsPane($)
    await change(pane, 'showInBand')
    await band.redraw()
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    await pane.unmount()
    await band.unmount()
  })

  test('Idle line off hides the idle line at once', async ($, on) => {
    const { seen } = await start($, on)
    const band = await mountBand($)
    const pane = await settingsPane($)
    await change(pane, 'showIdleLine')
    expect(seen.configSets).toEqual(['modster-hunter.showIdleLine=false'])
    await band.redraw()
    expect(await band.find({ type: 'Text', text: /listening for Modsters/ })).toBeUndefined()
    await pane.unmount()
    await band.unmount()
  })

  test('Encounter pane moves to always and opens the pane at once, without focus', async ($, on) => {
    const { seen } = await start($, on)
    const pane = await settingsPane($)
    await change(pane, 'encounterPane')
    expect(seen.configSets).toEqual(['modster-hunter.encounterPane=always'])
    expect(await row(pane, 'encounterPane')).toMatch(/always$/)
    expect(seen.opens).toEqual(['modster-collection:focus', 'modster-hunt'])
    await pane.unmount()
  })

  test('Built-in content off reloads content and says what loaded', async ($, on) => {
    const { seen } = await start($, on)
    const pane = await settingsPane($)
    await change(pane, 'includeBuiltins')
    expect(seen.configSets).toEqual(['modster-hunter.includeBuiltins=false'])
    expect(seen.toasts.at(-1)).toMatch(/^Modster Hunter: reloaded/)
    expect(await row(pane, 'includeBuiltins')).toMatch(/off$/)
    await pane.unmount()
  })

  test('a new idle timeout waits for the next encounter; the one up keeps 90 s', async ($, on) => {
    const { clock } = await start($, on)
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    const pane = await settingsPane($)
    await change(pane, 'encounterIdleTimeoutSec')
    expect(await row(pane, 'encounterIdleTimeoutSec')).toMatch(/180 s$/)

    // The Modster up now wanders off at the old 90 s
    await clock.advance(90_000)
    await band.redraw()
    expect(await band.find({ type: 'Text', text: 'Sproutling wandered off.' })).toBeDefined()

    // The next one stays past 90 s and wanders off at 180 s
    await clock.advance(4_000 + 3_000 + 1_000)
    await band.redraw()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeDefined()
    await clock.advance(120_000)
    await band.redraw()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeDefined()
    await clock.advance(60_000)
    await band.redraw()
    expect(await band.find({ type: 'Text', text: 'Sproutling wandered off.' })).toBeDefined()
    await pane.unmount()
    await band.unmount()
  })

  test('a refused change keeps the value and says why', async ($, on) => {
    const { seen } = await start($, on, { denyConfig: 'locked' })
    const pane = await settingsPane($)
    await change(pane, 'showIdleScene')
    expect(seen.toasts.at(-1)).toBe("Modster Hunter: couldn't change Idle scene · locked")
    expect(await row(pane, 'showIdleScene')).toMatch(/on$/)
    await pane.unmount()
  })

  test('/modsters hunt and stop show in the Auto start row', async ($, on) => {
    await start($, on)
    await run($, 'stop')
    const pane = await settingsPane($)
    expect(await row(pane, 'autoStart')).toMatch(/off$/)
    await run($, 'hunt')
    await pane.redraw()
    expect(await row(pane, 'autoStart')).toMatch(/on$/)
    await pane.unmount()
  })

  // A /config change reloads the mod (seen in the P5-36 hand check): $.state keeps the view
  test('a change keeps the Settings tab and its row in $.state before writing, so a reload comes back to them', async ($, on) => {
    const { seen } = await start($, on)
    const pane = await settingsPane($)
    await change(pane, 'showIdleScene')
    expect(seen.state.paneTab).toBe('settings')
    expect(seen.state.settingsSelected).toBe('showIdleScene')
    await pane.unmount()
  })

  test('a tab press keeps the tab in $.state', async ($, on) => {
    const { seen } = await start($, on)
    const pane = await mountPane($)
    await pane.press({ key: 'biomes' })
    expect(seen.state.paneTab).toBe('biomes')
    await pane.unmount()
  })

  test('the session biome is kept in $.state, so a reload plays on in it', async ($, on) => {
    const { seen } = await start($, on)
    expect(seen.state.biomeId).toBe('whispering-forest')
  })
})
