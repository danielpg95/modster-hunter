export interface RawFrame {
  /** LZW bytes, written as one data sub-block */
  data: number[]
  minCodeSize?: number
  palette?: boolean
}

/** A 2×1 GIF built block by block, with a black and red color table, for files real encoders won't write. */
export function rawGif(frames: RawFrame[], options: { palette?: boolean; trailer?: boolean } = {}): Uint8Array {
  const bytes = [...new TextEncoder().encode('GIF89a'), 2, 0, 1, 0, options.palette === false ? 0x00 : 0x80, 0, 0]
  if (options.palette !== false) bytes.push(0, 0, 0, 255, 0, 0)
  for (const frame of frames) {
    bytes.push(0x2c, 0, 0, 0, 0, 2, 0, 1, 0, frame.palette ? 0x80 : 0x00)
    if (frame.palette) bytes.push(0, 0, 255, 0, 255, 0)
    bytes.push(frame.minCodeSize ?? 2, frame.data.length, ...frame.data, 0)
  }
  if (options.trailer !== false) bytes.push(0x3b)
  return Uint8Array.from(bytes)
}
