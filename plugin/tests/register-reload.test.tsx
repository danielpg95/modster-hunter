import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { CATCH, CONTENT } from '../hooks/constants'
import { throwingMs } from '../hooks/game'
import { encodeFrame } from './fixtures/encode-frame'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { sceneForest } from './fixtures/scene-forest'
import { stubContentFs } from './fixtures/stub-content-fs'
import { twoBiomes } from './fixtures/two-biomes'
import { validModster } from './fixtures/valid-modster'

// The game runs only while autoStart is on (decision 0038); these tests play it
const HUNTING = { options: { autoStart: true } }

// A throw that lands plays the whole catch animation (decision 0035); a miss is shorter
const CATCH_THROW_MS = throwingMs('caught', CATCH.rocksToCatch)

// `/modsters reload` (P4-02): content loads again without a restart, an encounter
// in progress plays on as it was, and the Settings tab lists every content issue.

const PANE_PROPS = { title: 'Modster collection', isFocused: true, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} }
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }
const BAND_TICK = 250

/** Starts a session on `files` with a fake clock and an in-memory store; edit `files` and reload to change the content. */
async function start($: any, on: On, files: Record<string, string>, stored: Record<string, unknown> = { 'prefs:welcomed': { v: 1 } }) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.blit', () => ({ value: {} }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const { toasts } = stubContentFs(on, files)
  on('store.get', ($, e) => ({ value: structuredClone(stored[e.key]) }))
  on('store.set', ($, e) => {
    stored[e.key] = structuredClone(e.value)
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    delete stored[e.key]
    return { value: undefined }
  })
  on('store.keys', () => ({ value: Object.keys(stored) }))
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { clock, toasts }
}

const reload = async ($: any): Promise<string | undefined> => (await $.command.run({ command: 'modsters', args: 'reload' } as any))?.text
const mountPane = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Pane', requestId: 'modster-collection', props: PANE_PROPS })
const mountBand = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })

/** Opens the collection pane on `tab` and returns it. */
async function paneOn($: any, tab: string) {
  const pane = await mountPane($)
  await pane.press({ key: tab })
  return pane
}

/** An 8×8 two-frame sprite filled with `index` of a 3-color palette: a different shape from validSprite's. */
const solidSprite = (index: number) =>
  JSON.stringify({
    schemaVersion: 1,
    width: 8,
    height: 8,
    palette: ['#00000000', '#c62828ff', '#ef9a9aff'],
    frames: [encodeFrame(Array(64).fill(index)), encodeFrame(Array(64).fill(index))],
  })

/** A `caught:` record (decision 0009) caught once in the forest. */
const record = () => ({ v: 1, count: 1, shinyCount: 0, firstCaughtAt: 1, lastCaughtAt: 1, bestTier: 'common', biomes: { 'whispering-forest': 1 } })

/** Turns the forest into Ash Dunes: the forest's biome file goes, a dunes biome with Sproutling comes. */
function forestToDunes(files: Record<string, string>): void {
  delete files['biomes/whispering-forest/biome.json']
  files['biomes/ash-dunes/biome.json'] = JSON.stringify({ schemaVersion: 1, id: 'ash-dunes', name: 'Ash Dunes', encounterEverySec: [3, 3], modsters: [{ id: 'sproutling' }] })
}

/** The rows of the Settings tab as text. */
async function settingsRows(pane: any): Promise<string[]> {
  const rows = (await pane.findAll({ type: 'Box' })).filter((box: any) => /^settings-\d+$/.test(box.key ?? ''))
  return rows.map((row: any) => row.text)
}

