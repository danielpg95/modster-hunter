import { describe, expect, test } from 'claude-code/testing'

describe('overlay spike', () => {
  test('the desktop pane draws the scene with a Client over it', async ($) => {
    const pane = await $.ui.mount({ plugin: 'modster-overlay-spike', surface: 'desktop', component: 'Pane', requestId: 'overlay-spike', props: { title: 'x', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} } as any })
    expect((await pane.find({ type: 'Svg' }))?.props.alt).toBe('Pane scene')
    expect(await pane.find({ type: 'Client' })).toBeDefined()
    await pane.unmount()
  })
})
