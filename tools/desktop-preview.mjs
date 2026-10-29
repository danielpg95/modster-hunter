// The browser preview for desktop art (decision 0045), written by
// `node tools/sprite.mjs <desktop.png> --frames N --desktop <kind> --preview page.html`.
// It shows the sheet enlarged as a GIF on dark and light, then what the Code tab
// will draw, made by the mod's own renderers:
//   modster     the Svg at pane, Collection and band size, and the uncaught silhouette
//   background  three tiles side by side, so a seam that doesn't line up shows
//   catcher     throws on Shellsprout (desktop art) and Mossmaul (terminal art), as images
//   particles   the frames only, enlarged 8×: one particle tumbling (decision 0046)
import './ts-resolve.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import omggif from 'omggif'
import pngjs from 'pngjs'

const { loadContent } = await import('../plugin/hooks/content/index.ts')
const { catchSvg, desktopSheetSvg, prepareDesktopCatch } = await import('../plugin/hooks/render/index.ts')
const { COLLECTION, DESKTOP } = await import('../plugin/hooks/constants.ts')

const DARK = [30, 30, 30]
const LIGHT = [245, 245, 245]

/** The preview page for a desktop sheet that passed `desktopSheet` (`sheet`), from its PNG `bytes`. */
export async function desktopPreviewPage({ kind, bytes, sheet, fps, title, catcher }) {
  const png = pngjs.PNG.sync.read(bytes)
  const tiles = kind === 'background' ? 3 : 1
  const scale = kind === 'background' ? 2 : kind === 'particles' ? 8 : 4
  const gif = sheetGif(png, sheet, fps, scale, tiles)
  const head = `<h2>${title}: ${sheet.frames} frame${sheet.frames === 1 ? '' : 's'} of ${sheet.width}×${sheet.height}, ${sheet.colors.length} colours, ${(bytes.length / 1024).toFixed(1)} KiB, ${fps} fps</h2>`
  const enlarged = `<p>Enlarged ${scale}×${tiles > 1 ? `, ${tiles} tiles side by side` : ''}, dark and light:</p><img src="data:image/gif;base64,${gif}" style="image-rendering:pixelated">`
  let drawn = ''
  if (kind === 'modster') drawn = modsterCells(sheet, fps)
  if (kind === 'catcher') drawn = await throwCells(sheet, catcher)
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="background:#111;color:#ddd;font:14px system-ui;padding:16px">${head}${enlarged}${drawn}</body>`
}

function modsterCells(sheet, fps) {
  const svg = (scale, silhouette) => desktopSheetSvg(sheet, { scale, fps, ...(silhouette ? { silhouette } : {}) })
  const row = (bg) =>
    [
      cell(`pane, ${DESKTOP.sheetPaneScale}×`, svg(DESKTOP.sheetPaneScale), bg),
      cell(`collection, ${DESKTOP.sheetCollectionScale}×`, svg(DESKTOP.sheetCollectionScale), bg),
      cell('uncaught silhouette', svg(DESKTOP.sheetCollectionScale, COLLECTION.silhouetteColor), bg),
      cell(`band, ${DESKTOP.sheetBandScale}×`, svg(DESKTOP.sheetBandScale), bg),
    ].join('')
  return `<p>The mod's own Svg, at the sizes the Code tab draws:</p>${flex(row('#1e1e1e'))}${flex(row('#f5f5f5'))}`
}

