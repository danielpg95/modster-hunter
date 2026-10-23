import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'
import { helpText } from '../hooks/render'
import { WELCOME_TOAST_MS } from '../hooks/constants'

// Hunting (decisions 0038, 0041): the game runs only while `autoStart` is on (the
// default), and /modsters hunt, stop and pane flip it through /config. The one-Modster forest
// spawns after 3 s of work; the appearing phase lasts 1 s.

const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }
const SPINNER_PROPS = { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' }
const WAITING = 4_250
const HUNTING = { options: { autoStart: true } }
// Turned off by the player (0041 makes on the default)
const OFF = { options: { autoStart: false } }
const WELCOMED = { 'prefs:welcomed': { v: 1 } }
const HUNT_PANE: UiPane = { id: 'modster-hunt', title: 'Modster Hunter', isShown: true, isFocused: false, isPlaced: true }

interface Seen {
  statuses: (string | undefined)[]
  spinner: (string | null)[]
  opens: string[]
  closes: string[]
  configSets: string[]
  argumentHints: (string | undefined)[]
  immediate: (boolean | undefined)[]
  toasts: string[]
  toastTimeouts: (number | undefined)[]
  store: Record<string, unknown>
}

/** Starts a session on the one-Modster forest with a fake clock, recording what the mod shows and writes. */
async function start($: any, on: On, init: { store?: Record<string, unknown>; panes?: () => UiPane[]; denyConfig?: string } = {}) {
  const seen: Seen = { statuses: [], spinner: [], opens: [], closes: [], configSets: [], argumentHints: [], immediate: [], toasts: [], toastTimeouts: [], store: structuredClone(init.store ?? {}) }
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => {
    seen.argumentHints.push(e.argumentHint)
    seen.immediate.push(e.immediate)
    return { value: { command: e.name } }
  })
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.end', () => ({ sessionId: 's1' }))
  on('classic.SessionStart', () => ({}))
  on('ui.status', ($, e) => {
    seen.statuses.push(e.text)
    return { value: undefined }
  })
  on('ui.open', ($, e) => {
    seen.opens.push(e.focus ? `${e.id}:focus` : e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, e) => {
    seen.closes.push(`${e.id}:${e.origin.kind}`)
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: init.panes?.() ?? [] }))
  on('ui.blit', () => ({ value: {} }))
  // /config, as the engine would answer the mod's own row
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
  on('ui.render', { component: 'Spinner' }, ($, e) => {
    seen.spinner.push(e.props.message)
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const { toasts, toastTimeouts } = stubContentFs(on, oneModsterForest())
  seen.toasts = toasts
  seen.toastTimeouts = toastTimeouts
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { clock, seen }
}

const mountBand = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
const mountSpinner = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Spinner', requestId: 'main', props: SPINNER_PROPS })
const run = ($: any, args: string) => $.command.run({ command: 'modsters', args } as any)
const last = <T,>(list: T[]): T | undefined => list[list.length - 1]

describe('register: opt-in hunting', () => {
  // Off (point 1)
  test('turned off: the band draws nothing, even while Claude works', OFF, async ($, on) => {
    const { clock } = await start($, on, { store: WELCOMED })
    const band = await mountBand($)
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    await band.redraw()
    expect(await band.find({ type: 'Raster' })).toBeUndefined()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeUndefined()
    await band.unmount()
  })

  test('off: no spinner text, no status line, no turn stats', OFF, async ($, on) => {
    const { clock, seen } = await start($, on, { store: WELCOMED })
    const spinner = await mountSpinner($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    await spinner.redraw()
    expect(seen.spinner.every((message) => message === null)).toBe(true)
    expect(seen.statuses.every((text) => text === undefined)).toBe(true)
    expect(Object.keys(seen.store).filter((key) => key.startsWith('stats:'))).toEqual([])
    await spinner.unmount()
  })

  test('off: the encounter pane never reopens, and one left open is closed by the mod', OFF, async ($, on) => {
    const { seen } = await start($, on, { store: { ...WELCOMED, 'prefs:huntPane': { v: 1, open: true } }, panes: () => [HUNT_PANE] })
    await $.classic.SessionStart({ source: 'clear' })
    expect(seen.opens).toEqual([])
    expect(seen.closes).toEqual(['modster-hunt:plugin'])
    // A close by the mod keeps the reopen pref for when the game starts (0019 point 2)
    expect(seen.store['prefs:huntPane']).toEqual({ v: 1, open: true })
  })

  test('off: /modsters still opens the collection', OFF, async ($, on) => {
    const { seen } = await start($, on, { store: WELCOMED })
    await run($, '')
    expect(seen.opens).toEqual(['modster-collection:focus'])
  })

  test('by default the game plays from the start', async ($, on) => {
    const { clock } = await start($, on, { store: WELCOMED })
    const band = await mountBand($)
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    await band.redraw()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeDefined()
    await band.unmount()
  })

  // Welcome (0038 point 9, 0041)
  test('every player gets the welcome toast once, for 15 s, and the game is on', async ($, on) => {
    const { seen } = await start($, on)
    expect(seen.toasts).toEqual(['Modster Hunter is on · Modsters show up while Claude works · /modsters stop to turn it off · /modsters help for more'])
    expect(seen.store['prefs:welcomed']).toEqual({ v: 1 })
    // Long enough to read at session start; the 4 s default went by unread
    expect(seen.toastTimeouts).toEqual([WELCOME_TOAST_MS])
    expect(WELCOME_TOAST_MS).toBeGreaterThanOrEqual(10_000)
    const band = await mountBand($)
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    await band.unmount()
    await $.session.end({ reason: 'exit' } as any)
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
    expect(seen.toasts).toHaveLength(1)
  })

  test('a player who already played gets the same welcome, and nothing writes /config', async ($, on) => {
    const { seen } = await start($, on, { store: { 'caught:sproutling': { v: 1, count: 1 } } })
    expect(seen.toasts).toEqual(['Modster Hunter is on · Modsters show up while Claude works · /modsters stop to turn it off · /modsters help for more'])
    expect(seen.configSets).toEqual([])
  })

  test('a player who turned the game off still gets the welcome once, and it stays off', OFF, async ($, on) => {
    const { seen } = await start($, on)
    expect(seen.toasts).toHaveLength(1)
    const band = await mountBand($)
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    await band.unmount()
  })

  // /modsters hunt (point 3)
  test('/modsters hunt turns autoStart on, replies with the biome, and Modsters appear', OFF, async ($, on) => {
    const { clock, seen } = await start($, on, { store: WELCOMED })
    expect(await run($, 'hunt')).toEqual({ text: 'Hunting in Whispering Forest · Modsters show up while Claude works · /modsters stop to stop' })
    expect(seen.configSets).toEqual(['modster-hunter.autoStart=true'])
    const band = await mountBand($)
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    await band.redraw()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeDefined()
    await band.unmount()
  })

  test('/modsters hunt while hunting gives the same reply and writes nothing', HUNTING, async ($, on) => {
    const { seen } = await start($, on, { store: WELCOMED })
    expect(await run($, 'hunt')).toEqual({ text: 'Hunting in Whispering Forest · Modsters show up while Claude works · /modsters stop to stop' })
    expect(seen.configSets).toEqual([])
  })

  test('/modsters hunt reopens the encounter pane for someone who left it open (0019)', OFF, async ($, on) => {
    const { seen } = await start($, on, { store: { ...WELCOMED, 'prefs:huntPane': { v: 1, open: true } } })
    await run($, 'hunt')
    expect(seen.opens).toEqual(['modster-hunt'])
  })

  test('a refused /modsters hunt says why and the game stays off', OFF, async ($, on) => {
    const { seen } = await start($, on, { store: WELCOMED, denyConfig: 'set by your organization' })
    expect(await run($, 'hunt')).toEqual({ text: "Modster Hunter: couldn't turn Auto start on · set by your organization" })
    const band = await mountBand($)
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    expect(seen.configSets).toEqual(['modster-hunter.autoStart=true'])
    await band.unmount()
  })

  // /modsters stop (point 4)
  test('/modsters stop mid-encounter turns autoStart off and clears everything, without a result', HUNTING, async ($, on) => {
    let panes: UiPane[] = []
    const { clock, seen } = await start($, on, { store: WELCOMED, panes: () => panes })
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    expect(last(seen.statuses)).toBeDefined()
    panes = [HUNT_PANE]

    expect(await run($, 'stop')).toEqual({ text: 'Modster Hunter stopped · /modsters hunt to play again' })
    expect(seen.configSets).toEqual(['modster-hunter.autoStart=false'])
    expect(last(seen.statuses)).toBeUndefined()
    expect(seen.closes).toEqual(['modster-hunt:plugin'])
    await band.redraw()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeUndefined()
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()

    // Neither fled nor ran: the encounter just ends
    await clock.advance(120_000)
    const stats = Object.entries(seen.store).filter(([key]) => key.startsWith('stats:')).map(([, value]) => value)
    expect(stats).toEqual([expect.objectContaining({ encounters: 1, catches: 0, flees: 0, runs: 0 })])
    await band.unmount()
  })

  test('a refused /modsters stop says why and the game keeps playing', { options: { autoStart: true } }, async ($, on) => {
    await start($, on, { store: WELCOMED, denyConfig: 'locked' })
    expect(await run($, 'stop')).toEqual({ text: "Modster Hunter: couldn't turn Auto start off · locked" })
    const band = await mountBand($)
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    await band.unmount()
  })

  // /modsters pane (point 5)
  test('/modsters pane while off turns the game on and opens the pane with focus', OFF, async ($, on) => {
    const { seen } = await start($, on, { store: WELCOMED })
    expect(await run($, 'pane')).toEqual({})
    expect(seen.configSets).toEqual(['modster-hunter.autoStart=true'])
    expect(seen.opens).toEqual(['modster-hunt:focus'])
    expect(seen.store['prefs:huntPane']).toEqual({ v: 1, open: true })
  })

  // Help, unknown words and the typeahead (points 6–8)
  test('/modsters help shows the quickstart with Auto start off or on', OFF, async ($, on) => {
    await start($, on, { store: WELCOMED })
    expect(await run($, 'help')).toEqual({ text: helpText(false) })
    await run($, 'hunt')
    expect(await run($, 'help')).toEqual({ text: helpText(true) })
  })

  test('an unknown word gets the help instead of the collection', OFF, async ($, on) => {
    const { seen } = await start($, on, { store: WELCOMED })
    expect(await run($, 'hutn')).toEqual({ text: `Modster Hunter doesn't know "hutn"\n${helpText(false)}` })
    expect(seen.opens).toEqual([])
  })

  test('/modsters is registered with the subcommands as its typeahead hint', async ($, on) => {
    const { seen } = await start($, on, { store: WELCOMED })
    expect(seen.argumentHints).toEqual(['[hunt | stop | pane | settings | reload | help]'])
  })

  test('/modsters is registered as immediate, so it runs while Claude works (0039)', async ($, on) => {
    const { seen } = await start($, on, { store: WELCOMED })
    expect(seen.immediate).toEqual([true])
  })

  test('/modsters reload while off loads content but doesn\'t start the game', OFF, async ($, on) => {
    const { clock } = await start($, on, { store: WELCOMED })
    const reply = await run($, 'reload')
    expect(reply.text).toContain('reloaded')
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(WAITING)
    await band.redraw()
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeUndefined()
    expect(await band.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    await band.unmount()
  })
})
