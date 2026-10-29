import type { DesktopSheet } from '../content'

export interface DesktopSheetSvgOptions {
  /** CSS pixels per sheet pixel (`DESKTOP.sheet*Scale`) */
  scale: number
  /** Frames per second; ignored with one frame or a silhouette */
  fps: number
  /** Paints the shape in this one colour and holds frame 0: the Collection tab's uncaught Modster */
  silhouette?: string
}

/**
 * Draws a desktop sheet (decision 0045 point 9) as one SVG document: the PNG
 * embedded as-is behind a window one frame wide, stepped frame by frame by
 * animating its `x`, pixelated. An embedded image shows only in an Svg drawn
 * as an image, so the `Svg` must not be `isInteractive`; SMIL runs there too
 * (P5-39 spike).
 */
export function desktopSheetSvg(sheet: DesktopSheet, { scale, fps, silhouette }: DesktopSheetSvgOptions): string {
  const { width, height, frames } = sheet
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">`
  const filter = silhouette
    ? `<defs><filter id="silhouette"><feFlood flood-color="${silhouette}"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs>`
    : ''
  const image =
    `<image href="data:image/png;base64,${sheet.png}" width="${width * frames}" height="${height}" image-rendering="pixelated" style="image-rendering:pixelated"` +
    `${silhouette ? ' filter="url(#silhouette)"' : ''}>${silhouette ? '' : stepFrames(width, frames, fps)}</image>`
  return `${head}${filter}${image}</svg>`
}

/** Moves the sheet one frame width left per frame, looping at `fps`; nothing with one frame. */
function stepFrames(width: number, frames: number, fps: number): string {
  if (frames < 2) return ''
  const values = Array.from({ length: frames }, (_, i) => -i * width).join(';')
  const keyTimes = Array.from({ length: frames }, (_, i) => +(i / frames).toFixed(4)).join(';')
  return `<animate attributeName="x" values="${values}" keyTimes="${keyTimes}" calcMode="discrete" dur="${+(frames / fps).toFixed(3)}s" repeatCount="indefinite"/>`
}
