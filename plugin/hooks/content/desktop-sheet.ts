import { CONTENT } from '../constants'
import { decodePng } from '../vendor/png'
import { IssueList } from './issue-list'
import type { DesktopSheet, Validation } from './types'

/** The bounds of one kind of desktop art (`CONTENT.desktop`, decision 0045 points 3–5). */
export interface DesktopSheetRules {
  widthMax: number
  heightMax: number
  bytesMax: number
}

/**
 * Checks a desktop PNG sheet against decision 0045: it decodes, its width
 * splits into `frames` equal frames within the bounds, it's within the byte
 * budget, every pixel is fully opaque or fully clear, and it has at most 64
 * opaque colours. The PNG is kept as-is, since the desktop embeds the file
 * itself (point 9). `field` names the reference in issues. Never throws.
 */
export function desktopSheet(png: string, sheet: { frames: number; field: string; file: string }, rules: DesktopSheetRules): Validation<DesktopSheet> {
  const issues = new IssueList(sheet.file)
  const { field, frames } = sheet
  // Uint8Array.fromBase64 isn't in the es2023 lib the types target
  const bytes = Uint8Array.from(atob(png), (char) => char.charCodeAt(0))
  if (bytes.length > rules.bytesMax) {
    return issues.fail(field, `points to a ${kib(bytes.length)} PNG; desktop art here is at most ${kib(rules.bytesMax)}`)
  }

  // The size comes from the header, so a sheet past the bounds is refused before any pixels are inflated
  const size = headerSize(bytes)
  if (size && size.width % frames !== 0) {
    return issues.fail(field, `points to a ${size.width} px wide sheet, which doesn't split into ${frames} equal frames`)
  }
  if (size && (size.width / frames > rules.widthMax || size.height > rules.heightMax)) {
    return issues.fail(field, `points to ${size.width / frames}×${size.height} frames; at most ${rules.widthMax}×${rules.heightMax}`)
  }
  let image
  try {
    image = decodePng(bytes, { maxWidth: rules.widthMax * frames, maxHeight: rules.heightMax })
  } catch (error) {
    return issues.fail(field, `points to a PNG that can't be read: ${error instanceof Error ? error.message : String(error)}`)
  }
  const width = image.width / frames

  const colors = new Set<string>()
  let partial = 0
  for (let at = 0; at < image.data.length; at += 4) {
    const alpha = image.data[at + 3]!
    if (alpha === 0) continue
    if (alpha !== 255) partial++
    else colors.add(hex(image.data, at))
  }
  // Drawn as-is, a half-clear pixel would blend, unlike the terminal's cut at 128 (point 6)
  if (partial > 0) issues.error(field, `has ${partial} half-transparent pixel${partial === 1 ? '' : 's'}; every pixel must be fully opaque or fully clear`)
  const { colorsMax } = CONTENT.desktop
  if (colors.size > colorsMax) issues.error(field, `has ${colors.size} opaque colours; at most ${colorsMax}`)

  return issues.result({ png, width, height: image.height, frames, colors: [...colors] })
}

/** Width and height from a PNG's IHDR, or undefined when it isn't one (`decodePng` then says why). */
function headerSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  // Signature (8), chunk length (4), "IHDR" (4), then width and height
  if (bytes.length < 24 || String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') return undefined
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function hex(data: Uint8Array, at: number): string {
  return `#${[data[at]!, data[at + 1]!, data[at + 2]!].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

function kib(bytes: number): string {
  return `${Math.ceil(bytes / 102.4) / 10} KiB`
}
