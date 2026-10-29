import { describe, expect, test } from 'claude-code/testing'
import { DESKTOP } from '../../hooks/constants'
import type { DesktopSheet } from '../../hooks/content'
import { desktopSheetSvg } from '../../hooks/render'

const sheet = (frames: number): DesktopSheet => ({ png: 'UE5H', width: 96, height: 80, frames, colors: ['#ff0000'] })

describe('desktopSheetSvg', () => {
  test('a 4-frame sheet shows one frame, stepped left by a frame width at its fps (decision 0045 point 9)', () => {
    const svg = desktopSheetSvg(sheet(4), { scale: DESKTOP.sheetPaneScale, fps: 8 })
    expect(svg).toContain('viewBox="0 0 96 80"')
    expect(svg).toContain('<image href="data:image/png;base64,UE5H" width="384" height="80"')
    expect(svg).toContain('values="0;-96;-192;-288" keyTimes="0;0.25;0.5;0.75" calcMode="discrete" dur="0.5s" repeatCount="indefinite"')
  })

  test('it is drawn pixelated, at the scale it is given', () => {
    const band = desktopSheetSvg(sheet(2), { scale: DESKTOP.sheetBandScale, fps: 6 })
    expect(band).toContain('width="48" height="40" viewBox="0 0 96 80"')
    expect(band).toContain('image-rendering="pixelated"')
    expect(desktopSheetSvg(sheet(2), { scale: DESKTOP.sheetCollectionScale, fps: 6 })).toContain('width="72" height="60"')
  })

  test('one frame holds still: no animation', () => {
    expect(desktopSheetSvg(sheet(1), { scale: 1, fps: 6 })).not.toContain('<animate')
  })

  test('a silhouette is the sheet through a one-colour filter, holding frame 0', () => {
    const svg = desktopSheetSvg(sheet(4), { scale: 1, fps: 6, silhouette: '#5a5a5a' })
    expect(svg).toContain('<feFlood flood-color="#5a5a5a"/><feComposite in2="SourceAlpha" operator="in"/>')
    expect(svg).toContain('filter="url(#silhouette)"')
    expect(svg).not.toContain('<animate')
  })

  test('the embedded PNG is the whole cost: a 48 KiB sheet stays well under the Svg limit', () => {
    const png = 'A'.repeat(Math.ceil((48 * 1024) / 3) * 4)
    expect(desktopSheetSvg({ ...sheet(8), png }, { scale: 1, fps: 6 }).length).toBeLessThan(DESKTOP.svgMaxChars)
  })
})
