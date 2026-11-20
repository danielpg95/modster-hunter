import type { DesktopSheet } from '../content'
import { decodePng } from '../vendor/png'
import { encodePng } from '../vendor/png-encode'

/**
 * The sheet cut to its frame 0, re-encoded as its own PNG: what a Collection
 * card embeds (decision 0061), so a page of cards stays within the Svg budget.
 * Size, bounds and colours are the sheet's, so the card fits as before.
 */
export function firstFrameSheet(sheet: DesktopSheet): DesktopSheet {
  if (sheet.frames === 1) return sheet
  const { width, height } = sheet
  const bytes = Uint8Array.from(atob(sheet.png), (char) => char.charCodeAt(0))
  const image = decodePng(bytes, { maxWidth: width * sheet.frames, maxHeight: height })
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) data.set(image.data.subarray(y * image.width * 4, (y * image.width + width) * 4), y * width * 4)
  return { ...sheet, png: toBase64(encodePng({ width, height, data })), frames: 1 }
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const step = 0x8000
  for (let at = 0; at < bytes.length; at += step) binary += String.fromCharCode(...bytes.subarray(at, at + step))
  return btoa(binary)
}