describe('register: reload', () => {
  test('/modsters reload picks up a new Modster and says what loaded', HUNTING, async ($, on) => {
    const files = oneModsterForest()
    await start($, on, files)
    const biome = JSON.parse(files['biomes/whispering-forest/biome.json']!)
    files['biomes/whispering-forest/biome.json'] = JSON.stringify({ ...biome, modsters: [{ id: 'sproutling' }, { id: 'emberkit' }] })
    files['modsters/emberkit/modster.json'] = JSON.stringify({ ...validModster(), id: 'emberkit', name: 'Emberkit', dex: { ...(validModster().dex as object), number: 2 } })
    files['modsters/emberkit/sprite.sprite.json'] = solidSprite(1)

    expect(await reload($)).toBe('Modster Hunter: reloaded · 1 biome, 2 Modsters · no problems')
    const pane = await paneOn($, 'collection')
    expect(await pane.find({ type: 'Text', text: 'Caught 0/2' })).toBeDefined()
    await pane.unmount()
  })

  test('the Settings tab lists every content problem, and a fixed file clears it after a reload', HUNTING, async ($, on) => {
    const files: Record<string, string> = { ...oneModsterForest(), 'modsters/broken/modster.json': '{ not json' }
    await start($, on, files)
    const pane = await paneOn($, 'settings')
    const rows = await settingsRows(pane)
    expect(rows[0]).toBe('Content problems 1 error')
    expect(rows[1]).toMatch(/^modsters\/broken\/modster\.json/)
    expect(rows.slice(-2)).toEqual(['Changed a file? Run /modsters reload.', 'Change where the game shows in /config.'])

    delete files['modsters/broken/modster.json']
    expect(await reload($)).toMatch(/· no problems$/)
    expect((await settingsRows(pane))[0]).toBe('All content loaded, no problems.')
    await pane.unmount()
  })

  test('a reload with problems points to the Settings tab', HUNTING, async ($, on) => {
    const files = oneModsterForest()
    await start($, on, files)
    files['modsters/broken/modster.json'] = '{ not json'
    expect(await reload($)).toBe('Modster Hunter: reloaded · 1 biome, 1 Modster · 1 problem, see /modsters → 5: Settings')
  })

  test('an encounter in progress keeps its Modster, sprite and odds; the next one plays the new content', HUNTING, async ($, on) => {
    const files = oneModsterForest()
    const { clock } = await start($, on, files)
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK + 1_000)
    const cells = (await band.find({ type: 'Raster', key: 'sprite' }))?.props.cells
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeDefined()

    // Renamed, redrawn and nearly uncatchable; the encounter keeps its rate of 1, so the throw lands
    files['modsters/sproutling/modster.json'] = JSON.stringify({ ...validModster(), name: 'Sprig', catchRate: CONTENT.catchRateMin })
    files['modsters/sproutling/sprite.sprite.json'] = solidSprite(1)
    await reload($)

    expect(await band.find({ type: 'Text', text: /Sproutling/ })).toBeDefined()
    expect((await band.find({ type: 'Raster', key: 'sprite' }))?.props.cells).toBe(cells)
    await band.press({ key: 'throw' })
    await clock.advance(BAND_TICK + CATCH_THROW_MS)
    expect(await band.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()

    await clock.advance(4_000 + 3_000 + BAND_TICK)
    expect(await band.find({ type: 'Text', text: /Sprig/ })).toBeDefined()
    expect((await band.find({ type: 'Raster', key: 'sprite' }))?.props.cells).not.toBe(cells)
    await band.unmount()
  })

  test('when the biome is gone, its encounter plays out, then a new biome is picked', HUNTING, async ($, on) => {
    const files = oneModsterForest()
    const { clock, toasts } = await start($, on, files)
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK + 1_000)

    forestToDunes(files)
    expect(await reload($)).toBe('Modster Hunter: reloaded · 1 biome, 1 Modster · no problems · Whispering Forest is gone; a new biome after this encounter')
    await band.press({ key: 'throw' })
    await clock.advance(BAND_TICK + CATCH_THROW_MS)
    expect(await band.find({ type: 'Text', text: 'Caught Sproutling!' })).toBeDefined()
    expect(toasts).toEqual([])

    await clock.advance(4_000)
    expect(toasts).toEqual(['Modster Hunter: now in Ash Dunes'])
    expect(await band.find({ type: 'Text', text: /Ash Dunes/ })).toBeDefined()
    // The turn still runs, so Modsters keep coming
    await clock.advance(3_000 + BAND_TICK)
    expect(await band.find({ type: 'Text', text: 'appeared!' })).toBeDefined()
    await band.unmount()
  })

  test('between encounters, a gone biome is swapped right away', HUNTING, async ($, on) => {
    const files = oneModsterForest()
    const { clock } = await start($, on, files)
    const band = await mountBand($)
    forestToDunes(files)
    expect(await reload($)).toMatch(/· now in Ash Dunes$/)
    expect(await band.find({ type: 'Text', text: /Ash Dunes/ })).toBeDefined()
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK)
    expect(await band.find({ type: 'Text', text: 'appeared!' })).toBeDefined()
    await band.unmount()
  })

  test('a reload that leaves no biome says so, and one that brings a biome back starts the game', HUNTING, async ($, on) => {
    const files = oneModsterForest()
    const { clock } = await start($, on, files)
    const forest = files['biomes/whispering-forest/biome.json']!
    delete files['biomes/whispering-forest/biome.json']
    expect(await reload($)).toBe('Modster Hunter: reloaded · No biomes to play: every biome is disabled or failed to load · no problems')

    files['biomes/whispering-forest/biome.json'] = forest
    expect(await reload($)).toMatch(/· now in Whispering Forest$/)
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(3_000 + BAND_TICK)
    expect(await band.find({ type: 'Text', text: 'appeared!' })).toBeDefined()
    await band.unmount()
  })

  // From the phase 3 review: the pane's records and caches follow the reload

  test('after a reload the Collection tab re-reads caught records', HUNTING, async ($, on) => {
    const files = oneModsterForest()
    const stored: Record<string, unknown> = {}
    await start($, on, files, stored)
    // Another session caught a Modster this one hasn't loaded yet
    stored['caught:emberkit'] = record()
    files['modsters/emberkit/modster.json'] = JSON.stringify({ ...validModster(), id: 'emberkit', name: 'Emberkit', dex: { ...(validModster().dex as object), number: 2 } })
    files['modsters/emberkit/sprite.sprite.json'] = solidSprite(1)
    await reload($)
    const pane = await paneOn($, 'collection')
    expect(await pane.find({ type: 'Text', text: 'Caught 1/2' })).toBeDefined()
    await pane.unmount()
  })

  test('after a reload the Collection tab draws the new sprite, caught or as a silhouette', HUNTING, async ($, on) => {
    const files = oneModsterForest()
    await start($, on, files)
    const pane = await paneOn($, 'collection')
    const silhouette = (await pane.find({ type: 'Raster', key: 'collection-sprite' }))?.props.cells
    files['modsters/sproutling/sprite.sprite.json'] = solidSprite(1)
    await reload($)
    expect((await pane.find({ type: 'Raster', key: 'collection-sprite' }))?.props.cells).not.toBe(silhouette)
    await pane.unmount()
  })

  test('after a reload the Biomes tab draws the new background', HUNTING, async ($, on) => {
    const files = sceneForest()
    // No particles, so the scene's cells depend only on the background
    const biome = JSON.parse(files['biomes/whispering-forest/biome.json']!)
    delete biome.particles
    files['biomes/whispering-forest/biome.json'] = JSON.stringify(biome)
    await start($, on, files)
    const pane = await paneOn($, 'biomes')
    const before = (await pane.find({ type: 'Raster', key: 'biomes-scene' }))?.props.cells
    expect(before).toBeDefined()
    files['biomes/whispering-forest/background.sprite.json'] = solidSprite(2)
    await reload($)
    expect((await pane.find({ type: 'Raster', key: 'biomes-scene' }))?.props.cells).not.toBe(before)
    await pane.unmount()
  })

  test('two reloads at once share one load', HUNTING, async ($, on) => {
    await start($, on, twoBiomes())
    const [first, second] = await Promise.all([reload($), reload($)])
    expect(second).toBe(first)
  })
})
