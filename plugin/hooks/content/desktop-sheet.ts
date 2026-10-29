import { CATCH, CONTENT } from '../constants'
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

  const measured = measure(image.data, image.width, width, image.height)
  return issues.result({ png, width, height: image.height, frames, colors: [...colors], ...measured })
}

/**
 * What a throw needs from the pixels, measured once so nothing keeps them:
 * the opaque bounds across every frame, and frame 0's main colour (as
 * `catch-frame`'s own `mainColor` and `opaqueBounds` find them for terminal art).
 */
function measure(data: Uint8Array, sheetWidth: number, width: number, height: number): Pick<DesktopSheet, 'bounds' | 'mainColor'> {
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  const counts = new Map<number, number>()
  for (let y = 0; y < height; y++) {
    for (let sx = 0; sx < sheetWidth; sx++) {
      const at = (y * sheetWidth + sx) * 4
      if (data[at + 3]! < 128) continue
      const x = sx % width
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
      if (sx >= width) continue
      const key = (data[at]! << 16) | (data[at + 1]! << 8) | data[at + 2]!
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key)
  const bright = ranked.find((key) => ((key >> 16) & 255) + ((key >> 8) & 255) + (key & 255) > CATCH.glowMinBrightness)
  const main = bright ?? ranked[0] ?? 0xffffff
  // A blank sheet: the whole frame
  const bounds = x1 < 0 ? { x0: 0, y0: 0, x1: width - 1, y1: height - 1 } : { x0, y0, x1, y1 }
  return { bounds, mainColor: `#${main.toString(16).padStart(6, '0')}` }
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

/**
 * Where a catcher's `glowColor` is in each frame of its sheet, as SVG path data in sheet
 * pixels (frame f's x from f × width): one box per run along a row, as `framePaths` draws.
 * A throw paints these in the Modster's colour (decision 0045 point 5). Found exactly here,
 * from the decoded PNG, because matching a colour in the browser fails: it shifts an image's
 * colours a little (seen in P5-53, where a filter lit nothing). Empty strings when the sheet
 * can't be read again.
 */
export function glowPaths(sheet: DesktopSheet, color: string): string[] {
  const bytes = Uint8Array.from(atob(sheet.png), (char) => char.charCodeAt(0))
  let image
  try {
    image = decodePng(bytes, { maxWidth: sheet.width * sheet.frames, maxHeight: sheet.height })
  } catch {
    return Array.from({ length: sheet.frames }, () => '')
  }
  const target = color.toLowerCase()
  return Array.from({ length: sheet.frames }, (_, f) => {
    let d = ''
    for (let y = 0; y < sheet.height; y++) {
      let x = 0
      while (x < sheet.width) {
        const at = f * sheet.width + x
        if (!isColor(image.data, (y * image.width + at) * 4, target)) {
          x++
          continue
        }
        let end = x + 1
        while (end < sheet.width && isColor(image.data, (y * image.width + f * sheet.width + end) * 4, target)) end++
        d += `M${at} ${y}h${end - x}v1h-${end - x}z`
        x = end
      }
    }
    return d
  })
}

function isColor(data: Uint8Array, at: number, target: string): boolean {
  return data[at + 3] === 255 && hex(data, at) === target
}
