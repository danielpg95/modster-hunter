import { describe, expect, test } from 'claude-code/testing'
import { VARIANTS } from '../hooks/variants'

const PROPS = { title: 'P5-39 art spike', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} }

describe('art spike', () => {
  test('on desktop the pane draws every variant under the Svg limit; the terminal gets a hint', async ($: any, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    on('ui.render', ($, e) => {
      const { Box } = $.ui.resolve(e)
      return <Box />
    })
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
    const pane = await $.ui.mount({ plugin: 'modster-art-spike', surface: 'desktop', component: 'Pane', requestId: 'art-spike', props: PROPS })
    expect(await pane.findAll({ type: 'Svg' })).toHaveLength(VARIANTS.filter((v) => v.source).length)
    await pane.unmount()
    const terminal = await $.ui.mount({ plugin: 'modster-art-spike', surface: 'terminal', component: 'Pane', requestId: 'art-spike', props: PROPS })
    expect(await terminal.find({ type: 'Text', text: /Desktop app/ })).toBeDefined()
    await terminal.unmount()
  })
})
