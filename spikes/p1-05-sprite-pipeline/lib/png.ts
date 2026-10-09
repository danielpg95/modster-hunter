// PNG → RGBA (8-bit, non-interlaced, color types 2/3/6). Takes the inflate function so both routes share it.
export interface Decoded {
  width: number
  height: number
  rgba: number[]
}

export type Inflate = (zlib: Uint8Array) => Uint8Array | Promise<Uint8Array>

const u32 = (b: Uint8Array, o: number) => ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0

export async function decodePng(png: Uint8Array, inflate: Inflate): Promise<Decoded> {
  let width = 0
  let height = 0
  let colorType = 0
  let palette: number[] = []
  let trns: number[] = []
  const idat: number[] = []
  for (let o = 8; o < png.length; ) {
    const len = u32(png, o)
    const type = String.fromCharCode(png[o + 4]!, png[o + 5]!, png[o + 6]!, png[o + 7]!)
    const data = png.subarray(o + 8, o + 8 + len)
    if (type === 'IHDR') {
      width = u32(data, 0)
      height = u32(data, 4)
      colorType = data[9]!
      if (data[8] !== 8 || data[12] !== 0) throw new Error('png: only 8-bit, non-interlaced')
    } else if (type === 'PLTE') palette = [...data]
    else if (type === 'tRNS') trns = [...data]
    else if (type === 'IDAT') idat.push(...data)
    o += 12 + len
  }
  const bpp = { 2: 3, 3: 1, 6: 4 }[colorType as 2 | 3 | 6]
  if (!bpp) throw new Error(`png: unsupported color type ${colorType}`)
  const raw = await inflate(Uint8Array.from(idat))
  const stride = width * bpp
  const px = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]!
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i]!
      const a = i >= bpp ? px[y * stride + i - bpp]! : 0
      const b = y ? px[(y - 1) * stride + i]! : 0
      const c = y && i >= bpp ? px[(y - 1) * stride + i - bpp]! : 0
      const p = a + b - c
      const pa = Math.abs(p - a)
      const pb = Math.abs(p - b)
      const pc = Math.abs(p - c)
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      px[y * stride + i] = (x + [0, a, b, (a + b) >> 1, paeth][f]!) & 255
    }
  }
  const rgba: number[] = []
  for (let i = 0; i < width * height; i++) {
    if (colorType === 6) rgba.push(px[i * 4]!, px[i * 4 + 1]!, px[i * 4 + 2]!, px[i * 4 + 3]!)
    else if (colorType === 2) rgba.push(px[i * 3]!, px[i * 3 + 1]!, px[i * 3 + 2]!, 255)
    else {
      const k = px[i]!
      rgba.push(palette[k * 3]!, palette[k * 3 + 1]!, palette[k * 3 + 2]!, trns[k] ?? 255)
    }
  }
  return { width, height, rgba }
}
