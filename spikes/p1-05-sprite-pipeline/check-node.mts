// Sanity check of the vendored decoder outside the mod runtime: node --experimental-strip-types check-node.mts
import { readFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { decodePng } from './lib/png.ts'
import { inflate } from './lib/inflate.ts'

const png = new Uint8Array(readFileSync(new URL('./fixtures/test.png', import.meta.url)))
const expected = JSON.parse(readFileSync(new URL('./fixtures/expected.json', import.meta.url), 'utf8'))
const d = await decodePng(png, inflate)
console.log('png fixture matches:', JSON.stringify(d.rgba) === JSON.stringify(expected.rgba))

// Larger input, so dynamic Huffman blocks and back-references are exercised
const big = Uint8Array.from({ length: 50000 }, (_, i) => (i * 7 + (i >> 5)) & 255)
const same = Buffer.compare(Buffer.from(inflate(deflateSync(big))), Buffer.from(big)) === 0
console.log('50 KB round trip matches:', same)
