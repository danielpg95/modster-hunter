import { COLLECTION, DESKTOP } from '../../../../hooks/constants'
import type { Catcher, DesktopSheet } from '../../../../hooks/content'
import { catchSvg, desktopSheetSvg, prepareDesktopCatch, type ThrowArt } from '../../../../hooks/render'

// The browser page that previews desktop art (decisions 0045 and 0046), for the
// helper's `check-desktop --preview` and the repo's `tools/sprite.mjs --preview`.
// Everything is drawn by the mod's own renderers, so what the page shows is what
// the Desktop app's Code tab draws. Pure: it returns HTML and touches no files.

export type DesktopKind = 'modster' | 'background' | 'catcher' | 'particles'

/** A Modster a catcher's preview throws at: its name and its art, as the throw takes it. */
export interface ThrowTarget {
  name: string
  art: ThrowArt
  fps: number
}

export interface DesktopPreviewInput {
  kind: DesktopKind
  sheet: DesktopSheet
  /** The sheet's file size, for the header */
  bytes: number
  fps: number
  title: string
  /** A catcher's own catcher.json, so the throws use its beats, lid and glow */
  catcher?: Partial<Catcher>
  /** For a catcher: who it throws at */
  targets?: readonly ThrowTarget[]
}

/** The page for one desktop sheet. */
export function desktopPreviewPage({ kind, sheet, bytes, fps, title, catcher, targets = [] }: DesktopPreviewInput): string {
  const head = `<h2>${escape(title)}: ${sheet.frames} frame${sheet.frames === 1 ? '' : 's'} of ${sheet.width}×${sheet.height}, ${sheet.colors.length} colours, ${(bytes / 1024).toFixed(1)} KiB, ${fps} fps</h2>`
  const enlarge = kind === 'particles' ? 8 : kind === 'background' ? 2 : 4
  const tiles = kind === 'background' ? 3 : 1
  const big = desktopSheetSvg(sheet, { scale: enlarge, fps })
  const strip = (bg: string) => cell(`enlarged ${enlarge}×${tiles > 1 ? `, ${tiles} tiles side by side` : ''}`, `<div style="display:flex">${img(big).repeat(tiles)}</div>`, bg)
  let body = `<p>Animated, on dark and light:</p>${flex(strip('#1e1e1e') + strip('#f5f5f5'))}`
  if (kind === 'modster') body += modsterSizes(sheet, fps)
  if (kind === 'catcher') body += throws(sheet, catcher, targets)
  return `<!doctype html><meta charset="utf-8"><title>${escape(title)}</title><body style="background:#111;color:#ddd;font:14px system-ui;padding:16px">${head}${body}</body>`
}

function modsterSizes(sheet: DesktopSheet, fps: number): string {
  const svg = (scale: number, silhouette?: string) => desktopSheetSvg(sheet, { scale, fps, ...(silhouette ? { silhouette } : {}) })
  const row = (bg: string) =>
    [
      cell(`pane, ${DESKTOP.sheetPaneScale}×`, img(svg(DESKTOP.sheetPaneScale)), bg),
      cell(`collection, ${DESKTOP.sheetCollectionScale}×`, img(svg(DESKTOP.sheetCollectionScale)), bg),
      cell('uncaught silhouette', img(svg(DESKTOP.sheetCollectionScale, COLLECTION.silhouetteColor)), bg),
      cell(`band, ${DESKTOP.sheetBandScale}×`, img(svg(DESKTOP.sheetBandScale)), bg),
    ].join('')
  return `<p>At the sizes the Code tab draws:</p>${flex(row('#1e1e1e'))}${flex(row('#f5f5f5'))}`
}

/** A catch and a miss on each target, at the pane's size, looping. */
function throws(sheet: DesktopSheet, catcherJson: Partial<Catcher> | undefined, targets: readonly ThrowTarget[]): string {
  const catcher = {
    schemaVersion: 1,
    id: 'preview',
    name: 'Preview',
    style: 'contain',
    ...catcherJson,
    desktopSprite: { file: 'desktop.png', frames: sheet.frames, ...catcherJson?.desktopSprite },
  } as Catcher
  const cells: string[] = []
  for (const target of targets) {
    const art = prepareDesktopCatch(catcher, { desktop: sheet }, target.art, target.fps)
    for (const outcome of ['caught', 'missed'] as const) {
      const what = `${outcome === 'caught' ? 'catches' : 'misses'} ${escape(target.name)} (${target.art.desktop ? 'desktop' : 'terminal'} art)`
      const svg = art?.fits ? catchSvg(art, outcome, 3, { scale: DESKTOP.paneScale, loopPauseMs: 900 }) : undefined
      if (!art?.fits) cells.push(cell(`${what}: doesn't fit, the dot count plays`, '', '#1e1e1e'))
      else if (!svg) cells.push(cell(`${what}: over ${DESKTOP.svgMaxChars} characters, the dot count plays`, '', '#1e1e1e'))
      else cells.push(cell(`${what}<br>${svg.length.toLocaleString()} characters`, img(svg), '#1e1e1e'))
    }
  }
  return `<p>Throws at the pane's size, drawn as images like the Code tab draws them (looping):</p>${flex(cells.join(''))}`
}

// An image, as the Code tab draws a desktop sheet: SMIL runs, script doesn't
const img = (svg: string): string => `<img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" style="display:block">`
const cell = (label: string, inner: string, bg: string): string =>
  `<figure style="background:${bg};padding:12px;margin:0"><div>${inner}</div><figcaption style="color:#888;font:12px system-ui;max-width:240px">${label}</figcaption></figure>`
const flex = (inner: string): string => `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-top:8px">${inner}</div>`
const escape = (text: string): string => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
