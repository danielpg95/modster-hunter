import type { RgbaImage } from '../../../../hooks/content'

// Turns a reference image into a sprite-sized base (P5-22), for the helper's
// `reduce` and the repo's tools/ref-sprite.mjs, so both reduce the same way:
// cut the subject out along its dark outline, build a palette, shrink by each
// cell's most common color, and keep the largest shape. For desktop art
// (decision 0045), `clearReaching` and `trimEdges` clean up what a busy
// background leaves behind. Pure: no Node APIs.

export type Rgb = [number, number, number]

export interface Crop {
  x: number
  y: number
  w: number
  h: number
}

export type Edge = 'top' | 'left' | 'right' | 'bottom'

/** Palette indexes row by row; -1 is transparent. */
export interface IndexedImage {
  width: number
  height: number
  pixels: Int16Array
}

export interface Reduced {
  image: IndexedImage
  palette: Rgb[]
}

const lum = (r: number, g: number, b: number): number => 0.3 * r + 0.59 * g + 0.11 * b
const dist2 = (a: readonly number[], b: readonly number[]): number => (a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2

/** Background mask for a crop of `png`: 1 where the background is, flood-filled from `edges` and stopped by dark pixels. */
export function cutout(png: RgbaImage, crop: Crop, { dark = 70, edges = ['top', 'left', 'right', 'bottom'] }: { dark?: number; edges?: readonly string[] } = {}): Uint8Array {
  const { x: X0, y: Y0, w: W, h: H } = crop
  const at = (x: number, y: number) => ((Y0 + y) * png.width + X0 + x) * 4
  const wall = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y)
      if (lum(png.data[i]!, png.data[i + 1]!, png.data[i + 2]!) >= dark) continue
      // Grown by a pixel, so JPEG noise can't leak through the outline
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < W && ny < H) wall[ny * W + nx] = 1
        }
      }
    }
  }
  const bg = new Uint8Array(W * H)
  const stack: number[] = []
  for (let x = 0; x < W; x++) {
    if (edges.includes('top')) stack.push(x)
    if (edges.includes('bottom')) stack.push((H - 1) * W + x)
  }
  for (let y = 0; y < H; y++) {
    if (edges.includes('left')) stack.push(y * W)
    if (edges.includes('right')) stack.push(y * W + W - 1)
  }
  while (stack.length) {
    const k = stack.pop()!
    if (bg[k] || wall[k]) continue
    bg[k] = 1
    const x = k % W
    const y = (k / W) | 0
    if (x > 0) stack.push(k - 1)
    if (x < W - 1) stack.push(k + 1)
    if (y > 0) stack.push(k - W)
    if (y < H - 1) stack.push(k + W)
  }
  return bg
}

/** A palette of up to `count` colors for `colors`, by k-means from spread-out seeds. */
export function buildPalette(colors: readonly Rgb[], count: number): Rgb[] {
  const first = colors[0]
  if (!first) return []
  const centres: number[][] = [first.slice()]
  while (centres.length < count) {
    let best: Rgb | undefined
    let bestD = -1
    for (const c of colors) {
      const d = Math.min(...centres.map((m) => dist2(c, m)))
      if (d > bestD) {
        bestD = d
        best = c
      }
    }
    if (!best || bestD <= 0) break
    centres.push(best.slice())
  }
  for (let round = 0; round < 20; round++) {
    const sums = centres.map(() => [0, 0, 0, 0])
    for (const c of colors) {
      const s = sums[nearest(centres, c)]!
      s[0]! += c[0]
      s[1]! += c[1]
      s[2]! += c[2]
      s[3]!++
    }
    sums.forEach((s, i) => {
      if (s[3]) centres[i] = [s[0]! / s[3], s[1]! / s[3], s[2]! / s[3]]
    })
  }
  return centres.map((c) => c.map(Math.round) as Rgb)
}

