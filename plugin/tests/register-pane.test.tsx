import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'
import { catcherFiles } from './fixtures/catcher-files'
import { desktopOnlyForest } from './fixtures/desktop-only-forest'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { sceneForest } from './fixtures/scene-forest'
import { stubContentFs } from './fixtures/stub-content-fs'
import { CATCH, DESKTOP, IDLE_TAG } from '../hooks/constants'
import { BUTTONS_AFTER_MS } from '../hooks/render'
import { throwingMs } from '../hooks/game'

// The game runs only while autoStart is on (decision 0038); these tests play it
const HUNTING = { options: { autoStart: true } }

// A throw that lands plays the whole catch animation (decision 0035); a miss is shorter
const CATCH_THROW_MS = throwingMs('caught', CATCH.rocksToCatch)

// The encounter pane (decision 0015): `/modsters pane`, drawn on the terminal surface.
// The one-Modster forest spawns after 3 s of work and always catches (catchRate 1).

const PANE_PROPS = { title: 'Modster Hunter', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} }
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }

async function start($: any, on: On, panes: () => UiPane[] = () => [], files = oneModsterForest()) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.panes', () => ({ value: panes() }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  stubContentFs(on, files)
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return clock
}

/** Records the idle scene's blits: which site each went to. */
function sceneBlits(on: On): string[] {
  const sites: string[] = []
  on('ui.blit', ($, e) => {
    if (e.key === 'scene') sites.push(e.requestId)
    return { value: {} }
  })
  return sites
}

const SHOWN: UiPane[] = [{ id: 'modster-hunt', title: 'Modster Hunter', isShown: true, isFocused: false, isPlaced: true }]

