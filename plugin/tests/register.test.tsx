import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { encodePng } from './fixtures/encode-png'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'
import { validBiome } from './fixtures/valid-biome'
import { validModster } from './fixtures/valid-modster'
import { validSprite } from './fixtures/valid-sprite'

/** A user folder (paths under ~/.claude/modster-hunter/) with one biome whose Modster is a 2-frame PNG sheet. */
function userPngMeadow(): Record<string, string> {
  const biome = { schemaVersion: 1, id: 'pixel-meadow', name: 'Pixel Meadow', modsters: [{ id: 'blobby', weight: 1 }] }
  const modster = { ...validModster(), id: 'blobby', name: 'Blobby', sprite: { file: 'sprite.png', frames: 2 } }
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
    const json: Record<string, unknown> = { ...validBiome(), id: biome, name, modsters: [{ id: 'sproutling', weight: 1 }] }
    delete json.background
    files[`biomes/${biome}/biome.json`] = JSON.stringify(json)
  }
  files['modsters/sproutling/modster.json'] = JSON.stringify(validModster())
  files['modsters/sproutling/sprite.sprite.json'] = JSON.stringify(validSprite())
  return files
}

describe('register', () => {
  test('registers /modsters on session start', async ($, on) => {
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

  test('with no biome to play, one message shows at start and from /modsters', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    const { toasts } = stubContentFs(on, {})
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    const message = 'No biomes to play: every biome is disabled or failed to load'
    expect(toasts).toEqual([`Modster Hunter: ${message}`])
    const result = (await $.command.run({ command: 'modsters' } as any)) as { text: string }
    expect(result.text).toBe(`Modster Hunter is loaded · ${message}`)
  })

  test('user content loads from ~/.claude/modster-hunter/content, PNG sprites included (0007, 0016)', { options: { includeBuiltins: false } }, async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    const user = userPngMeadow()
    // Built-ins are off, so the user's biome is the only one to pick
    stubContentFs(on, twoBiomes(), user)
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    const result = (await $.command.run({ command: 'modsters' } as any)) as { text: string }
    expect(result.text).toBe("Modster Hunter is loaded · You're in Pixel Meadow")
    // The decoded sheet is cached for the next session
    expect(JSON.parse(user['cache/sprites/blobby.sprite.json'] ?? '{}')).toMatchObject({ v: 1, source: { frames: 2 }, sprite: { width: 8, height: 8 } })
  })

  test('with built-ins off and no user biome, the message names the user folder', { options: { includeBuiltins: false } }, async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    stubContentFs(on, twoBiomes())
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    const result = (await $.command.run({ command: 'modsters' } as any)) as { text: string }
    expect(result.text).toBe(
      'Modster Hunter is loaded · No biomes to play: built-in content is off and no biome in ~/.claude/modster-hunter/content/ loaded',
    )
  })

  test('the biome picked at session start stays after /clear, /resume and /branch', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    stubContentFs(on, twoBiomes())
    on('classic.SessionStart', () => ({}))
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)

    const reply = async () => ((await $.command.run({ command: 'modsters' } as any)) as { text: string }).text
    const first = await reply()
    expect(['Whispering Forest', 'Tidepool Shallows'].some((name) => first.endsWith(`You're in ${name}`))).toBe(true)

    for (const source of ['clear', 'resume', 'fork'] as const) {
      await $.classic.SessionStart({ source })
      expect(await reply()).toBe(first)
    }
  })

  test('a repeated session start in the same process keeps the biome', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    stubContentFs(on, twoBiomes())
    const start = () => $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
    const reply = async () => ((await $.command.run({ command: 'modsters' } as any)) as { text: string }).text

    await start()
    const first = await reply()
    // 20 restarts: with a fresh pick each time, keeping the same one of two biomes would be a 1 in 2^20 fluke
    for (let i = 0; i < 20; i++) {
      await start().catch(() => undefined) // the second register of /modsters throws; the biome is picked before that
      expect(await reply()).toBe(first)
    }
  })

  // The band, drawn on the terminal surface, through every phase (P2-07)
  test('the band walks a Modster through appearing, waiting, throw, wobble, caught, and back to idle', async ($, on) => {
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
    expect(await ui.find({ type: 'Text', text: 'wobble… wobble…' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'throw' })).toBeUndefined()

    await clock.advance(1_500)
    expect(await ui.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()

    await clock.advance(4_000)
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeDefined()
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()
    await ui.unmount()
  })

  test('an encounter left alone wanders off after the idle timeout', { options: { encounterIdleTimeoutSec: 5 } }, async ($, on) => {
    const { ui, clock } = await startBand($, on)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK)
    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1 } as any)
    await clock.advance(5_000)
    expect(await ui.find({ type: 'Text', text: 'Sproutling wandered off.' })).toBeDefined()
    await ui.unmount()
  })

  test('a short band uses the compact layout: no sprite, never more lines than maxRows', async ($, on) => {
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

  test('the idle line can be turned off', { options: { showIdleLine: false } }, async ($, on) => {
    const { ui, clock } = await startBand($, on)
    expect(await ui.find({ type: 'Text', text: /Whispering Forest/ })).toBeUndefined()
    await ui.unmount()
  })

  test('a catch is saved to the collection on top of what another session saved (0009)', async ($, on) => {
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
    await clock.advance(1_500 + BAND_TICK)

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
})


const BAND_TICK = 250
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }

/** Starts a session on the one-Modster forest with a fake clock, and mounts the band. */
async function startBand($: any, on: On) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  stubContentFs(on, oneModsterForest())
  // What Claude Code itself would answer beneath the mod
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const ui = await $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  // The band's timers run on the mock clock; advancing it fires them in order
  return { ui, clock }
}
