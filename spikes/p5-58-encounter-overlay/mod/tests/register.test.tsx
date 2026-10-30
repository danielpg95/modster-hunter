import { describe, expect, mock, test } from 'claude-code/testing'

const PROPS = { title: 'x', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} }

describe('overlay spike', () => {
  test('the desktop pane draws the scene with a Client over it, and an encounter slides it and adds the buttons', async ($, on) => {
    const clock = mock.clock(on)
    const pane = await $.ui.mount({ plugin: 'modster-overlay-spike', surface: 'desktop', component: 'Pane', requestId: 'overlay-spike', props: PROPS as any })
    expect((await pane.find({ type: 'Svg' }))?.props.alt).toBe('pane scene')
    expect(await pane.find({ type: 'Client' })).toBeDefined()
    expect(await pane.find({ type: 'Button', key: 'spike-pane-throw' })).toBeUndefined()
    await pane.press({ key: 'spike-start' })
    await clock.advance(1_000)
    await pane.redraw(PROPS as any)
    const svg = String((await pane.find({ type: 'Svg' }))?.props.source)
    expect(svg).toContain('type="translate"')
    expect(svg).toContain('begin="-1.000s"')
    expect(await pane.find({ type: 'Button', key: 'spike-pane-throw' })).toBeDefined()
    await pane.unmount()
  })
})