const mountPane = ($: any, props: Partial<typeof PANE_PROPS> = {}) =>
  $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Pane', requestId: 'modster-hunt', props: { ...PANE_PROPS, ...props } })
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
  test('/modsters pane opens the pane; it shows the biome while no Modster is here', HUNTING, async ($, on) => {
    await start($, on)
    expect(await $.command.run({ command: 'modsters', args: 'pane' } as any)).toEqual({})
    const pane = await mountPane($)
    expect(await pane.find({ type: 'Text', text: 'Whispering Forest' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Listening for Modsters/ })).toBeDefined()
    await pane.unmount()
  })

  test('the pane shows the encounter at the sprite\'s normal size, and Throw works from it', HUNTING, async ($, on) => {
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
    expect(await pane.find({ type: 'Text', text: '○ ○ ○' })).toBeDefined()
    await clock.advance(CATCH_THROW_MS)
    expect(await pane.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()
    await pane.unmount()
  })

  test('a Modster with desktop art only shows as text on the terminal and as its sheet in its biome on desktop, and Throw works (0045 points 9–10, 0051)', HUNTING, async ($, on) => {
    const clock = await start($, on, () => [], desktopOnlyForest())
    const pane = await mountPane($)
    const desktop = await $.ui.mount({ plugin: 'modster-hunter', surface: 'desktop', component: 'Pane', requestId: 'modster-hunt', props: PANE_PROPS as any })
    const idle = await desktop.find({ type: 'Svg' })
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_250)
    expect(await pane.find({ type: 'Raster' })).toBeUndefined()
    // It stands in the desktop background (0051): both sheets embedded in one Svg, at the idle scene's size
    const svg = await desktop.find({ type: 'Svg' })
    expect(String(svg?.props.source).split('<image href="data:image/png;base64,').length - 1).toBe(2)
    expect([svg?.props.width, svg?.props.height]).toEqual([undefined, idle?.props.height])
    expect(svg?.props.isInteractive).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: /Sproutling/ })).toBeDefined()
    await pane.press({ key: 'throw' })
    await clock.advance(250 + CATCH_THROW_MS)
    expect(await pane.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()
    await desktop.unmount()
    await pane.unmount()
  })

  test('on the desktop surface the pane draws the Modster as an animated Svg, and Throw still works (P5-06)', HUNTING, async ($, on) => {
    const clock = await start($, on)
    const pane = await $.ui.mount({ plugin: 'modster-hunter', surface: 'desktop', component: 'Pane', requestId: 'modster-hunt', props: PANE_PROPS })
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_250)
    const svg = await pane.find({ type: 'Svg' })
    expect(svg?.props.alt).toBe('Sproutling')
    expect(svg?.props.isInteractive).toBe(true)
    expect(svg?.props.source).toContain('<svg ')
    expect(await pane.find({ type: 'Raster' })).toBeUndefined()

    await clock.advance(1_000)
    await pane.press({ key: 'throw' })
    await clock.advance(250 + CATCH_THROW_MS)
    expect(await pane.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()
    await pane.unmount()
  })

  test('on desktop the encounter plays in the biome scene with the Client over it, and Throw works from the Client (0051)', HUNTING, async ($, on) => {
    const clock = await start($, on, () => [], { ...sceneForest(), ...catcherFiles() })
    const pane = await $.ui.mount({ plugin: 'modster-hunter', surface: 'desktop', component: 'Pane', requestId: 'modster-hunt', props: PANE_PROPS as any })
    const idle = await pane.find({ type: 'Svg' })
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_250)
    const svgs = await pane.findAll({ type: 'Svg' })
    expect(svgs).toHaveLength(1)
    const scene = svgs[0]
    expect(scene?.props.alt).toBe('Sproutling in Whispering Forest')
    expect(scene?.props.source).toContain('data-motion="arrive/')
    expect(scene?.props.source).toContain('fill="url(#bg)"')
    expect(scene?.props.source).toContain('#8d6e63')
    expect(scene?.props.height).toBe(idle?.props.height)
    // The scene shows the biome and the Modster's tag, so there's no header and no lines
    expect(await pane.find({ type: 'Text', text: 'Whispering Forest' })).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: /Sproutling/ })).toBeUndefined()

    await clock.advance(1_000)
    await pane.advance(BUTTONS_AFTER_MS)
    await pane.press({ key: 'throw' })
    await clock.advance(250)
    const thrown = await pane.find({ type: 'Svg' })
    expect(thrown?.props.alt).toBe('Sproutling in Whispering Forest')
    expect(thrown?.props.source).toContain('fill="url(#bg)"')
    // The vector throw (0043) stands where the Modster stood
    expect(thrown?.props.source).toContain('data-throw=')
    await clock.advance(CATCH_THROW_MS + CATCH.beatMs.caught)
    expect((await pane.find({ type: 'Svg' }))?.props.source).toContain('>Caught Sproutling!</text>')
    await pane.unmount()
  })

  test('with showIdleScene off the desktop pane draws the Modster alone (0048)', { options: { autoStart: true, showIdleScene: false } }, async ($, on) => {
    const clock = await start($, on, () => [], sceneForest())
    const pane = await $.ui.mount({ plugin: 'modster-hunter', surface: 'desktop', component: 'Pane', requestId: 'modster-hunt', props: PANE_PROPS as any })
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_250)
    const svg = await pane.find({ type: 'Svg' })
    expect(svg?.props.alt).toBe('Sproutling')
    expect(svg?.props.source).not.toContain('url(#bg)')
    // With no scene the header names the biome
    expect(await pane.find({ type: 'Text', text: 'Whispering Forest' })).toBeDefined()
    await pane.unmount()
  })

  test('the terminal pane is unchanged with a scene: the sprite as a Raster, no Svg (0048)', HUNTING, async ($, on) => {
    const clock = await start($, on, () => [], sceneForest())
    const pane = await mountPane($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_250)
    expect(await pane.find({ type: 'Raster', key: 'sprite' })).toBeDefined()
    expect(await pane.find({ type: 'Svg' })).toBeUndefined()
    await pane.unmount()
  })

  test('on the desktop surface the band draws the Modster as an Svg beside its text, within maxRows (P5-06)', HUNTING, async ($, on) => {
    const clock = await start($, on)
    const band = await $.ui.mount({ plugin: 'modster-hunter', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
    // Between encounters, with no scene, the band shows the biome's name tag (0047)
    expect((await band.find({ type: 'Svg' }))?.props.alt).toBe('Whispering Forest')
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_250)
    const svg = await band.find({ type: 'Svg' })
    expect(svg?.props.alt).toBe('Sproutling')
    // The 8 px sprite fits the 7-row band at bandScale (16 px)
    expect([svg?.props.width, svg?.props.height]).toEqual([16, 16])
    expect(await band.find({ type: 'Raster' })).toBeUndefined()
    await clock.advance(1_000)
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeDefined()
    await band.unmount()
  })

  test('the band steps aside while the pane is shown, and takes the encounter back when it isn\'t', HUNTING, async ($, on) => {
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

  test('a pane in another tab, or not placed yet, doesn\'t hide the band', HUNTING, async ($, on) => {
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

  test('the mod never opens the pane by itself for someone who never opened it', HUNTING, async ($, on) => {
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
    await $.command.run({ command: 'modsters', args: 'pane' } as any)
    expect(opened).toEqual(['modster-hunt'])
  })

  test('the pane shows the caught mark for a Modster already in the collection (P5-11)', HUNTING, async ($, on) => {
    stubStore(on, {
      'caught:sproutling': { v: 1, count: 1, shinyCount: 0, firstCaughtAt: 1, lastCaughtAt: 1, bestTier: 'common', biomes: { 'whispering-forest': 1 } },
    })
    const clock = await start($, on)
    const pane = await mountPane($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_250)
    expect(await pane.find({ type: 'Text', text: /●/ })).toBeDefined()
    await pane.unmount()
  })

  test('a first encounter in the pane has no caught mark (P5-11)', HUNTING, async ($, on) => {
    stubStore(on)
    const clock = await start($, on)
    const pane = await mountPane($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_250)
    expect(await pane.find({ type: 'Text', text: 'appeared!' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /●/ })).toBeUndefined()
    await pane.unmount()
  })

  // Focus and hints (0024)
  test('/modsters pane opens the pane with focus', HUNTING, async ($, on) => {
    const opens = recordOpens(on)
    await startSession($, on)
    await $.command.run({ command: 'modsters', args: 'pane' } as any)
    expect(opens).toEqual([{ id: 'modster-hunt', focus: true }])
  })

  test('the pane\'s Throw and Run read 1: Throw and 2: Run', HUNTING, async ($, on) => {
    const clock = await start($, on)
    const pane = await mountPane($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_250)
    for (const key of ['throw', 'run']) {
      const button = await pane.find({ type: 'Button', key })
      expect([button?.props.plain, button?.props.hotkey]).toEqual([true, key === 'throw' ? '1' : '2'])
    }
    await pane.unmount()
  })

  test('the header says how to move the keys, by focus and placement', HUNTING, async ($, on) => {
    await start($, on)
    const cases = [
      [{ isFocused: true, placement: 'dock', bodyColumns: 100 }, ' · Esc: back to prompt'],
      [{ isFocused: true, placement: 'inline', bodyColumns: 100 }, ' · Esc: back to prompt · ctrl+x x: close'],
      [{ isFocused: false, placement: 'dock', bodyColumns: 100 }, ' · ctrl+x tab to play'],
      [{ isFocused: false, placement: 'inline', bodyColumns: 100 }, ' · ctrl+x tab to play'],
    ] as const
    for (const [props, hint] of cases) {
      const pane = await mountPane($, props)
      expect(await pane.find({ type: 'Text', text: hint })).toBeDefined()
      // One hint at a time: an inline pane with focus shows the long one only
      expect(await pane.find({ type: 'Text', text: /ctrl\+x|Esc/ })).toEqual(await pane.find({ type: 'Text', text: hint }))
      await pane.unmount()
    }
  })

  test('a narrow pane leaves the hint out before the biome name', HUNTING, async ($, on) => {
    await start($, on)
    const pane = await mountPane($, { isFocused: false, bodyColumns: 40 })
    expect(await pane.find({ type: 'Text', text: /ctrl\+x|Esc/ })).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: 'Whispering Forest' })).toBeDefined()
    await pane.unmount()
  })

  // Reopening for people who opened it (0019)
  test('/modsters pane remembers the pane is open', HUNTING, async ($, on) => {
    const store = stubStore(on)
    recordOpens(on)
    const clock = await startSession($, on)
    await $.command.run({ command: 'modsters', args: 'pane' } as any)
    await clock.advance(0)
    expect(store['prefs:huntPane']).toEqual(OPEN)
  })

  test('the pane reopens at session start, without focus, for someone who left it open', HUNTING, async ($, on) => {
    stubStore(on, { 'prefs:huntPane': OPEN })
    const opens = recordOpens(on)
    await startSession($, on)
    expect(opens).toEqual([{ id: 'modster-hunt' }])
  })

  test('/clear, /resume and /branch reopen it too', HUNTING, async ($, on) => {
    stubStore(on, { 'prefs:huntPane': OPEN })
    const opens = recordOpens(on)
    await startSession($, on)
    for (const source of ['clear', 'resume', 'fork'] as const) await $.classic.SessionStart({ source })
    expect(opens).toEqual(Array.from({ length: 4 }, () => ({ id: 'modster-hunt' })))
  })

  test('a pane closed by hand doesn\'t reopen', HUNTING, async ($, on) => {
    const store = stubStore(on, { 'prefs:huntPane': CLOSED })
    const opens = recordOpens(on)
    await startSession($, on)
    await $.classic.SessionStart({ source: 'clear' })
    expect(opens).toEqual([])
    expect(store['prefs:huntPane']).toEqual(CLOSED)
  })

  test('a pref it can\'t read doesn\'t reopen the pane', HUNTING, async ($, on) => {
    stubStore(on, { 'prefs:huntPane': { v: 2, open: true } })
    const opens = recordOpens(on)
    await startSession($, on)
    expect(opens).toEqual([])
  })

  test('a reopened pane that isn\'t placed leaves the encounter in the band', HUNTING, async ($, on) => {
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

  // The idle scene in the pane (decision 0027)
  test('between encounters the pane shows the biome scene above its idle text', HUNTING, async ($, on) => {
    await start($, on, () => SHOWN, sceneForest())
    const pane = await mountPane($)
    expect(await pane.find({ type: 'Raster', key: 'scene' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Listening for Modsters/ })).toBeDefined()
    await pane.unmount()
  })

  test('on desktop the idle pane shows the band\'s vector scene with no header or idle text: still between turns, moving while Claude works (0027, 0044)', HUNTING, async ($, on) => {
    const clock = await start($, on, () => SHOWN, sceneForest())
    const pane = await $.ui.mount({ plugin: 'modster-hunter', surface: 'desktop', component: 'Pane', requestId: 'modster-hunt', props: PANE_PROPS as any })
    const still = await pane.find({ type: 'Svg' })
    expect(still?.props.alt).toBe('Whispering Forest scene')
    expect(still?.props.source).toContain('fill="url(#bg)"')
    expect(still?.props.source).not.toContain('<animate')
    // The tag in the scene takes the header's and the idle text's place (0047)
    expect(await pane.find({ type: 'Text', text: /Listening for Modsters/ })).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: 'Whispering Forest' })).toBeUndefined()
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(250)
    expect((await pane.find({ type: 'Svg' }))?.props.source).toContain('repeatCount="indefinite"')
    await pane.unmount()
  })

  test('on desktop the idle pane shows the biome\'s name tag in its scene, which fades as in the band (0047)', HUNTING, async ($, on) => {
    const clock = await start($, on, () => SHOWN, sceneForest())
    const pane = await $.ui.mount({ plugin: 'modster-hunter', surface: 'desktop', component: 'Pane', requestId: 'modster-hunt', props: PANE_PROPS as any })
    expect((await pane.find({ type: 'Svg' }))?.props.source).toContain('>Whispering Forest</text>')
    await clock.advance(IDLE_TAG.showMs + IDLE_TAG.fadeMs)
    await pane.redraw(PANE_PROPS as any)
    const faded = await pane.find({ type: 'Svg' })
    expect(faded?.props.source).toContain('fill="url(#bg)"')
    expect(faded?.props.source).not.toContain('<text')
    await pane.unmount()
  })

  test('on desktop with showIdleScene off the idle pane keeps its text alone', { options: { autoStart: true, showIdleScene: false } }, async ($, on) => {
    await start($, on, () => SHOWN, sceneForest())
    const pane = await $.ui.mount({ plugin: 'modster-hunter', surface: 'desktop', component: 'Pane', requestId: 'modster-hunt', props: PANE_PROPS as any })
    expect(await pane.find({ type: 'Svg' })).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: /Listening for Modsters/ })).toBeDefined()
    await pane.unmount()
  })

  test('the pane scene moves only while Claude works, and the band that stepped aside gets no blits', HUNTING, async ($, on) => {
    on('turn.complete', () => ({ text: '' }))
    const blits = sceneBlits(on)
    const clock = await start($, on, () => SHOWN, sceneForest())
    const band = await mountBand($)
    const pane = await mountPane($)
    await clock.advance(2_000)
    expect(blits.length).toBe(0)

    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(2_000) // under the 3 s before the Modster appears
    expect(blits.length).toBeGreaterThan(8)
    expect(new Set(blits)).toEqual(new Set(['modster-hunt']))
    expect(await band.find({ type: 'Raster' })).toBeUndefined()

    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1 } as any)
    const stopped = blits.length
    await clock.advance(2_000)
    expect(blits.length).toBe(stopped)
    await band.unmount()
    await pane.unmount()
  })

  test('an encounter replaces the pane scene', HUNTING, async ($, on) => {
    const clock = await start($, on, () => SHOWN, sceneForest())
    const pane = await mountPane($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_250)
    expect(await pane.find({ type: 'Raster', key: 'scene' })).toBeUndefined()
    expect(await pane.find({ type: 'Raster', key: 'sprite' })).toBeDefined()
    await pane.unmount()
  })

  test('a pane too short for the scene keeps its idle text', HUNTING, async ($, on) => {
    await start($, on, () => SHOWN, sceneForest())
    // 6 body rows leave 4 after the header and blank row; the 4-row scene and its text need 5
    const short = await mountPane($, { scroll: { offset: 0, bodyRows: 6 } })
    expect(await short.find({ type: 'Raster' })).toBeUndefined()
    expect(await short.find({ type: 'Text', text: /Listening for Modsters/ })).toBeDefined()
    await short.redraw({ ...PANE_PROPS, scroll: { offset: 0, bodyRows: 7 } } as any)
    expect(await short.find({ type: 'Raster', key: 'scene' })).toBeDefined()
    await short.unmount()
  })

  test('showIdleScene off keeps the pane text-only', { options: { autoStart: true, showIdleScene: false } }, async ($, on) => {
    await start($, on, () => SHOWN, sceneForest())
    const pane = await mountPane($)
    expect(await pane.find({ type: 'Raster' })).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: /Listening for Modsters/ })).toBeDefined()
    await pane.unmount()
  })
})
