import { CATCH } from '../../../../hooks/constants'
import type { Catcher, RgbaImage, Sprite } from '../../../../hooks/content'
import { throwingMs, type CatchOutcome } from '../../../../hooks/game'
import { catchFrame, prepareCatch } from '../../../../hooks/render'

// A catcher's throw for the player to look at (decision 0035 point 14), drawn
// with the mod's own frame function: one row per sample Modster; columns for a
// catch, a miss after 2 rocks and one after 1, each on a dark terminal, then a
// light one.

export const PREVIEW_CASES: readonly (readonly [CatchOutcome, number])[] = [
  ['caught', CATCH.rocksToCatch],
  ['missed', 2],
  ['missed', 1],
]

const BACKGROUNDS = [
  [0x1e, 0x1f, 0x22],
  [0xfa, 0xfa, 0xf7],
] as const
const PAGE = [0x2b, 0x2b, 0x30]

export interface PreviewModster {
  name: string
  sprite: Sprite
  fps: number
}

export interface CatchPreview {
  /** One image per frame at CATCH.fps: the whole loop, a catch's caught beat and a short pause included */
  frames: RgbaImage[]
  /** Whether the catcher fits each Modster's sprite area; where it doesn't, the game shows the dot count */
  fits: boolean[]
}

/** Every frame of the throw on each Modster, `scale` times its size. */
export function catchPreview(catcher: Catcher, catcherSprite: Sprite, modsters: readonly PreviewModster[], scale: number): CatchPreview {
  const arts = modsters.map((modster) => prepareCatch(catcher, catcherSprite, modster.sprite, modster.fps))
  const cellWidth = Math.max(...modsters.map((modster) => modster.sprite.width)) * scale
  const cellHeight = Math.max(...modsters.map((modster) => modster.sprite.height)) * scale
  const gap = scale * 2
  const columns = PREVIEW_CASES.length * BACKGROUNDS.length
  const width = gap + columns * (cellWidth + gap)
  const height = gap + modsters.length * (cellHeight + gap)
  const loopMs = throwingMs('caught', CATCH.rocksToCatch) + CATCH.beatMs.caught + CATCH.previewPauseMs
  const step = 1000 / CATCH.fps
  const frames: RgbaImage[] = []
  for (let ms = 0; ms < loopMs; ms += step) {
    const data = new Uint8Array(width * height * 4)
    for (let i = 0; i < width * height; i++) data.set([...PAGE, 255], i * 4)
    modsters.forEach((modster, row) => {
      const art = arts[row]
      if (!art) return
      PREVIEW_CASES.forEach(([outcome, rocks], c) => {
        const frame = catchFrame(art, outcome, rocks, ms)
        BACKGROUNDS.forEach((background, t) => {
          // Each Modster sits at the bottom center of its cell
          const left = gap + (c * BACKGROUNDS.length + t) * (cellWidth + gap) + Math.floor((cellWidth - frame.width * scale) / 2)
          const top = gap + row * (cellHeight + gap) + (cellHeight - frame.height * scale)
          for (let y = 0; y < frame.height * scale; y++) {
            for (let x = 0; x < frame.width * scale; x++) {
              const i = (Math.floor(y / scale) * frame.width + Math.floor(x / scale)) * 4
              const lit = (frame.rgba[i + 3] ?? 0) >= 128
              const color = lit ? [frame.rgba[i] ?? 0, frame.rgba[i + 1] ?? 0, frame.rgba[i + 2] ?? 0] : background
              data.set([...color, 255], ((top + y) * width + left + x) * 4)
            }
          }
        })
      })
    })
    frames.push({ width, height, data })
  }
  return { frames, fits: arts.map((art) => art.fits) }
}

/** A page that plays PNG frames (base64) at CATCH.fps, with a line saying what's where. Self-contained: no network. */
export function catchPreviewPage(title: string, modsterNames: readonly string[], pngs: readonly string[]): string {
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const images = pngs.map((png, i) => `<img src="data:image/png;base64,${png}"${i === 0 ? '' : ' hidden'} alt="">`).join('\n')
  return `<!doctype html>
<meta charset="utf-8">
<title>${escape(title)}</title>
<style>
  body { margin: 0; padding: 16px; background: #141418; color: #ececf0; font: 14px/1.4 system-ui, sans-serif; }
  img { image-rendering: pixelated; max-width: 100%; display: block; }
  img[hidden] { display: none; }
  p { color: #9a99a3; }
</style>
<h1>${escape(title)}</h1>
<p>Left to right: a catch, a miss after 2 rocks, a miss after 1, each on a dark terminal, then a light one. Top to bottom: ${escape(modsterNames.join(', '))}.</p>
<div id="frames">
${images}
</div>
<script>
  const frames = document.querySelectorAll('#frames img')
  let shown = 0
  setInterval(() => {
    frames[shown].hidden = true
    shown = (shown + 1) % frames.length
    frames[shown].hidden = false
  }, ${Math.round(1000 / CATCH.fps)})
</script>
`
}
