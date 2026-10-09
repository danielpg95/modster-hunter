// Sanity check of the vendored decoder outside the mod runtime: node --experimental-strip-types check-node.mts
import { readFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { decodePng } from './lib/png.ts'
import { inflate } from './lib/inflate.ts'

const fixture = (name: string) => new URL(`./fixtures/${name}`, import.meta.url)
const fnv = (bytes: number[]) => bytes.reduce((h, b) => Math.imul(h ^ b, 0x01000193) >>> 0, 0x811c9dc5)

const png = new Uint8Array(readFileSync(fixture('test.png')))
const expected = JSON.parse(readFileSync(fixture('expected.json'), 'utf8'))
const d = await decodePng(png, inflate)
console.log('test.png matches:', JSON.stringify(d.rgba) === JSON.stringify(expected.rgba))

// Larger input, so dynamic Huffman blocks and back-references are exercised
const big = Uint8Array.from({ length: 50000 }, (_, i) => (i * 7 + (i >> 5)) & 255)
console.log('50 KB round trip matches:', Buffer.compare(Buffer.from(inflate(deflateSync(big))), Buffer.from(big)) === 0)

for (const c of JSON.parse(readFileSync(fixture('cases.json'), 'utf8'))) {
  const t0 = Date.now()
  try {
    const r = await decodePng(new Uint8Array(readFileSync(fixture(c.file))), inflate)
    const ok = r.width === c.width && r.height === c.height && fnv(r.rgba) === c.hash
    console.log(`${c.file}: ok=${ok} ${Date.now() - t0} ms`)
  } catch (err) {
    console.log(`${c.file}: error "${(err as Error).message}" (expected: ${!!c.expectError})`)
  }
}
