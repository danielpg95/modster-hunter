import { describe, expect, test } from 'claude-code/testing'
import { DEX } from '../hooks/dex'

async function cells(pane: any): Promise<number> {
  const buttons: { key?: string }[] = await pane.findAll({ type: 'Button' })
  return buttons.filter((b) => b.key?.startsWith('dex-') && b.key !== 'dex-toggle').length
}

const PANE = {
  plugin: 'modster-interaction-spike',
  component: 'Pane',
  requestId: 'interaction-spike',
  props: { title: 'P5-52 interaction spike', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

describe('interaction spike', () => {
  test('presses count, the grid opens a detail and comes back, the terminal gets a hint', async ($: any, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })

    const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
    await pane.press({ key: 'spike-a' })
    await pane.press({ key: 'spike-a' })
    expect((await pane.findAll({ type: 'Text', text: 'reached the mod: 2' })).length).toBe(1)

    expect(await cells(pane)).toBe(12)
    await pane.press({ key: 'dex-toggle' })
    expect(await cells(pane)).toBe(DEX.length)

    const first = DEX[0]!
    await pane.press({ key: `dex-${first.id}` })
    expect(await pane.find({ type: 'Text', text: new RegExp(first.name) })).toBeDefined()
    expect(await pane.find({ type: 'Button', key: 'dex-back' })).toBeDefined()
    await pane.press({ key: 'dex-back' })
    expect(await pane.find({ type: 'Button', key: 'dex-back' })).toBeUndefined()
    await pane.unmount()

    const terminal = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await terminal.find({ type: 'Text', text: /Desktop app/ })).toBeDefined()
    await terminal.unmount()
  })

  test('the band is left alone in the terminal and until the band test is on', async ($: any, on) => {
    on('ui.render', ($, e) => {
      const { Text } = $.ui.resolve(e)
      return <Text>game band</Text>
    })
    const BAND = { plugin: 'modster-interaction-spike', component: 'AbovePrompt', props: { bodyColumns: 80 } } as const

    const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await terminal.findAll({ type: 'Button' })).toHaveLength(0)
    await terminal.unmount()

    const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
    await pane.press({ key: 'spike-h' })
    await pane.unmount()

    const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
    await band.press({ key: 'spike-band-poke' })
    expect(await band.find({ type: 'Text', text: 'H. band presses: 1' })).toBeDefined()
    expect(await band.find({ type: 'Text', text: 'game band' })).toBeDefined()
    await band.unmount()
  })
})
