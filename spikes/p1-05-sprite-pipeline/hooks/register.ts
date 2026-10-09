import type { Register } from 'claude-code'
import { decodePng } from '../lib/png'
import type { Inflate } from '../lib/png'
import { inflate } from '../lib/inflate'

// Streams the zlib bytes through the platform decompressor
const nativeInflate: Inflate = async (zlib) => {
  const stream = new Blob([zlib]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function fnv(bytes: number[]): number {
  let h = 0x811c9dc5
  for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0
  return h
}

async function probe(name: string, run: () => Promise<unknown>): Promise<string> {
  try {
    return `${name}: ${JSON.stringify(await run())}`
  } catch (err) {
    return `${name}: FAILED ${err instanceof Error ? err.message : String(err)}`
  }
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    const root = $.plugin.root
    const lines: string[] = []

    lines.push(`typeof DecompressionStream: ${typeof DecompressionStream}`)
    lines.push(`typeof Blob: ${typeof Blob}`)
    lines.push(`typeof Response: ${typeof Response}`)
    lines.push(`typeof createImageBitmap: ${typeof (globalThis as { createImageBitmap?: unknown }).createImageBitmap}`)

    const { base64 } = await $.fs.read(`${root}/fixtures/test.png`, { as: 'bytes' })
    const bytes = Uint8Array.fromBase64(base64)
    const expected = JSON.parse(await $.fs.read(`${root}/fixtures/expected.json`)) as { rgba: number[] }
    lines.push(`png bytes: ${bytes.length}`)

    for (const [name, fn] of [
      ['native', nativeInflate],
      ['vendored', inflate],
    ] as const) {
      lines.push(
        await probe(`decode via ${name}`, async () => {
          const t0 = Date.now()
          const d = await decodePng(bytes, fn)
          return { width: d.width, height: d.height, matches: JSON.stringify(d.rgba) === JSON.stringify(expected.rgba), ms: Date.now() - t0 }
        }),
      )
    }

    lines.push(`typeof Uint8Array.fromBase64: ${typeof Uint8Array.fromBase64}`)
    const cases = JSON.parse(await $.fs.read(`${root}/fixtures/cases.json`)) as {
      file: string
      width?: number
      height?: number
      hash?: number
      expectError?: boolean
    }[]
    for (const c of cases) {
      lines.push(
        await probe(c.file, async () => {
          const t0 = Date.now()
          const { base64 } = await $.fs.read(`${root}/fixtures/${c.file}`, { as: 'bytes' })
          const t1 = Date.now()
          const d = await decodePng(Uint8Array.fromBase64(base64), inflate)
          const t2 = Date.now()
          const ok = d.width === c.width && d.height === c.height && fnv(d.rgba) === c.hash
          return { ok, expectError: c.expectError ?? false, readMs: t1 - t0, decodeMs: t2 - t1 }
        }),
      )
    }
    lines.push(await probe('too-big.png (4.6 MiB) read', () => $.fs.read(`${root}/fixtures/too-big.png`, { as: 'bytes' }).then(() => 'read OK')))

    await $.fs.write(`${root}/result.txt`, lines.join('\n') + '\n')
    return next(e)
  })
}
