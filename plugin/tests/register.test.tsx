import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'
import { catcherFiles } from './fixtures/catcher-files'
import { encodePng } from './fixtures/encode-png'
import { desktopOnlyForest } from './fixtures/desktop-only-forest'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { sceneForest } from './fixtures/scene-forest'
import { stubContentFs } from './fixtures/stub-content-fs'
import { validBiome } from './fixtures/valid-biome'
import { validModster } from './fixtures/valid-modster'
import { validUserModster } from './fixtures/valid-user-modster'
import { validSprite } from './fixtures/valid-sprite'
import { CATCH, DESKTOP, IDLE_TAG } from '../hooks/constants'
import { BUTTONS_AFTER_MS } from '../hooks/render'
import { throwingMs } from '../hooks/game'

// The game runs only while autoStart is on (decision 0038); these tests play it
const HUNTING = { options: { autoStart: true } }

// A throw that lands plays the whole catch animation (decision 0035); a miss is shorter
const CATCH_THROW_MS = throwingMs('caught', CATCH.rocksToCatch)

/** A user folder (paths under ~/.claude/modster-hunter/) with one biome whose Modster is a 2-frame PNG sheet. */
function userPngMeadow(): Record<string, string> {
  const biome = { schemaVersion: 1, id: 'pixel-meadow', name: 'Pixel Meadow', modsters: [{ id: 'blobby' }] }
  const modster = { ...validUserModster(), id: 'blobby', name: 'Blobby', sprite: { file: 'sprite.png', frames: 2 } }
  const samples = Array.from({ length: 16 * 8 }, (_, i) => (i % 5 === 0 ? 1 : 0))
  const png = encodePng({ width: 16, height: 8, colorType: 3, bitDepth: 1, samples, palette: [0, 0, 0, 46, 125, 50], transparency: [0] })
  return {
    'content/biomes/pixel-meadow/biome.json': JSON.stringify(biome),
    'content/modsters/blobby/modster.json': JSON.stringify(modster),
    'content/modsters/blobby/sprite.png': btoa(String.fromCharCode(...png)),
  }
}

/** A content folder with two one-Modster biomes. */
function twoBiomes(): Record<string, string> {
  const files: Record<string, string> = {}
  for (const [biome, name] of [['whispering-forest', 'Whispering Forest'], ['tidepool-shallows', 'Tidepool Shallows']] as const) {
    const json: Record<string, unknown> = { ...validBiome(), id: biome, name, modsters: [{ id: 'sproutling' }] }
    delete json.background
    files[`biomes/${biome}/biome.json`] = JSON.stringify(json)
  }
  files['modsters/sproutling/modster.json'] = JSON.stringify(validModster())
  files['modsters/sproutling/sprite.sprite.json'] = JSON.stringify(validSprite())
  return files
}