/** Throws on a desktop and a terminal Modster, as the Code tab draws them: images, looping. */
async function throwCells(sheet, catcherJson) {
  const root = fileURLToPath(new URL('../plugin/content', import.meta.url))
  const content = await loadContent(fsReader(), root)
  const catcher = { schemaVersion: 1, id: 'preview', name: 'Preview', style: 'contain', ...catcherJson, desktopSprite: { file: 'desktop.png', frames: sheet.frames, ...catcherJson?.desktopSprite } }
  const cells = []
  for (const id of ['sproutling', 'mossbeast']) {
    const loaded = content.modsters.get(id)
    if (!loaded) continue
    const fps = (loaded.desktop ? loaded.modster.desktopSprite?.fps : loaded.modster.sprite?.fps) ?? 6
    const art = prepareDesktopCatch(catcher, { desktop: sheet }, { ...(loaded.sprite ? { sprite: loaded.sprite } : {}), ...(loaded.desktop ? { desktop: loaded.desktop } : {}) }, fps)
    for (const outcome of ['caught', 'missed']) {
      const svg = art && catchSvg(art, outcome, 3, { scale: 1, loopPauseMs: 900 })
      const what = `${outcome === 'caught' ? 'catches' : 'misses'} ${loaded.modster.name} (${loaded.desktop ? 'desktop' : 'terminal'} art)`
      if (!art?.fits) cells.push(cell(`${what}: doesn't fit, the dot count plays`, '', '#1e1e1e'))
      else if (!svg) cells.push(cell(`${what}: over ${DESKTOP.svgMaxChars} characters, the dot count plays`, '', '#1e1e1e'))
      else {
        const w = Math.round(art.width * DESKTOP.paneScale)
        const h = Math.round(art.height * DESKTOP.paneScale)
        cells.push(cell(`${what}<br>${svg.length.toLocaleString()} characters`, `<img width="${w}" height="${h}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`, '#1e1e1e'))
      }
    }
  }
  return `<p>Throws at the pane's size, drawn as images like the Code tab draws them (looping):</p>${flex(cells.join(''))}`
}

/** The sheet's frames as an animated GIF, `scale`× on dark and light side by side, `tiles` copies across. */
function sheetGif(png, sheet, fps, scale, tiles) {
  const { width: w, height: h, frames } = sheet
  const half = w * tiles * scale
  const GW = half * 2
  const GH = h * scale
  const colors = [DARK, LIGHT]
  const index = new Map(colors.map((c, i) => [c.join(), i]))
  const pixels = []
  for (let f = 0; f < frames; f++) {
    const px = new Uint8Array(GW * GH)
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const side = x < half ? 0 : 1
        const sx = ((((x % half) / scale) | 0) % w) + f * w
        const i = (((y / scale) | 0) * png.width + sx) * 4
        const c = png.data[i + 3] === 255 ? [png.data[i], png.data[i + 1], png.data[i + 2]] : colors[side]
        if (!index.has(c.join())) {
          index.set(c.join(), colors.length)
          colors.push(c)
        }
        px[y * GW + x] = index.get(c.join())
      }
    }
    pixels.push(px)
  }
  let size = 2
  while (size < colors.length) size *= 2
  const palette = Array.from({ length: size }, (_, i) => {
    const c = colors[i] ?? [0, 0, 0]
    return (c[0] << 16) | (c[1] << 8) | c[2]
  })
  const buf = new Uint8Array(GW * GH * frames + 1024 * 1024)
  const writer = new omggif.GifWriter(buf, GW, GH, { palette, loop: 0 })
  for (const px of pixels) writer.addFrame(0, 0, GW, GH, px, { delay: Math.max(2, Math.round(100 / fps)) })
  return Buffer.from(buf.subarray(0, writer.end())).toString('base64')
}

const cell = (label, inner, bg) => `<figure style="background:${bg};padding:12px;margin:0"><div>${inner}</div><figcaption style="color:#888;font:12px system-ui;max-width:220px">${label}</figcaption></figure>`
const flex = (inner) => `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-top:8px">${inner}</div>`

function fsReader() {
  return {
    async listFolders(path) {
      return existsSync(path) ? readdirSync(path, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : []
    },
    async readText(path) {
      return existsSync(path) ? readFileSync(path, 'utf8') : undefined
    },
    async readBase64(path) {
      return existsSync(path) ? readFileSync(path).toString('base64') : undefined
    },
  }
}
