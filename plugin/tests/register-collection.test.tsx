import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'
import { collectionForest } from './fixtures/collection-forest'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'
import { twoBiomes } from './fixtures/two-biomes'

// The collection pane (decision 0002, P3-01): `/modsters` opens it focused, Esc
// closes it, tabs switch on 1–4. The one-Modster forest is "Whispering Forest".

const PANE_PROPS = { title: 'Modster collection', isFocused: true, bodyColumns: 120, placement: 'inline', scroll: { offset: 0, bodyRows: 8 }, view: {} }
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }

type Open = { id: string; title?: string; focus?: boolean; closeOnEscape?: boolean }

async function start($: any, on: On, panes: () => UiPane[] = () => [], files = oneModsterForest(), stored: Record<string, unknown> = {}) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('ui.panes', () => ({ value: panes() }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const opens: Open[] = []
  on('ui.open', ($, e) => {
    opens.push({
      id: e.id,
      ...(e.title ? { title: e.title } : {}),
      ...(e.focus ? { focus: e.focus } : {}),
      ...(e.closeOnEscape ? { closeOnEscape: e.closeOnEscape } : {}),
    })
    return { value: { isPlaced: true } }
  })
  stubContentFs(on, files)
  // An in-memory $.store (the test engine has none); the test's own object, so a test can play another session
  const store = stored
  on('store.get', ($, e) => ({ value: structuredClone(store[e.key]) }))
  on('store.set', ($, e) => {
    store[e.key] = structuredClone(e.value)
    return { value: undefined }
  })
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { clock, opens }
}

const mountPane = ($: any, props: Partial<typeof PANE_PROPS> = {}) =>
  $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Pane', requestId: 'modster-collection', props: { ...PANE_PROPS, ...props } })
const mountBand = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })

const TAB_KEYS = ['collection', 'biomes', 'stats', 'settings']

/** The four tab Buttons, in order; the pane has others (k, j, the list's rows). */
async function tabButtons(pane: any): Promise<any[]> {
  return (await pane.findAll({ type: 'Button' })).filter((button: any) => TAB_KEYS.includes(button.key))
}

/** A `caught:` record (decision 0009) caught `count` times at midday UTC on 2026-10-08. */
const record = (count = 1) => ({
  v: 1,
  count,
  shinyCount: 0,
  firstCaughtAt: Date.UTC(2026, 9, 8, 12),
  lastCaughtAt: Date.UTC(2026, 9, 8, 12),
  bestTier: 'common',
  biomes: { 'whispering-forest': count },
})

/** A tall, wide dock: room for the list, the sprite and the text side by side. */
const DOCK = { placement: 'dock', bodyColumns: 120, scroll: { offset: 0, bodyRows: 30 } } as const

/** Records the collection sprite's blits. */
function collectionBlits(on: On): string[] {
  const cells: string[] = []
  on('ui.blit', ($, e) => {
    if (e.key === 'collection-sprite' && 'cells' in e) cells.push(e.cells)
    return { value: {} }
  })
  return cells
}

/** Whether the header row holds the tabs (inline and wide), found by their keys in its children. */
async function tabsInHeader(pane: any): Promise<boolean> {
  const header = await pane.find({ type: 'Box', key: 'header' })
  return JSON.stringify(header?.children ?? []).includes('"collection"')
}