describe('register', () => {
  test('registers /modsters on session start', HUNTING, async ($, on) => {
    const names: string[] = []
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => {
      names.push(e.name)
      return { value: { command: e.name } }
    })
    stubContentFs(on, {})

    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    expect(names).toEqual(['modsters'])
  })

  test('with no biome to play, one message shows at start and from /modsters', HUNTING, async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    const { toasts } = stubContentFs(on, {})
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    const message = 'No biomes to play: every biome is disabled or failed to load'
    expect(toasts).toEqual([`Modster Hunter: ${message}`])
    expect(await collectionHeader($)).toEqual({ title: 'No biome', note: message })
  })

  test('user content loads from ~/.claude/modster-hunter/content, PNG sprites included (0007, 0016)', { options: { autoStart: true, includeBuiltins: false } }, async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    const user = userPngMeadow()
    // Built-ins are off, so the user's biome is the only one to pick
    stubContentFs(on, twoBiomes(), user)
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    expect((await collectionHeader($)).title).toBe('Pixel Meadow')
    // The decoded sheet is cached for the next session
    expect(JSON.parse(user['cache/sprites/blobby.sprite.json'] ?? '{}')).toMatchObject({ v: 1, source: { frames: 2 }, sprite: { width: 8, height: 8 } })
  })

  test('with built-ins off and no user biome, the message names the user folder', { options: { autoStart: true, includeBuiltins: false } }, async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    stubContentFs(on, twoBiomes())
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    expect((await collectionHeader($)).note).toBe(
      'No biomes to play: built-in content is off and no biome in ~/.claude/modster-hunter/content/ loaded',
    )
  })

  test('the biome picked at session start stays after /clear, /resume and /branch', HUNTING, async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    stubContentFs(on, twoBiomes())
    on('classic.SessionStart', () => ({}))
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    const reply = async () => (await collectionHeader($)).title
    const first = await reply()
    expect(['Whispering Forest', 'Tidepool Shallows']).toContain(first)

    for (const source of ['clear', 'resume', 'fork'] as const) {
      await $.classic.SessionStart({ source })
      expect(await reply()).toBe(first)
    }
  })

  test('a repeated session start in the same process keeps the biome', HUNTING, async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    stubContentFs(on, twoBiomes())
    const start = () => $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
    const reply = async () => (await collectionHeader($)).title

    await start()
    const first = await reply()
    // 20 restarts: with a fresh pick each time, keeping the same one of two biomes would be a 1 in 2^20 fluke
    for (let i = 0; i < 20; i++) {
      await start().catch(() => undefined) // the second register of /modsters throws; the biome is picked before that
      expect(await reply()).toBe(first)
    }
  })

  // The band, drawn on the terminal surface, through every phase (P2-07)
  test('the band walks a Modster through appearing, waiting, throw, the dot count, caught, and back to idle', HUNTING, async ($, on) => {
    const { ui, clock } = await startBand($, on)
    expect((await ui.find({ type: 'Text', text: /Whispering Forest/ }))?.type).toBe('Text')
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()

    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK)
    expect(await ui.find({ type: 'Text', text: 'appeared!' })).toBeDefined()
    expect(await ui.find({ type: 'Raster', key: 'sprite' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'throw' })).toBeUndefined()

    await clock.advance(1_000)
    expect(await ui.find({ type: 'Text', text: '3 throws left' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'throw' })).toBeDefined()

    await ui.press({ key: 'throw' })
    await clock.advance(BAND_TICK)
    // Still in flight: no rocks yet
    expect(await ui.find({ type: 'Text', text: '○ ○ ○' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'throw' })).toBeUndefined()
    // The first rock fills a dot (decision 0035 point 7)
    await clock.advance(1_000)
    expect(await ui.find({ type: 'Text', text: '● ○ ○' })).toBeDefined()

    await clock.advance(CATCH_THROW_MS - 1_000)
    expect(await ui.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()

    await clock.advance(4_000)
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()
    await ui.unmount()
  })

  test('an encounter left alone wanders off after the idle timeout', { options: { autoStart: true, encounterIdleTimeoutSec: 5 } }, async ($, on) => {
    const { ui, clock } = await startBand($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK)
    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1 } as any)
    await clock.advance(5_000)
    expect(await ui.find({ type: 'Text', text: 'Sproutling wandered off.' })).toBeDefined()
    await ui.unmount()
  })

  test('a Modster appears while only a background subagent runs, and not after it stops (0018)', HUNTING, async ($, on) => {
    // What Claude Code itself would answer beneath the mod
    on('classic.SubagentStart', () => ({}))
    on('classic.SubagentStop', () => ({}))
    const { ui, clock } = await startBand($, on)

    await $.classic.SubagentStart({ agent_id: 'a1', agent_type: 'general-purpose' } as any)
    await clock.advance(2_000)
    await $.classic.SubagentStop({ agent_id: 'a1', agent_type: 'general-purpose' } as any)
    await clock.advance(10_000) // 2 s of work so far: the countdown waits
    expect(await ui.find({ type: 'Text', text: 'appeared!' })).toBeUndefined()

    await $.classic.SubagentStart({ agent_id: 'a2', agent_type: 'general-purpose' } as any)
    await clock.advance(1_000 + BAND_TICK) // 3 s of work
    expect(await ui.find({ type: 'Text', text: 'appeared!' })).toBeDefined()
    await ui.unmount()
  })

  test('a short band uses the compact layout: no sprite, never more lines than maxRows', HUNTING, async ($, on) => {
    const { ui, clock } = await startBand($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_000 + BAND_TICK)
    for (const maxRows of [2, 1]) {
      await ui.redraw({ ...BAND_PROPS, maxRows } as any)
      expect(await ui.find({ type: 'Raster' })).toBeUndefined()
      expect(await ui.find({ type: 'Button', key: 'throw' })).toBeDefined()
    }
    await ui.redraw({ ...BAND_PROPS, maxRows: 2 } as any)
    expect(await ui.find({ type: 'Text', text: 'A wild Sproutling appeared!' })).toBeDefined()
    await ui.redraw({ ...BAND_PROPS, maxRows: 0 } as any)
    expect(await ui.find({ type: 'Text', text: /Sproutling/ })).toBeUndefined()
    await ui.unmount()
  })

  // Content with desktop art only (decision 0045 point 10)
  test('a Modster with desktop art only plays on the terminal in the compact text, and is caught', HUNTING, async ($, on) => {
    const { ui, clock } = await startBand($, on, desktopOnlyForest())
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_000 + BAND_TICK)
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Sproutling/ })).toBeDefined()
    await ui.press({ key: 'throw' })
    await clock.advance(BAND_TICK)
    // No terminal art to animate the throw: the dot count plays (0035 point 8)
    expect(await ui.find({ type: 'Text', text: '○ ○ ○' })).toBeDefined()
    await clock.advance(CATCH_THROW_MS)
    expect(await ui.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()
    await ui.unmount()
  })

  // With the scene off, so the Modster stands alone (0049 draws it in front of the scene otherwise)
  test('on desktop the band draws a desktop sheet beside the text: an image, not interactive, within maxRows (0045 point 9)', { options: { autoStart: true, showIdleScene: false } }, async ($, on) => {
    const { ui, clock } = await startBand($, on, desktopOnlyForest(), 'desktop')
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_000 + BAND_TICK)
    const svg = await ui.find({ type: 'Svg' })
    expect(svg?.props.alt).toBe('Sproutling')
    expect(svg?.props.source).toContain('<image href="data:image/png;base64,')
    expect(svg?.props.isInteractive).toBeUndefined()
    // The fixture sheet is 32×32 at the band's 0.5
    expect([svg?.props.width, svg?.props.height]).toEqual([32 * DESKTOP.sheetBandScale, 32 * DESKTOP.sheetBandScale])
    await ui.redraw({ ...BAND_PROPS, maxRows: 2 } as any)
    expect((await ui.find({ type: 'Svg' }))?.props.height).toBeLessThanOrEqual(2 * DESKTOP.rowPx)
    expect(await ui.find({ type: 'Button', key: 'throw' })).toBeDefined()
    await ui.unmount()
  })

  test('on desktop the band draws a biome\'s desktop background as its scene, an image, with its name as a tag in it (0045 point 4, 0047)', HUNTING, async ($, on) => {
    const { ui } = await startBand($, on, desktopOnlyForest(), 'desktop')
    const svg = await ui.find({ type: 'Svg' })
    expect(svg?.props.alt).toBe('Whispering Forest scene')
    expect(svg?.props.source).toContain('<image href="data:image/png;base64,')
    expect(svg?.props.isInteractive).toBeUndefined()
    // No text row under it on desktop: the name is a tag inside the scene (0047)
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    expect(svg?.props.source).toContain('>Whispering Forest</text>')
    await ui.unmount()
  })

  test('a biome with a desktop background only shows the idle line alone on the terminal', HUNTING, async ($, on) => {
    const { ui } = await startBand($, on, desktopOnlyForest())
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    await ui.unmount()
  })

  test('the idle line can be turned off', { options: { autoStart: true, showIdleLine: false } }, async ($, on) => {
    const { ui, clock } = await startBand($, on)
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    await ui.unmount()
  })

  // The biome idle scene (decision 0026)
  test('between encounters the band draws the biome scene above the idle line', HUNTING, async ($, on) => {
    const { ui } = await startBand($, on, sceneForest())
    expect(await ui.find({ type: 'Raster', key: 'scene' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    await ui.unmount()
  })

  test('the scene moves only while Claude works, and holds still between turns', HUNTING, async ($, on) => {
    const blits = sceneBlits(on)
    const { ui, clock } = await startBand($, on, sceneForest())
    await clock.advance(2_000)
    expect(blits.length).toBe(0)

    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(2_000) // under the 3 s before the Modster appears
    expect(blits.length).toBeGreaterThan(8)

    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1 } as any)
    const stopped = blits.length
    await clock.advance(2_000)
    expect(blits.length).toBe(stopped)
    expect(await ui.find({ type: 'Raster', key: 'scene' })).toBeDefined()
    await ui.unmount()
  })

  test('a background subagent moves the scene too (0018)', HUNTING, async ($, on) => {
    on('classic.SubagentStart', () => ({}))
    const blits = sceneBlits(on)
    const { ui, clock } = await startBand($, on, sceneForest())
    await $.classic.SubagentStart({ agent_id: 'a1', agent_type: 'general-purpose' } as any)
    await clock.advance(1_000)
    expect(blits.length).toBeGreaterThan(0)
    await ui.unmount()
  })

  test('an encounter replaces the scene and stops it; the scene comes back after', HUNTING, async ($, on) => {
    const blits = sceneBlits(on)
    const { ui, clock } = await startBand($, on, sceneForest())
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK)
    expect(await ui.find({ type: 'Raster', key: 'scene' })).toBeUndefined()
    expect(await ui.find({ type: 'Raster', key: 'sprite' })).toBeDefined()
    const during = blits.length
    await clock.advance(1_000)
    expect(blits.length).toBe(during)

    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1 } as any)
    await ui.press({ key: 'throw' })
    await clock.advance(CATCH_THROW_MS + 4_000 + BAND_TICK)
    expect(await ui.find({ type: 'Raster', key: 'scene' })).toBeDefined()
    await ui.unmount()
  })

  test('a band too short for the scene shows the idle line alone', HUNTING, async ($, on) => {
    const { ui } = await startBand($, on, sceneForest())
    await ui.redraw({ ...BAND_PROPS, maxRows: 4 } as any) // 4 scene rows + the line need 5
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    await ui.redraw({ ...BAND_PROPS, maxRows: 5 } as any)
    expect(await ui.find({ type: 'Raster', key: 'scene' })).toBeDefined()
    await ui.unmount()
  })

  test('the idle scene can be turned off, leaving the idle line', { options: { autoStart: true, showIdleScene: false } }, async ($, on) => {
    const blits = sceneBlits(on)
    const { ui, clock } = await startBand($, on, sceneForest())
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(2_000)
    expect(blits.length).toBe(0)
    await ui.unmount()
  })

  test('on desktop the scene is one vector Svg with the name tag in it: still between turns, moving while Claude works (0044, 0047)', HUNTING, async ($, on) => {
    const blits = sceneBlits(on)
    const { ui, clock } = await startBand($, on, sceneForest(), 'desktop')
    const still = await ui.find({ type: 'Svg' })
    expect(still?.props.alt).toBe('Whispering Forest scene')
    expect(still?.props.source).not.toContain('<animate')
    // 120 columns at DESKTOP.columnPx; 4 rows (8 px) at the full scale fit the 7-row band
    // No width: the box stops at the band's edge, and the markup, drawn wider, is cropped there (P5-48)
    expect([still?.props.width, still?.props.height]).toEqual([undefined, 8 * DESKTOP.columnPx])
    expect(still?.props.source).toContain(`width="${Math.ceil(120 * DESKTOP.sceneOvershoot) * DESKTOP.columnPx}"`)
    expect(still?.props.source).toContain('preserveAspectRatio="xMinYMin slice"')
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()

    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    expect((await ui.find({ type: 'Svg' }))?.props.source).toContain('repeatCount="indefinite"')
    await clock.advance(2_000)
    // The surface plays it: nothing is blitted or redrawn
    expect(blits.length).toBe(0)

    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1 } as any)
    expect((await ui.find({ type: 'Svg' }))?.props.source).toBe(still?.props.source)
    await ui.unmount()
  })

  test('on desktop a short band draws the strip smaller, with no row kept for a line (0047)', HUNTING, async ($, on) => {
    const { ui } = await startBand($, on, sceneForest(), 'desktop')
    // One row (rowPx) fits the 8 px strip at a smaller scale than columnPx
    await ui.redraw({ ...BAND_PROPS, maxRows: 1 } as any)
    expect((await ui.find({ type: 'Svg' }))?.props.height).toBe(8 * Math.floor(DESKTOP.rowPx / 8))
    await ui.redraw({ ...BAND_PROPS, maxRows: 2 } as any)
    expect((await ui.find({ type: 'Svg' }))?.props.height).toBe(8 * Math.floor((2 * DESKTOP.rowPx) / 8))
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    await ui.unmount()
  })

  test('on desktop the name tag fades once the biome has been shown, and a turn does not bring it back (0047)', HUNTING, async ($, on) => {
    const { ui, clock } = await startBand($, on, sceneForest(), 'desktop')
    expect((await ui.find({ type: 'Svg' }))?.props.source).toContain('>Whispering Forest</text>')
    await clock.advance(IDLE_TAG.showMs)
    expect((await ui.find({ type: 'Svg' }))?.props.source).toContain('<animate attributeName="opacity" from="1" to="0"')
    await clock.advance(IDLE_TAG.fadeMs)
    expect((await ui.find({ type: 'Svg' }))?.props.source).not.toContain('<text')
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1 } as any)
    expect((await ui.find({ type: 'Svg' }))?.props.source).not.toContain('<text')
    await ui.unmount()
  })

  test('on desktop the name tag waits for the band: a band first drawn late still shows it, then it fades (P5-56)', HUNTING, async ($, on) => {
    const clock = await startSession($, on, sceneForest())
    // The Code tab draws the band seconds after session start on a first load
    await clock.advance(IDLE_TAG.showMs + IDLE_TAG.fadeMs + 2_000)
    const ui = await $.ui.mount({ plugin: 'modster-hunter', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS as any })
    expect((await ui.find({ type: 'Svg' }))?.props.source).toContain('>Whispering Forest</text>')
    await clock.advance(IDLE_TAG.showMs)
    expect((await ui.find({ type: 'Svg' }))?.props.source).toContain('<animate attributeName="opacity" from="1" to="0"')
    await clock.advance(IDLE_TAG.fadeMs)
    expect((await ui.find({ type: 'Svg' }))?.props.source).not.toContain('<text')
    await ui.unmount()
  })

  test('on desktop the name tag waits while the encounter pane holds the band aside (0015, P5-56)', HUNTING, async ($, on) => {
    let paneShown = true
    const pane: UiPane = { id: 'modster-hunt', title: 'Modster Hunter', isShown: true, isFocused: false, isPlaced: true }
    const panes = (): UiPane[] => (paneShown ? [pane] : [])
    on('ui.panes', () => ({ value: panes() }))
    const { ui, clock } = await startBand($, on, sceneForest(), 'desktop')
    expect(await ui.find({ type: 'Svg' })).toBeUndefined()
    await clock.advance(IDLE_TAG.showMs + IDLE_TAG.fadeMs + 2_000)
    paneShown = false
    await ui.redraw(BAND_PROPS as any)
    expect((await ui.find({ type: 'Svg' }))?.props.source).toContain('>Whispering Forest</text>')
    await clock.advance(IDLE_TAG.showMs + IDLE_TAG.fadeMs)
    expect((await ui.find({ type: 'Svg' }))?.props.source).not.toContain('<text')
    await ui.unmount()
  })

  test('on desktop the tag pulses while Claude works, and shows again when an encounter ends (0047)', HUNTING, async ($, on) => {
    const { ui, clock } = await startBand($, on, oneModsterForest(), 'desktop')
    // No scene: the tag alone
    expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Whispering Forest')
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    expect((await ui.find({ type: 'Svg' }))?.props.source).toContain('values="1;0.3;1"')
    // An encounter comes and goes: it appears after 3 s, is caught, then its card ends
    await clock.advance(4_000 + BAND_TICK)
    expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Sproutling')
    await ui.press({ key: 'throw' })
    // The turn ends, so no next Modster comes before the check
    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1 } as any)
    // The throw, the caught beat, then the result card
    await clock.advance(CATCH_THROW_MS + CATCH.beatMs.caught + 5_000)
    expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Whispering Forest')
    await ui.unmount()
  })

  test('on desktop an encounter plays in the idle scene at its size: the arrival, then Throw and Run in the Client (0051)', HUNTING, async ($, on) => {
    const { ui, clock } = await startBand($, on, { ...sceneForest(), ...catcherFiles() }, 'desktop')
    const idle = await ui.find({ type: 'Svg' })
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK)
    const svgs = await ui.findAll({ type: 'Svg' })
    expect(svgs).toHaveLength(1)
    const scene = svgs[0]
    expect(scene?.props.alt).toBe('Sproutling in Whispering Forest')
    expect(scene?.props.source).toContain('data-motion="arrive/')
    expect(scene?.props.source).toContain('fill="url(#bg)"')
    expect(scene?.props.source).toContain('>Sproutling · common</text>')
    // The scene keeps its idle size, and the band has no lines (0051 points 1 and 6)
    expect(scene?.props.height).toBe(idle?.props.height)
    expect(await ui.find({ type: 'Text', text: /A wild Sproutling/ })).toBeUndefined()
    // The buttons show on the Client's own timer, once the slide has uncovered their backdrop
    expect(await ui.find({ type: 'Button', key: 'throw', in: 'encounter-controls' })).toBeUndefined()
    await ui.advance(BUTTONS_AFTER_MS)
    expect(await ui.find({ type: 'Button', key: 'throw', in: 'encounter-controls' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'run', in: 'encounter-controls' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '3 left', in: 'encounter-controls' })).toBeDefined()
    // The same arrival Svg until it's over
    await clock.advance(1_000)
    expect((await ui.find({ type: 'Svg' }))?.props.source).toBe(scene?.props.source)
    const throwAt = clock.now()
    await ui.press({ key: 'throw' })
    const thrown = (await ui.find({ type: 'Svg' }))?.props.source
    expect(thrown).toContain('data-motion="up/')
    expect(thrown).toContain(`data-throw="${throwAt}"`)
    await ui.unmount()
  })

  test('on desktop a click on the Modster throws, and a click on the scene elsewhere does not (0051 point 3)', HUNTING, async ($, on) => {
    const { ui, clock } = await startBand($, on, { ...sceneForest(), ...catcherFiles() }, 'desktop')
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK + 1_000)
    await ui.advance(BUTTONS_AFTER_MS)
    const hit = (await ui.find({ type: 'Client' }))?.props.props.hit
    expect(hit).toBeDefined()
    // What a Client posts is input: anything but a known action does nothing
    await ui.post({ action: 'catch-everything' })
    await ui.post('throw')
    await ui.pointer({ type: 'down', x: hit.right + 2, y: hit.top, button: 'left' })
    expect((await ui.find({ type: 'Svg' }))?.props.source).not.toContain('data-throw')
    await ui.pointer({ type: 'down', x: hit.left + 1, y: hit.top + 1, button: 'left' })
    expect((await ui.find({ type: 'Svg' }))?.props.source).toContain('data-throw')
    await ui.unmount()
  })

  test('on desktop a catch plays whole, then its catcher holds still and fades with the result, then the still scene (0053)', HUNTING, async ($, on) => {
    const { ui, clock } = await startBand($, on, { ...sceneForest(), ...catcherFiles() }, 'desktop')
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK + 1_000)
    await ui.advance(BUTTONS_AFTER_MS)
    await ui.press({ key: 'throw' })
    await clock.advance(CATCH_THROW_MS)
    // The caught beat still plays the throw
    expect((await ui.find({ type: 'Svg' }))?.props.source).toContain('data-throw')
    // The catch's last tick ends it and redraws
    await clock.advance(CATCH.beatMs.caught + 100)
    const leaving = (await ui.find({ type: 'Svg' }))?.props.source
    expect(leaving).toContain('data-motion="leave/')
    expect(leaving).toContain('>Caught Sproutling!</text>')
    // The catcher's last frame, the Modster inside it, made from the throw's end so it plays nothing again
    expect(leaving).toContain('data-part="catcher-move"')
    expect(leaving).toContain('<g data-part="modster" display="none">')
    expect(leaving).not.toContain('data-throw')
    expect(await ui.find({ type: 'Button', key: 'throw', in: 'encounter-controls' })).toBeUndefined()
    await clock.advance(1_000)
    await ui.redraw(BAND_PROPS as any)
    expect((await ui.find({ type: 'Svg' }))?.props.source).not.toContain('data-motion')
    await ui.unmount()
  })

  test('on desktop running reverses the arrival: the Modster turns into its silhouette and vanishes (0053)', HUNTING, async ($, on) => {
    const { ui, clock } = await startBand($, on, { ...sceneForest(), ...catcherFiles() }, 'desktop')
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK + 1_000)
    await ui.advance(BUTTONS_AFTER_MS)
    await ui.press({ key: 'run' })
    const leaving = (await ui.find({ type: 'Svg' }))?.props.source
    expect(leaving).toContain('>You ran from Sproutling.</text>')
    expect(leaving).toContain('filter="url(#mm-dark)"')
    expect(leaving).not.toContain('data-part="catcher-move"')
    await ui.unmount()
  })

  test('on desktop with showIdleScene off an encounter shows the Modster alone (0049)', { options: { autoStart: true, showIdleScene: false } }, async ($, on) => {
    const { ui, clock } = await startBand($, on, sceneForest(), 'desktop')
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK)
    const svg = await ui.find({ type: 'Svg' })
    expect(svg?.props.alt).toBe('Sproutling')
    expect(svg?.props.source).not.toContain('url(#bg)')
    await ui.unmount()
  })

  test('on desktop showIdleScene off leaves the name tag alone (0047)', { options: { autoStart: true, showIdleScene: false } }, async ($, on) => {
    const { ui } = await startBand($, on, sceneForest(), 'desktop')
    const tag = await ui.find({ type: 'Svg' })
    expect(tag?.props.alt).toBe('Whispering Forest')
    expect(tag?.props.source).not.toContain('<image')
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    await ui.unmount()
  })

  // /clear fires session.end, which stops the timers, and no session.start (P5-15)
  test('after /clear, a throw once Claude stops settles, and Modsters keep coming', HUNTING, async ($, on) => {
    const { ui, clock } = await startBand($, on)
    await clearSession($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_000 + BAND_TICK)
    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1 } as any)
    await ui.press({ key: 'throw' })
    await clock.advance(CATCH_THROW_MS + BAND_TICK)
    expect(await ui.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()
    await clock.advance(4_000)
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()

    // A new Modster still appears mid-turn, with no event but the tick to bring it
    await $.turn.start({ text: 'again', turnId: 't2' } as any)
    await clock.advance(3_000 + BAND_TICK)
    expect(await ui.find({ type: 'Text', text: 'appeared!' })).toBeDefined()
    await ui.unmount()
  })

  test('after /clear, a throw once Claude stops never stays on the throw: a miss offers Throw again', HUNTING, async ($, on) => {
    // The test engine can't script Math.random: at a 1% catch rate the throw misses
    // 99 times in 100, and either way the throw must settle
    const files = oneModsterForest()
    files['modsters/sproutling/modster.json'] = JSON.stringify({ ...validModster(), catchRate: 0.01 })
    const { ui, clock } = await startBand($, on, files)
    await clearSession($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_000 + BAND_TICK)
    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1 } as any)
    await ui.press({ key: 'throw' })
    await clock.advance(CATCH_THROW_MS + BAND_TICK)
    expect(await ui.find({ type: 'Text', text: /○/ })).toBeUndefined()
    if (!(await ui.find({ type: 'Text', text: 'Caught Sproutling!' }))) {
      expect(await ui.find({ type: 'Text', text: '2 throws left' })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: 'throw' })).toBeDefined()
    }
    await ui.unmount()
  })

  test('after /clear, an encounter that was up is dropped and stats go to the new session', HUNTING, async ($, on) => {
    const store: Record<string, unknown> = {}
    on('store.get', ($, e) => ({ value: structuredClone(store[e.key]) }))
    on('store.set', ($, e) => {
      store[e.key] = structuredClone(e.value)
      return { value: undefined }
    })
    let id = 'first'
    on('session.id', () => ({ value: id }))
    const { ui, clock } = await startBand($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_000 + BAND_TICK)
    id = 'second'
    await clearSession($)
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'throw' })).toBeUndefined()

    await $.turn.start({ text: 'again', turnId: 't2' } as any)
    await clock.advance(BAND_TICK)
    expect(store['stats:first']).toMatchObject({ turns: 1, encounters: 1, catches: 0, flees: 0 })
    expect(store['stats:second']).toMatchObject({ turns: 1, encounters: 0 })
    await ui.unmount()
  })

  test('the scene stops at session end', HUNTING, async ($, on) => {
    const blits = sceneBlits(on)
    const { ui, clock } = await startBand($, on, sceneForest())
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(1_000)
    await $.session.end({ reason: 'exit' } as any)
    const ended = blits.length
    await clock.advance(2_000)
    expect(blits.length).toBe(ended)
    await ui.unmount()
  })

  test('a catch is saved to the collection on top of what another session saved (0009)', HUNTING, async ($, on) => {
    // The store, answered from a map the test can read back. mock.store keeps its map to itself,
    // and the test engine has no $.store, so this stands in for it with the same get/set/keys.
    // Another Claude Code session already caught 5 Sproutlings in another biome.
    const store: Record<string, unknown> = {
      'caught:sproutling': { v: 1, count: 5, shinyCount: 0, firstCaughtAt: 1, lastCaughtAt: 2, bestTier: 'rare', biomes: { 'tidepool-shallows': 5 } },
    }
    on('store.get', ($, e) => ({ value: structuredClone(store[e.key]) }))
    on('store.set', ($, e) => {
      store[e.key] = structuredClone(e.value)
      return { value: undefined }
    })
    const { ui, clock } = await startBand($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_000 + BAND_TICK)
    await ui.press({ key: 'throw' })
    await clock.advance(CATCH_THROW_MS + BAND_TICK)

    // What the mod wrote, read back through the same in-memory store
    expect(store['caught:sproutling']).toMatchObject({
      v: 1,
      count: 6,
      bestTier: 'rare',
      biomes: { 'tidepool-shallows': 5, 'whispering-forest': 1 },
    })
    const statsKey = Object.keys(store).find((key) => key.startsWith('stats:'))
    expect(statsKey).toBeDefined()
    expect(store[statsKey ?? '']).toMatchObject({ turns: 1, encounters: 1, catches: 1, flees: 0 })
    await ui.unmount()
  })

  test('a Modster already in the collection appears with the caught mark (P5-10)', HUNTING, async ($, on) => {
    // Same in-memory stand-in for $.store as the catch test above
    const store: Record<string, unknown> = {
      'caught:sproutling': { v: 1, count: 1, shinyCount: 0, firstCaughtAt: 1, lastCaughtAt: 1, bestTier: 'common', biomes: { 'whispering-forest': 1 } },
    }
    on('store.get', ($, e) => ({ value: structuredClone(store[e.key]) }))
    on('store.set', ($, e) => {
      store[e.key] = structuredClone(e.value)
      return { value: undefined }
    })
    const { ui, clock } = await startBand($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_000 + BAND_TICK)
    expect((await ui.find({ type: 'Text', text: /●/ }))?.type).toBe('Text')
    await ui.unmount()
  })

  test('a first encounter has no caught mark, even after the catch (P5-10)', HUNTING, async ($, on) => {
    const store: Record<string, unknown> = {}
    on('store.get', ($, e) => ({ value: structuredClone(store[e.key]) }))
    on('store.set', ($, e) => {
      store[e.key] = structuredClone(e.value)
      return { value: undefined }
    })
    const { ui, clock } = await startBand($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_000 + BAND_TICK)
    expect(await ui.find({ type: 'Text', text: /^ ●$/ })).toBeUndefined()
    await ui.press({ key: 'throw' })
    await clock.advance(CATCH_THROW_MS + BAND_TICK)
    expect(store['caught:sproutling']).toBeDefined()
    // The mark follows the name; the dot count's ● is on a line of its own
    expect(await ui.find({ type: 'Text', text: /^ ●$/ })).toBeUndefined()
    await ui.unmount()
  })

  test('pressing Run shows the card, saves a run, and clears the band after it (0020)', HUNTING, async ($, on) => {
    // Same in-memory stand-in for $.store as the catch test above
    const store: Record<string, unknown> = {}
    on('store.get', ($, e) => ({ value: structuredClone(store[e.key]) }))
    on('store.set', ($, e) => {
      store[e.key] = structuredClone(e.value)
      return { value: undefined }
    })
    const { ui, clock } = await startBand($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_000 + BAND_TICK)
    expect(await ui.find({ type: 'Button', key: 'run' })).toBeDefined()

    await ui.press({ key: 'run' })
    await clock.advance(BAND_TICK)
    expect(await ui.find({ type: 'Text', text: 'You ran from Sproutling.' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'run' })).toBeUndefined()
    const statsKey = Object.keys(store).find((key) => key.startsWith('stats:'))
    expect(store[statsKey ?? '']).toMatchObject({ encounters: 1, runs: 1, flees: 0, catches: 0 })
    expect(Object.keys(store).some((key) => key.startsWith('caught:'))).toBe(false)

    await clock.advance(4_000)
    expect(await ui.find({ type: 'Text', text: 'You ran from Sproutling.' })).toBeUndefined()
    await ui.unmount()
  })
})


