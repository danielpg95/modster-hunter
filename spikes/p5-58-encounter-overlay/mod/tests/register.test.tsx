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
    // Draws while it runs play the slide; a redraw after it shows it ended, without replaying it
    const sliding = String((await pane.find({ type: 'Svg' }))?.props.source)
    expect(sliding).toContain('type="translate"')
    // The flash first, then the slide from where the scene stood
    expect(sliding).toContain('begin="0.4s"')
    expect(sliding).toContain('<g transform="translate(0 0)">')
    // One source for the whole arrival: the silhouette waits for the slide, in the same Svg
    expect(sliding).toContain('begin="0.85s"')
    await clock.advance(3_000)
    await pane.redraw(PROPS as any)
    const svg = String((await pane.find({ type: 'Svg' }))?.props.source)
    expect(svg).not.toContain('<animateTransform')
    expect(svg).toContain('<g transform="translate(120 0)">')
    expect(await pane.find({ type: 'Button', key: 'spike-pane-throw' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: '3 left' })).toBeDefined()
    await pane.press({ key: 'spike-pane-throw' })
    expect(await pane.find({ type: 'Text', text: '2 left' })).toBeDefined()
    // The departure: the cue where the Modster stood, then the slide back, in one Svg
    await pane.press({ key: 'spike-caught' })
    const leaving = String((await pane.find({ type: 'Svg' }))?.props.source)
    expect(leaving).toContain('Caught Sproutling!')
    expect(leaving).toContain('#ffd54f')
    expect(leaving).toContain('begin="0.4s"')
    await clock.advance(2_000)
    await pane.redraw(PROPS as any)
    expect(String((await pane.find({ type: 'Svg' }))?.props.source)).not.toContain('<animateTransform')
    await pane.unmount()
  })
})
