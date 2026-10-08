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

// Fills the given pixel size with a border and transparent corners, to test the band limit
function stressFrame(width: number, height: number): Frame {
  const rgba: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isCorner = (x < 2 || x >= width - 2) && (y < 2 || y >= height - 2)
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      rgba.push(...(isCorner ? [0, 0, 0, 0] : isEdge ? [255, 200, 0, 255] : [76, 175, 80, 255]))
    }
  }
  return { width, height, rgba }
}

const BUTTON_COLUMNS = 14

export const register: Register = (on) => {
  let timer: Timer | undefined
  let isStress = false

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
    const { Box, Text, Button, Raster } = $.ui.resolve(e)
    const { maxRows, bodyColumns } = e.props

    // Stress mode: the biggest sprite the band allows, as tall as maxRows and as wide as fits beside the buttons
    const frame = isStress
      ? stressFrame(Math.max(2, bodyColumns - BUTTON_COLUMNS), maxRows * 2)
      : spriteFrame(BLOB)
    const rows = Math.ceil(frame.height / 2)

    return (
      <Box flexDirection="row" columnGap={2}>
        <Raster key="sprite" columns={frame.width} rows={rows} cells={pixelsToCells(frame)} />
        <Box flexDirection="column">
          <Button key="throw" label="Throw" hotkey="1" plain onPress={() => $.ui.toast('Thrown!')} />
          <Button
            key="size"
            label={isStress ? 'Normal' : 'Max size'}
            hotkey="2"
            plain
            onPress={() => {
              isStress = !isStress
              $.ui.invalidate('ui.render')
            }}
          />
          <Text dimColor>
            {frame.width}×{frame.height}px
          </Text>
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
