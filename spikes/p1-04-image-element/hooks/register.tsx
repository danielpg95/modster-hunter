import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'
import { pixelsToCells } from '../lib/pixels-to-cells'
import type { Frame } from '../lib/pixels-to-cells'

const ENCOUNTER_DELAY_MS = 3000

const isEncounterShown = atom({ plugin: 'modster-hunter', key: 'isEncounterShown' } as const, false)

// Hand-written 12×12 sprite; '.' is transparent
const BLOB = [
  '....gggg....',
  '..gggggggg..',
  '.gggggggggg.',
  '.ggwwggwwgg.',
  'ggwkwggwkwgg',
  'ggwwwggwwwgg',
  'gggggggggggg',
  'gggkggggkggg',
  '.ggggkkgggg.',
  '.gggggggggg.',
  '..gggggggg..',
  '...gg..gg...',
]
const PALETTE: Record<string, number[]> = {
  g: [76, 175, 80, 255],
  w: [255, 255, 255, 255],
  k: [30, 30, 30, 255],
}

function spriteFrame(art: string[]): Frame {
  const rgba: number[] = []
  for (const line of art) for (const ch of line) rgba.push(...(PALETTE[ch] ?? [0, 0, 0, 0]))
  return { width: art[0]!.length, height: art.length, rgba }
}

export const register: Register = (on) => {
  let timer: Timer | undefined
  let mode: 'raster' | 'image' = 'image'

  const stop = () => {
    timer?.cancel()
    timer = undefined
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'modsters', description: 'Open your Modster collection' })
    return next(e)
  })

  on('turn.start', ($, e, next) => {
    stop()
    timer = $.clock.after(ENCOUNTER_DELAY_MS, () => {
      void update($, isEncounterShown, () => true)
    })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    stop()
    await update($, isEncounterShown, () => false)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const isShown = await read($, isEncounterShown)
    if (e.props.hasSurvey || !e.props.isWorking || !isShown) return next(e)

    // Raster is terminal only
    if (e.surface !== 'terminal') return next(e)
    const { Box, Text, Button, Raster, Image } = $.ui.resolve(e)
    const { maxRows } = e.props

    const frame = spriteFrame(BLOB)
    const rows = Math.ceil(frame.height / 2)
    const isImage = mode === 'image'

    return (
      <Box flexDirection="row" columnGap={2}>
        {isImage ? (
          <Image
            key="sprite"
            source={{ rgba: Uint8Array.from(frame.rgba).toBase64(), width: frame.width, height: frame.height }}
            columns={frame.width}
            rows={rows}
            alt="[blob]"
          />
        ) : (
          <Raster key="sprite" columns={frame.width} rows={rows} cells={pixelsToCells(frame)} />
        )}
        <Box flexDirection="column">
          <Button key="throw" label="Throw" hotkey="1" plain onPress={() => $.ui.toast('Thrown!')} />
          <Button
            key="mode"
            label={isImage ? 'Use Raster' : 'Use Image'}
            hotkey="2"
            plain
            onPress={() => {
              mode = isImage ? 'raster' : 'image'
              $.ui.invalidate('ui.render')
            }}
          />
          <Text dimColor>{isImage ? 'Image' : 'Raster'}</Text>
          <Text dimColor>
            {rows}/{maxRows} rows
          </Text>
        </Box>
      </Box>
    )
  })

  on('command.run', { command: 'modsters' }, async () => {
    return { text: 'Modster Hunter is loaded' }
  })
}
