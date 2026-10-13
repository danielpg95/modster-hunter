import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'
import { oneModsterForest } from './fixtures/one-modster-forest'
import { stubContentFs } from './fixtures/stub-content-fs'

// The collection pane (decision 0002, P3-01): `/modsters` opens it focused, Esc
// closes it, tabs switch on 1–4. The one-Modster forest is "Whispering Forest".

const PANE_PROPS = { title: 'Modster collection', isFocused: true, bodyColumns: 120, placement: 'inline', scroll: { offset: 0, bodyRows: 8 }, view: {} }
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 7, bodyColumns: 120 }

type Open = { id: string; title?: string; focus?: boolean; closeOnEscape?: boolean }

async function start($: any, on: On, panes: () => UiPane[] = () => []) {
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
  stubContentFs(on, oneModsterForest())
  const clock = mock.clock(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { clock, opens }
}

const mountPane = ($: any, props: Partial<typeof PANE_PROPS> = {}) =>
  $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'Pane', requestId: 'modster-collection', props: { ...PANE_PROPS, ...props } })
const mountBand = ($: any) => $.ui.mount({ plugin: 'modster-hunter', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })

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
    expect(await pane.find({ type: 'Text', text: 'Your Modsters will show here.' })).toBeDefined()
    await pane.unmount()
  })

  test('the tabs read 1: Collection to 4: Settings, the shown one not dim', async ($, on) => {
    await start($, on)
    const pane = await mountPane($)
    const buttons = await pane.findAll({ type: 'Button' })
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
    expect(await pane.find({ type: 'Text', text: /Biomes and the Modsters/ })).toBeDefined()
    await pane.unmount()

    const again = await mountPane($)
    expect(await again.find({ type: 'Text', text: /Biomes and the Modsters/ })).toBeDefined()
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
    expect(await pane.findAll({ type: 'Button' })).toHaveLength(4)
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
})
