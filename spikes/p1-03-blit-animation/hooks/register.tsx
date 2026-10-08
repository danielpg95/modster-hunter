import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'
import { pixelsToCells } from '../lib/pixels-to-cells'
import type { Frame } from '../lib/pixels-to-cells'
import { FPS_STEPS, nextFrameIndex, periodMs } from '../lib/animation'

const ENCOUNTER_DELAY_MS = 3000

const isEncounterShown = atom({ plugin: 'modster-hunter', key: 'isEncounterShown' } as const, false)

// Hand-written 12×12 sprite, 4 frames (bounce, blink, bounce); '.' is transparent
const FRAMES = [
  [
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
  ],
  [
    '............',
    '....gggg....',
    '..gggggggg..',
    '.gggggggggg.',
    '.ggwwggwwgg.',
    'ggwkwggwkwgg',
    'ggwwwggwwwgg',
    'gggkggggkggg',
    '.ggggkkgggg.',
    '.gggggggggg.',
    '..gggggggg..',
    '..gg....gg..',
  ],
  [
    '............',
    '............',
    '....gggg....',
    '..gggggggg..',
    '.gggggggggg.',
    '.ggggggggg..',
    'ggggggggggg.',
    'ggkkgggkkggg',
    'gggkggggkggg',
    '.ggggkkgggg.',
    '..gggggggg..',
    '..gg....gg..',
  ],
  [
    '............',
    '....gggg....',
    '..gggggggg..',
    '.gggggggggg.',
    '.ggwwggwwgg.',
    'ggwkwggwkwgg',
    'ggwwwggwwwgg',
    'gggkggggkggg',
    '.ggggkkgggg.',
    '.gggggggggg.',
    '..gggggggg..',
    '...gg..gg...',
  ],
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

const BUTTON_COLUMNS = 14

const FRAME_CELLS = FRAMES.map((art) => pixelsToCells(spriteFrame(art)))
const SPRITE_KEY = 'sprite'

let delayTimer: Timer | undefined
let frameTimer: Timer | undefined
let requestId: string | undefined
let frameIndex = 0
let fpsIndex = 1
let isBlitting = false

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

// Skips a tick while the previous blit is still in flight, so a slow surface never queues frames
function startFrames($: EngineInterface) {
  frameTimer?.cancel()
  frameTimer = $.clock.every(periodMs(FPS_STEPS[fpsIndex]!), async () => {
    if (!requestId || isBlitting) return
    isBlitting = true
    frameIndex = nextFrameIndex(frameIndex, FRAME_CELLS.length)
    try {
      await $.ui.blit({ requestId, key: SPRITE_KEY, cells: FRAME_CELLS[frameIndex]! })
    } finally {
      isBlitting = false
    }
  })
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'modsters', description: 'Open your Modster collection' })
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
    if (e.props.hasSurvey || !e.props.isWorking || !isShown) {
      stopFrames()
      return next(e)
    }

    // Raster is terminal only
    if (e.surface !== 'terminal') return next(e)
    const { Box, Text, Button, Raster } = $.ui.resolve(e)
    const { maxRows } = e.props

    const sprite = spriteFrame(FRAMES[0]!)
    const rows = Math.ceil(sprite.height / 2)
    if (rows > maxRows) return next(e)

    // The mounted Raster starts on the current frame; the timer then repaints it in place
    requestId = e.requestId
    if (!frameTimer) startFrames($)

    return (
      <Box flexDirection="row" columnGap={2}>
        <Raster key={SPRITE_KEY} columns={sprite.width} rows={rows} cells={FRAME_CELLS[frameIndex]!} />
        <Box flexDirection="column">
          <Button key="throw" label="Throw" hotkey="1" plain onPress={() => $.ui.toast('Thrown!')} />
          <Button
            key="speed"
            label={`${FPS_STEPS[fpsIndex]} fps`}
            hotkey="2"
            plain
            onPress={() => {
              fpsIndex = (fpsIndex + 1) % FPS_STEPS.length
              startFrames($)
              $.ui.invalidate('ui.render')
            }}
          />
        </Box>
      </Box>
    )
  })

  on('command.run', { command: 'modsters' }, async () => {
    return { text: 'Modster Hunter is loaded' }
  })
}