describe('register: collection pane', () => {
  test('/modsters opens the collection pane with focus, and Esc closes it', async ($, on) => {
    const { opens } = await start($, on)
    expect(await $.command.run({ command: 'modsters' } as any)).toEqual({})
    expect(opens).toEqual([{ id: 'modster-collection', title: 'Modster collection', focus: true, closeOnEscape: true }])
  })

  test('/modsters hunt still opens the encounter pane, not the collection', async ($, on) => {
    const { opens } = await start($, on)
    await $.command.run({ command: 'modsters', args: 'hunt' } as any)
    expect(opens.map((open) => open.id)).toEqual(['modster-hunt'])
  })

  test('the pane names the biome and opens on the Collection tab', async ($, on) => {
    await start($, on)
    const pane = await mountPane($)
    expect(await pane.find({ type: 'Text', text: 'Whispering Forest' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: 'Caught 0/1' })).toBeDefined()
    await pane.unmount()
  })

  test('the tabs read 1: Collection to 4: Settings, the shown one not dim', async ($, on) => {
    await start($, on)
    const pane = await mountPane($)
    const buttons = await tabButtons(pane)
    expect(buttons.map((button: any) => [button.key, button.props.label, button.props.hotkey, button.props.plain])).toEqual([
      ['collection', 'Collection', '1', true],
      ['biomes', 'Biomes', '2', true],
      ['stats', 'Stats', '3', true],
      ['settings', 'Settings', '4', true],
    ])
    expect(buttons.map((button: any) => button.props.dimColor === true)).toEqual([false, true, true, true])
    await pane.unmount()
  })

  test('pressing a tab shows it, and the pane keeps it when reopened', async ($, on) => {
    await start($, on)
    const pane = await mountPane($)
    await pane.press({ key: 'stats' })
    expect(await pane.find({ type: 'Text', text: 'Your hunting stats will show here.' })).toBeDefined()
    expect((await pane.find({ type: 'Button', key: 'stats' }))?.props.dimColor).toBeUndefined()
    expect((await pane.find({ type: 'Button', key: 'collection' }))?.props.dimColor).toBe(true)
    await pane.press({ key: 'settings' })
    expect(await pane.find({ type: 'Text', text: /in \/config/ })).toBeDefined()
    await pane.press({ key: 'biomes' })
    expect(await pane.find({ type: 'Text', text: /^Biomes \d+$/ })).toBeDefined()
    await pane.unmount()

    const again = await mountPane($)
    expect(await again.find({ type: 'Text', text: /^Biomes \d+$/ })).toBeDefined()
    await again.press({ key: 'collection' })
    await again.unmount()
  })

  test('inline and wide, the tabs share the header row', async ($, on) => {
    await start($, on)
    const pane = await mountPane($, { placement: 'inline', bodyColumns: 120 })
    expect(await tabsInHeader(pane)).toBe(true)
    expect(await pane.find({ type: 'Text', text: ' · Esc: close' })).toBeDefined()
    await pane.unmount()
  })

  test('docked, the tabs sit on their own row under the header', async ($, on) => {
    await start($, on)
    const pane = await mountPane($, { placement: 'dock', bodyColumns: 60, scroll: { offset: 0, bodyRows: 30 } })
    expect(await tabsInHeader(pane)).toBe(false)
    expect((await pane.find({ type: 'Box', key: 'tabs' }))?.props.flexDirection).toBe('row')
    await pane.unmount()
  })

  test('a narrow dock puts one tab per row', async ($, on) => {
    await start($, on)
    const pane = await mountPane($, { placement: 'dock', bodyColumns: 30, scroll: { offset: 0, bodyRows: 30 } })
    expect((await pane.find({ type: 'Box', key: 'tabs' }))?.props.flexDirection).toBe('column')
    expect(await tabButtons(pane)).toHaveLength(4)
    await pane.unmount()
  })

  test('not focused, the header says ctrl+x tab', async ($, on) => {
    await start($, on)
    const pane = await mountPane($, { isFocused: false })
    expect(await pane.find({ type: 'Text', text: ' · ctrl+x tab to use' })).toBeDefined()
    await pane.unmount()
  })

  test('the collection pane being shown doesn\'t hide the encounter in the band', async ($, on) => {
    const shown: UiPane[] = [{ id: 'modster-collection', title: 'Modster collection', isShown: true, isFocused: true, isPlaced: true }]
    const { clock } = await start($, on, () => shown)
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_250)
    expect(await band.find({ type: 'Button', key: 'throw' })).toBeDefined()
    await band.unmount()
  })

  // P3-02: the Collection tab, a list beside the selected Modster

  test('the list is in dex order, unnumbered Modsters last, ??? until caught', async ($, on) => {
    await start($, on, () => [], collectionForest(3), { 'caught:mon-02': record(4) })
    const pane = await mountPane($, DOCK)
    expect(await pane.find({ type: 'Text', text: 'Caught 1/4' })).toBeDefined()
    const rows = (await pane.findAll({ type: 'Button' })).filter((button: any) => /^(mon-|aardvark)/.test(button.key ?? ''))
    // mon-03 is #001: numbers run against file order
    expect(rows.map((row: any) => row.key)).toEqual(['mon-03', 'mon-02', 'mon-01', 'aardvark'])
    expect(rows.map((row: any) => row.text)).toEqual(['▸ #001 ???', '  #002 Mon 02         ×4 common', '  #003 ???', '  #—   ???'])
    await pane.unmount()
  })

  test('j and k move the selection, and the detail follows', async ($, on) => {
    await start($, on, () => [], collectionForest(3), { 'caught:mon-02': record(4) })
    const pane = await mountPane($, DOCK)
    expect(await pane.find({ type: 'Text', text: 'Not caught yet' })).toBeDefined()
    await pane.press({ key: 'down' })
    expect(await pane.find({ type: 'Text', text: 'Caught ×4 · best common' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: 'Lives in Whispering Forest' })).toBeDefined()
    await pane.press({ key: 'up' })
    await pane.press({ key: 'up' })
    expect((await pane.find({ type: 'Button', key: 'mon-03' }))?.text).toMatch(/^▸/)
    await pane.unmount()
  })

  test('pressing a row selects it', async ($, on) => {
    await start($, on, () => [], collectionForest(3), { 'caught:mon-01': record() })
    const pane = await mountPane($, DOCK)
    await pane.press({ key: 'mon-01' })
    expect(await pane.find({ type: 'Text', text: 'Mon 01' })).toBeDefined()
    await pane.press({ key: 'mon-03' })
    await pane.unmount()
  })

  test('the J and K buttons read k: Up and j: Down', async ($, on) => {
    await start($, on, () => [], collectionForest(3))
    const pane = await mountPane($, DOCK)
    const up = await pane.find({ type: 'Button', key: 'up' })
    const down = await pane.find({ type: 'Button', key: 'down' })
    expect([up?.props.hotkey, up?.props.label, down?.props.hotkey, down?.props.label]).toEqual(['k', 'Up', 'j', 'Down'])
    await pane.unmount()
  })

  test('an uncaught Modster shows a still silhouette; a caught one animates', async ($, on) => {
    const blits = collectionBlits(on)
    const { clock } = await start($, on, () => [], collectionForest(3), { 'caught:mon-02': record() })
    const pane = await mountPane($, DOCK)
    const silhouette = (await pane.find({ type: 'Raster', key: 'collection-sprite' }))?.props.cells
    expect(silhouette).toBeDefined()
    await clock.advance(1_000)
    expect(blits).toHaveLength(0)

    await pane.press({ key: 'down' })
    const color = (await pane.find({ type: 'Raster', key: 'collection-sprite' }))?.props.cells
    expect(color).not.toBe(silhouette)
    // 6 fps: about 6 frames a second, alternating between the sprite's two
    await clock.advance(1_000)
    expect(blits.length).toBeGreaterThanOrEqual(5)
    expect(new Set(blits).size).toBe(2)
    await pane.unmount()
  })

  // The test engine can't raise ui.close, so the close path is checked by hand
  test('another tab stops the animation', async ($, on) => {
    const blits = collectionBlits(on)
    const { clock } = await start($, on, () => [], collectionForest(3), { 'caught:mon-03': record() })
    const pane = await mountPane($, DOCK)
    await clock.advance(500)
    expect(blits.length).toBeGreaterThan(0)
    await pane.press({ key: 'stats' })
    const afterTab = blits.length
    await clock.advance(1_000)
    expect(blits).toHaveLength(afterTab)
    await pane.press({ key: 'collection' })
    await pane.unmount()
  })

  test('the layout holds still while scrolling past sprites of other sizes, caught or not', async ($, on) => {
    await start($, on, () => [], collectionForest(3, true), { 'caught:mon-03': record() })
    const pane = await mountPane($, DOCK)
    // The box is the largest sprite's, 16 columns by 8 rows, whichever Modster is selected
    const layout = async () => {
      const box = await pane.find({ type: 'Box', key: 'sprite-box' })
      const text = await pane.find({ type: 'Box', key: 'detail-text' })
      const list = (await pane.findAll({ type: 'Button' })).filter((button: any) => /^(mon-|aardvark)/.test(button.key ?? '')).length
      return [box?.props.width, box?.props.height, text?.props.width, text?.props.height, list]
    }
    const first = await layout()
    expect(first.slice(0, 2)).toEqual([16, 8])
    // #001 caught 8×8, #002 uncaught 16×16, #003 uncaught 8×8, #— uncaught 8×8
    for (let i = 0; i < 3; i++) {
      await pane.press({ key: 'down' })
      expect(await layout()).toEqual(first)
    }
    await pane.unmount()
  })

  test('a short inline pane shows the list and the text, without the sprite', async ($, on) => {
    await start($, on, () => [], collectionForest(3), { 'caught:mon-03': record() })
    // 6 rows: header, gap and summary leave 3, less than the sprite's 4
    const pane = await mountPane($, { placement: 'inline', bodyColumns: 120, scroll: { offset: 0, bodyRows: 6 } })
    expect(await pane.find({ type: 'Raster' })).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: 'Mon 03' })).toBeDefined()
    await pane.unmount()
  })

  test('with many Modsters the list scrolls to keep the selection in view', async ($, on) => {
    await start($, on, () => [], collectionForest(30))
    // Inline at 8 rows: header, gap and summary leave 5 for the list, 4 entries and the count row
    const pane = await mountPane($, { placement: 'inline', bodyColumns: 120, scroll: { offset: 0, bodyRows: 8 } })
    const shown = async () => (await pane.findAll({ type: 'Button' })).filter((button: any) => /^(mon-|aardvark)/.test(button.key ?? '')).map((row: any) => row.key)
    expect(await shown()).toEqual(['mon-30', 'mon-29', 'mon-28', 'mon-27'])
    expect(await pane.find({ type: 'Text', text: '↓ 27 more' })).toBeDefined()
    for (let i = 0; i < 20; i++) await pane.press({ key: 'down' })
    // #021 is selected, mid-window
    expect(await shown()).toContain('mon-10')
    expect((await pane.find({ type: 'Button', key: 'mon-10' }))?.text).toMatch(/^▸ #021/)
    expect(await pane.find({ type: 'Text', text: /^↑ \d+ · ↓ \d+ more$/ })).toBeDefined()
    for (let i = 0; i < 20; i++) await pane.press({ key: 'down' })
    expect(await shown()).toContain('aardvark')
    expect(await pane.find({ type: 'Text', text: '↑ 27 more' })).toBeDefined()
    await pane.unmount()
  })

  test('a catch this session shows in the open pane', async ($, on) => {
    const { clock } = await start($, on)
    const pane = await mountPane($, DOCK)
    expect(await pane.find({ type: 'Text', text: 'Caught 0/1' })).toBeDefined()
    const band = await mountBand($)
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await clock.advance(4_250)
    await band.press({ key: 'throw' })
    await clock.advance(2_000)
    expect(await pane.find({ type: 'Text', text: 'Caught 1/1' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: 'Sproutling' })).toBeDefined()
    await band.unmount()
    await pane.unmount()
  })

  test('/modsters reads catches made in other sessions', async ($, on) => {
    const stored: Record<string, unknown> = {}
    await start($, on, () => [], oneModsterForest(), stored)
    stored['caught:sproutling'] = record(2)
    await $.command.run({ command: 'modsters' } as any)
    const pane = await mountPane($, DOCK)
    expect(await pane.find({ type: 'Text', text: 'Caught 1/1' })).toBeDefined()
    await pane.unmount()
  })

  test('the Biomes tab opens on the session biome, marked here, with each Modster\'s encounter %', async ($, on) => {
    await start($, on, () => [], twoBiomes())
    const pane = await mountPane($)
    await pane.press({ key: 'biomes' })
    expect(await pane.find({ type: 'Text', text: 'Biomes 2' })).toBeDefined()
    // The session's biome is random (0006); the header names it
    const header = JSON.stringify(await pane.find({ type: 'Box', key: 'header' }))
    const current = header.includes('Ash Dunes') ? 'ash-dunes' : 'whispering-forest'
    const row = await pane.find({ type: 'Button', key: current })
    expect(JSON.stringify(row)).toContain(' here')
    expect(JSON.stringify(row)).toContain('▸ ')
    expect(await pane.find({ type: 'Text', text: current === 'ash-dunes' ? '  75.0%  common' : ' 100.0%  common' })).toBeDefined()
    await pane.press({ key: 'collection' })
    await pane.unmount()
  })

  test('j and k move between biomes, and the odds follow', async ($, on) => {
    await start($, on, () => [], twoBiomes())
    const pane = await mountPane($)
    await pane.press({ key: 'biomes' })
    // Ash Dunes lists first by name
    await pane.press({ key: 'biome-up' })
    expect(await pane.find({ type: 'Box', key: 'odds-emberkit' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: '  25.0%  common' })).toBeDefined()
    await pane.press({ key: 'biome-down' })
    expect(await pane.find({ type: 'Box', key: 'odds-emberkit' })).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: ' 100.0%  common' })).toBeDefined()
    await pane.press({ key: 'biome-up' })
    await pane.press({ key: 'collection' })
    await pane.unmount()
  })

  test('uncaught Modsters read ??? in the Biomes tab; caught ones show their name and catches there', async ($, on) => {
    await start($, on, () => [], twoBiomes(), { 'caught:sproutling': { ...record(3), biomes: { 'ash-dunes': 3 } } })
    const pane = await mountPane($)
    await pane.press({ key: 'biomes' })
    await pane.press({ key: 'biome-up' })
    const sproutling = JSON.stringify(await pane.find({ type: 'Box', key: 'odds-sproutling' }))
    expect(sproutling).toContain('Sproutling')
    expect(sproutling).toContain(' ×3')
    const emberkit = JSON.stringify(await pane.find({ type: 'Box', key: 'odds-emberkit' }))
    expect(emberkit).toContain('???')
    expect(emberkit).not.toContain('Emberkit')
    expect(JSON.stringify(await pane.find({ type: 'Button', key: 'ash-dunes' }))).toContain(' 1/2')
    await pane.press({ key: 'collection' })
    await pane.unmount()
  })

  test('a narrow dock puts the biome list above the odds', async ($, on) => {
    await start($, on, () => [], twoBiomes())
    const pane = await mountPane($, { placement: 'dock', bodyColumns: 50, scroll: { offset: 0, bodyRows: 20 } })
    await pane.press({ key: 'biomes' })
    expect((await pane.find({ type: 'Box', key: 'split' }))?.props.flexDirection).toBe('column')
    expect((await pane.findAll({ type: 'Button' })).filter((button: any) => ['ash-dunes', 'whispering-forest'].includes(button.key))).toHaveLength(2)
    await pane.press({ key: 'collection' })
    await pane.unmount()
  })
})
