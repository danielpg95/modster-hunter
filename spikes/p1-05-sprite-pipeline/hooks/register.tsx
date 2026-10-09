import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'
import { decodePng } from '../lib/png'
import type { Decoded, Inflate } from '../lib/png'
import { inflate } from '../lib/inflate'
import { pixelsToCells } from '../lib/pixels-to-cells'

const ENCOUNTER_DELAY_MS = 1000
const FRAME_MS = 250
const SPRITE_KEY = 'sprite'
// Shown in the band, in this order; mine.png is optional (drop any 8-bit PNG sheet of square frames there)
const VISUAL_FILES = ['small-rgba.png', 'small-palette-trns.png', 'mine.png']

const isEncounterShown = atom({ plugin: 'modster-hunter', key: 'isEncounterShown' } as const, false)

interface Sheet {
  file: string
  decodeMs: number
  width: number
  height: number
  frames: string[]
}

let sheets: Sheet[] = []
let sheetErrors: string[] = []
let probeReport = 'Probes have not run yet'
let sheetIndex = 0
let frameIndex = 0
let delayTimer: Timer | undefined
let frameTimer: Timer | undefined
let requestId: string | undefined
let isBlitting = false

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

// Splits a sheet of square frames (frame size = sheet height) into Raster cells
function toSheet(file: string, d: Decoded, decodeMs: number): Sheet {
  const size = d.height
  const frames: string[] = []
  for (let f = 0; f < Math.max(1, Math.floor(d.width / size)); f++) {
    const rgba: number[] = []
    for (let y = 0; y < size; y++) {
      const start = (y * d.width + f * size) * 4
      rgba.push(...d.rgba.slice(start, start + size * 4))
    }
    frames.push(pixelsToCells({ width: size, height: size, rgba }))
  }
  return { file, decodeMs, width: size, height: size, frames }
}

async function runProbes($: EngineInterface): Promise<string[]> {
  const root = $.plugin.root
  const lines: string[] = []
  lines.push(`typeof DecompressionStream: ${typeof DecompressionStream}`)
  lines.push(`typeof Blob: ${typeof Blob}`)
  lines.push(`typeof Response: ${typeof Response}`)
  lines.push(`typeof createImageBitmap: ${typeof (globalThis as { createImageBitmap?: unknown }).createImageBitmap}`)
  lines.push(`typeof Uint8Array.fromBase64: ${typeof Uint8Array.fromBase64}`)

  const { base64 } = await $.fs.read(`${root}/fixtures/test.png`, { as: 'bytes' })
  const bytes = Uint8Array.fromBase64(base64)
  lines.push(await probe('test.png via DecompressionStream', () => decodePng(bytes, nativeInflate).then(() => 'decoded')))

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
  lines.push(await probe('too-big.png read', () => $.fs.read(`${root}/fixtures/too-big.png`, { as: 'bytes' }).then(() => 'read OK')))
  return lines
}

async function loadSheets($: EngineInterface) {
  sheets = []
  sheetErrors = []
  for (const file of VISUAL_FILES) {
    try {
      const { base64 } = await $.fs.read(`${$.plugin.root}/fixtures/${file}`, { as: 'bytes' })
      const t0 = Date.now()
      const d = await decodePng(Uint8Array.fromBase64(base64), inflate)
      sheets.push(toSheet(file, d, Date.now() - t0))
    } catch (err) {
      if (file !== 'mine.png' || !String(err).includes('ENOENT')) sheetErrors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

function stopFrames() {
  frameTimer?.cancel()
  frameTimer = undefined
  requestId = undefined
}

function stopAll() {
  delayTimer?.cancel()
  delayTimer = undefined
  stopFrames()
}

// Skips a tick while the previous blit is still in flight
function startFrames($: EngineInterface) {
  frameTimer?.cancel()
  frameTimer = $.clock.every(FRAME_MS, async () => {
    const sheet = sheets[sheetIndex]
    if (!requestId || isBlitting || !sheet) return
    isBlitting = true
    frameIndex = (frameIndex + 1) % sheet.frames.length
    try {
      await $.ui.blit({ requestId, key: SPRITE_KEY, cells: sheet.frames[frameIndex]! })
    } finally {
      isBlitting = false
    }
  })
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'modsters', description: 'P1-05 spike: PNG decode results' })
    const lines = await runProbes($)
    await loadSheets($)
    lines.push(...sheets.map((s) => `band: ${s.file} ${s.frames.length} frames, ${s.decodeMs} ms`), ...sheetErrors.map((m) => `band: ${m}`))
    probeReport = lines.join('\n')
    await $.fs.write(`${$.plugin.root}/result.txt`, probeReport + '\n')
    return next(e)
  })

  on('turn.start', ($, e, next) => {
    stopAll()
    delayTimer = $.clock.after(ENCOUNTER_DELAY_MS, () => {
      void update($, isEncounterShown, () => true)
    })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    stopAll()
    await update($, isEncounterShown, () => false)
    return next(e)
  })

  on('session.end', ($, e, next) => {
    stopAll()
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const isShown = await read($, isEncounterShown)
    const sheet = sheets[sheetIndex]
    if (e.props.hasSurvey || !e.props.isWorking || !isShown || !sheet) {
      stopFrames()
      return next(e)
    }

    // Raster is terminal only
    if (e.surface !== 'terminal') return next(e)
    const { Box, Text, Button, Raster } = $.ui.resolve(e)
    const rows = Math.ceil(sheet.height / 2)
    if (rows > e.props.maxRows) return next(e)

    requestId = e.requestId
    if (!frameTimer) startFrames($)
    frameIndex %= sheet.frames.length

    return (
      <Box flexDirection="row" columnGap={2}>
        <Raster key={SPRITE_KEY} columns={sheet.width} rows={rows} cells={sheet.frames[frameIndex]!} />
        <Box flexDirection="column">
          <Text>{sheet.file}</Text>
          <Text dimColor>
            {sheet.width}×{sheet.height}, {sheet.frames.length} frames, decoded in {sheet.decodeMs} ms
          </Text>
          <Button
            key="next"
            label={`Next PNG (${sheetIndex + 1}/${sheets.length})`}
            hotkey="2"
            plain
            onPress={() => {
              sheetIndex = (sheetIndex + 1) % sheets.length
              frameIndex = 0
              $.ui.invalidate('ui.render')
            }}
          />
          {sheetErrors.length > 0 && <Text color="red">{sheetErrors[0]}</Text>}
        </Box>
      </Box>
    )
  })

  on('command.run', { command: 'modsters' }, async () => {
    return { text: probeReport }
  })
}