/** The collection pane's title and its no-biome note, as `/modsters` opens it (P3-01). */
async function collectionHeader($: any): Promise<{ title?: string; note?: string }> {
  const pane = await $.ui.mount({
    plugin: 'modster-hunter',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'modster-collection',
    props: { title: 'Modster collection', isFocused: true, bodyColumns: 120, placement: 'inline', scroll: { offset: 0, bodyRows: 8 }, view: {} },
  })
  // Texts keep no key in the drawn tree; the title is the pane's first Text
  const title = (await pane.findAll({ type: 'Text' }))[0]?.text
  const note = (await pane.find({ type: 'Text', text: /^No biomes to play/ }))?.text
  await pane.unmount()
  return { ...(title === undefined ? {} : { title }), ...(note === undefined ? {} : { note }) }
}
const BAND_TICK = 250
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }

/** Records the scene's blits as the engine would take them. */
function sceneBlits(on: On): unknown[] {
  const blits: unknown[] = []
  on('ui.blit', ($, e) => {
    if (e.key === 'scene') blits.push(e)
    return { value: {} }
  })
  return blits
}

/** What Claude Code does on /clear: ends the session, then starts a new one without session.start. */
async function clearSession($: any): Promise<void> {
  await $.session.end({ reason: 'clear' } as any)
  await $.classic.SessionStart({ source: 'clear' })
}

/** Starts a session on the one-Modster forest with a fake clock, and mounts the band. */
async function startBand($: any, on: On, files = oneModsterForest(), surface = 'terminal') {
  const clock = await startSession($, on, files)
  const ui = await $.ui.mount({ plugin: 'modster-hunter', surface, component: 'AbovePrompt', props: BAND_PROPS })
  // The band's timers run on the mock clock; advancing it fires them in order
  return { ui, clock }
}

/** Starts a session with `files` and nothing drawn yet; returns the mock clock. */
async function startSession($: any, on: On, files: Record<string, string>) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  stubContentFs(on, files)
  // What Claude Code itself would answer beneath the mod
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.end', () => ({ sessionId: 's1' }))
  on('classic.SessionStart', () => ({}))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return clock
}