export function nearest(palette: readonly (readonly number[])[], c: readonly number[]): number {
  let best = 0
  let bestD = Infinity
  palette.forEach((p, i) => {
    const d = dist2(p, c)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

/**
 * Shrinks the crop to `size` cells: each cell takes its most common palette color among
 * subject pixels, or stays transparent when most of it is background. Keeps thin lines
 * (outlines, eyes) that averaging would blur.
 */
export function shrink(png: RgbaImage, crop: Crop, bg: Uint8Array, palette: readonly Rgb[], size: { w: number; h: number }): IndexedImage {
  const { x: X0, y: Y0, w: W, h: H } = crop
  const pixels = new Int16Array(size.w * size.h).fill(-1)
  for (let cy = 0; cy < size.h; cy++) {
    for (let cx = 0; cx < size.w; cx++) {
      const counts = new Map<number, number>()
      let total = 0
      let subject = 0
      for (let y = Math.floor((cy * H) / size.h); y < ((cy + 1) * H) / size.h; y++) {
        for (let x = Math.floor((cx * W) / size.w); x < ((cx + 1) * W) / size.w; x++) {
          total++
          if (bg[y * W + x]) continue
          subject++
          const i = ((Y0 + y) * png.width + X0 + x) * 4
          const k = nearest(palette, [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!])
          counts.set(k, (counts.get(k) ?? 0) + 1)
        }
      }
      if (subject * 2 < total) continue
      pixels[cy * size.w + cx] = [...counts].sort((a, b) => b[1] - a[1])[0]![0]
    }
  }
  return { width: size.w, height: size.h, pixels }
}

/** Clears everything but the largest 4-connected shape. */
export function keepLargest(image: IndexedImage): IndexedImage {
  const { width: W, height: H, pixels } = image
  const id = new Int32Array(W * H).fill(-1)
  let best = -1
  let bestSize = 0
  let next = 0
  for (let s = 0; s < W * H; s++) {
    if (pixels[s]! < 0 || id[s]! >= 0) continue
    let size = 0
    const stack = [s]
    while (stack.length) {
      const k = stack.pop()!
      if (id[k]! >= 0 || pixels[k]! < 0) continue
      id[k] = next
      size++
      const x = k % W
      const y = (k / W) | 0
      if (x > 0) stack.push(k - 1)
      if (x < W - 1) stack.push(k + 1)
      if (y > 0) stack.push(k - W)
      if (y < H - 1) stack.push(k + W)
    }
    if (size > bestSize) {
      bestSize = size
      best = next
    }
    next++
  }
  for (let k = 0; k < W * H; k++) if (id[k] !== best) pixels[k] = -1
  return image
}

/** The whole pipeline: a decoded reference in, a palette-indexed base out. */
export function refImage(png: RgbaImage, options: { crop: Crop; size: { w: number; h: number }; colors?: number; dark?: number; edges?: readonly string[] }): Reduced {
  const { crop, size, colors = 24, dark = 70, edges } = options
  const bg = cutout(png, crop, { dark, ...(edges ? { edges } : {}) })
  const sample: Rgb[] = []
  for (let y = 0; y < crop.h; y += 2) {
    for (let x = 0; x < crop.w; x += 2) {
      if (bg[y * crop.w + x]) continue
      const i = ((crop.y + y) * png.width + crop.x + x) * 4
      sample.push([png.data[i]!, png.data[i + 1]!, png.data[i + 2]!])
    }
  }
  const palette = buildPalette(sample, colors)
  const image = keepLargest(shrink(png, crop, bg, palette, size))
  return { image, palette }
}

/**
 * Clears pixels whose color is within `tolerance` of one of `colors` and that reach the
 * outside (the image edge or a transparent pixel) through such pixels. Enclosed matches stay:
 * they're usually highlights.
 */
export function clearReaching(image: IndexedImage, palette: readonly Rgb[], colors: readonly Rgb[], tolerance = 48): IndexedImage {
  const { width: W, height: H, pixels } = image
  const near = palette.map((p) => colors.some((c) => dist2(p, c) <= tolerance * tolerance))
  const matches = (k: number) => pixels[k]! >= 0 && near[pixels[k]!] === true
  const out = new Uint8Array(W * H)
  const stack: number[] = []
  for (let k = 0; k < W * H; k++) {
    const x = k % W
    const y = (k / W) | 0
    if (pixels[k]! < 0 || x === 0 || y === 0 || x === W - 1 || y === H - 1) {
      out[k] = 1
      stack.push(k)
    }
  }
  while (stack.length) {
    const k = stack.pop()!
    const x = k % W
    const y = (k / W) | 0
    for (const n of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1]) {
      if (n < 0 || out[n] || !matches(n)) continue
      out[n] = 1
      stack.push(n)
    }
  }
  for (let k = 0; k < W * H; k++) if (out[k] && matches(k)) pixels[k] = -1
  return image
}

/** Clears pixels on the outer edge at least `brightness` bright (0–255 luma), twice, so a 2-px fringe goes too. */
export function trimEdges(image: IndexedImage, palette: readonly Rgb[], brightness: number): IndexedImage {
  const { width: W, height: H, pixels } = image
  for (let pass = 0; pass < 2; pass++) {
    const clear: number[] = []
    for (let k = 0; k < W * H; k++) {
      const p = pixels[k]!
      if (p < 0 || lum(...palette[p]!) < brightness) continue
      const x = k % W
      const y = (k / W) | 0
      const edge = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => {
        const nx = x + dx!
        const ny = y + dy!
        return nx < 0 || ny < 0 || nx >= W || ny >= H || pixels[ny * W + nx]! < 0
      })
      if (edge) clear.push(k)
    }
    for (const k of clear) pixels[k] = -1
  }
  return image
}

/** The base as RGBA: palette colors, fully opaque, or fully clear. */
export function indexedRgba({ image, palette }: Reduced): RgbaImage {
  const data = new Uint8Array(image.width * image.height * 4)
  for (let k = 0; k < image.width * image.height; k++) {
    const p = image.pixels[k]!
    if (p >= 0) data.set([...palette[p]!, 255], k * 4)
  }
  return { width: image.width, height: image.height, data }
}

/** `#8fd3f0` as [r, g, b]; throws on anything else. */
export function parseRgb(text: string): Rgb {
  const m = text.trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!m) throw new Error(`"${text}" is not a color like #8fd3f0`)
  return [0, 2, 4].map((o) => parseInt(m[1]!.slice(o, o + 2), 16)) as Rgb
}
