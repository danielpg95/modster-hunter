// Writes fixtures/test.png (4×2 RGBA) and fixtures/expected.json (its unfiltered pixels)
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (b) => {
  let r = ~0
  for (const x of b) r = table[(r ^ x) & 255] ^ (r >>> 8)
  return ~r >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const sum = Buffer.alloc(4)
  sum.writeUInt32BE(crc(body))
  return Buffer.concat([len, body, sum])
}

const w = 4
const h = 2
const scan = []
const pixels = []
for (let y = 0; y < h; y++) {
  scan.push(0) // filter type: none
  for (let x = 0; x < w; x++) {
    const p = [x * 60, y * 120, 200, x === 0 ? 0 : 255]
    scan.push(...p)
    pixels.push(...p)
  }
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(w, 0)
ihdr.writeUInt32BE(h, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.from(scan))), chunk('IEND', Buffer.alloc(0))])

writeFileSync(new URL('./fixtures/test.png', import.meta.url), png)
writeFileSync(new URL('./fixtures/expected.json', import.meta.url), JSON.stringify({ width: w, height: h, rgba: pixels }))
