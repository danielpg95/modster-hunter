import { describe, expect, test } from 'claude-code/testing'
import { desktopPreviewPage } from '../../../skills/create-modster-content/scripts/lib'
import { desktopSheetOf } from '../../fixtures/desktop-sheet-of'

// The preview page for desktop art (P5-49, P5-50): the mod's own renderers, as images.

describe('desktopPreviewPage', () => {
  test('a Modster shows at the pane, Collection and band sizes, and as a silhouette', () => {
    const page = desktopPreviewPage({ kind: 'modster', sheet: desktopSheetOf(32, 32, 2), bytes: 2048, fps: 4, title: 'blobby <desktop>' })
    expect(page).toContain('blobby &lt;desktop&gt;: 2 frames of 32×32, 2 colours, 2.0 KiB, 4 fps')
    for (const label of ['pane, 1×', 'collection, 0.75×', 'uncaught silhouette', 'band, 0.5×']) expect(page).toContain(label)
    expect(page).toContain('data:image/svg+xml;utf8,')
  })

  test('a background is tiled three times; particles are enlarged 8×', () => {
    expect(desktopPreviewPage({ kind: 'background', sheet: desktopSheetOf(96, 24, 1), bytes: 1, fps: 2, title: 'bg' })).toContain('3 tiles side by side')
    expect(desktopPreviewPage({ kind: 'particles', sheet: desktopSheetOf(8, 8, 4), bytes: 1, fps: 8, title: 'leaf' })).toContain('enlarged 8×')
  })

  test('a catcher throws at each target, and says when it doesn\'t fit', () => {
    const target = { name: 'Tiny', art: { desktop: desktopSheetOf(16, 16, 2) }, fps: 4 }
    const page = desktopPreviewPage({ kind: 'catcher', sheet: desktopSheetOf(32, 32, 1), bytes: 1, fps: 6, title: 'jar', targets: [target, { ...target, name: 'Big', art: { desktop: desktopSheetOf(64, 64, 2) } }] })
    expect(page).toContain("catches Tiny (desktop art): doesn't fit, the dot count plays")
    expect(page).toContain('catches Big (desktop art)<br>')
  })
})
