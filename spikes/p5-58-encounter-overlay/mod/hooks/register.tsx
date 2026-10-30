import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import type { Encounter } from '../types'

// P5-58 spike, not part of Modster Hunter: `/overlay-spike` opens a pane with the
// decision 0050 layout. Start an encounter: the scene flashes and slides right,
// uncovering a strip with Throw and Run (1 and 2); a Client laid over the scene
// hears clicks on the Modster. Redraw mid-encounter to see the motion doesn't replay.

const PANE_ID = 'overlay-spike'
const log = atom({ plugin: 'modster-overlay-spike', key: 'log' } as const, [])
const band = atom({ plugin: 'modster-overlay-spike', key: 'band' } as const, false)
const outline = atom({ plugin: 'modster-overlay-spike', key: 'outline' } as const, false)
const encounter = atom({ plugin: 'modster-overlay-spike', key: 'encounter' } as const, { phase: 'idle', at: 0 })
const redraws = atom({ plugin: 'modster-overlay-spike', key: 'redraws' } as const, 0)
const tries = atom({ plugin: 'modster-overlay-spike', key: 'tries' } as const, 3)

// The scene, in CSS pixels; SLIDE is the strip the slide uncovers at the left
const W = 480
const H = 120
const SLIDE = 120
// The arrival, in seconds (0050 point 2, in the order @danielpg95 set): flash, slide,
// the silhouette fades in and holds, it turns into the sprite, then the name tag fades in
const FLASH_S = 0.4
const SLIDE_S = 0.45
const SLIDE_AT = FLASH_S
const SILHOUETTE_AT = SLIDE_AT + SLIDE_S
const FADE_S = 0.25
const SPRITE_AT = SILHOUETTE_AT + FADE_S + 0.5
const TAG_AT = SPRITE_AT + FADE_S
const ARRIVAL_S = TAG_AT + FADE_S
/** When the strip is uncovered, so the buttons can show */
const BUTTONS_AT_MS = SILHOUETTE_AT * 1000
const COLUMN_PX = 8.8
const ROW_PX = 20
const CELLS = { columns: Math.round(W / COLUMN_PX), rows: Math.ceil(H / ROW_PX) }
// The Modster stands in the middle of the part the scene shows once slid
const MODSTER = { x: SLIDE + (W - SLIDE) / 2 - 30, y: 40, w: 60, h: 70 }

/** Fades from 0 to 1 at `at`, held after; nothing outside the arrival */
function fadeIn(at: number, playing: boolean): string {
  return playing ? `<animate attributeName="opacity" from="0" to="1" begin="${at}s" dur="${FADE_S}s" fill="freeze"/>` : ''
}

function modsterShape(x: number, body: string, eyes: string): string {
  return (
    `<rect x="${x}" y="${MODSTER.y}" width="${MODSTER.w}" height="${MODSTER.h}" rx="18" fill="${body}"/>` +
    `<circle cx="${x + 20}" cy="${MODSTER.y + 28}" r="5" fill="${eyes}"/><circle cx="${x + 40}" cy="${MODSTER.y + 28}" r="5" fill="${eyes}"/>`
  )
}

/**
 * Where an encounter's motion stands: the arrival is split at the redraw that shows the buttons, since a
 * redraw restarts an image Svg's animation even with the same source. Each stage starts its own motion
 * at 0, so a planned redraw never replays the last stage (0050 point 7).
 */
type Stage = 'idle' | 'arrive' | 'reveal' | 'up' | 'leave'

function stageOf(state: Encounter, now: number): Stage {
  const t = (now - state.at) / 1000
  if (state.phase === 'up') return t < SILHOUETTE_AT ? 'arrive' : t < ARRIVAL_S ? 'reveal' : 'up'
  if (state.phase === 'leaving') return t < SLIDE_S ? 'leave' : 'idle'
  return 'idle'
}

function sceneSvg(stage: Stage): string {
  const slid = stage === 'reveal' || stage === 'up' || stage === 'leave'
  const slide =
    stage === 'arrive' || stage === 'leave'
      ? `<animateTransform attributeName="transform" type="translate" from="${stage === 'arrive' ? '0 0' : `${SLIDE} 0`}" to="${stage === 'arrive' ? `${SLIDE} 0` : '0 0'}" dur="${SLIDE_S}s" begin="${stage === 'arrive' ? SLIDE_AT : 0}s" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.8 0.2 1" fill="freeze"/>`
      : ''
  const flash =
    stage === 'arrive'
      ? `<rect width="${W}" height="${H}" fill="#fff" opacity="0"><animate attributeName="opacity" values="0;0.45;0" dur="${FLASH_S}s" fill="freeze"/></rect>`
      : ''
  const x = MODSTER.x - SLIDE
  // In the reveal the silhouette fades in, holds, then gives way to the sprite, and the tag fades in last
  const span = SPRITE_AT + FADE_S - SILHOUETTE_AT
  const reveal = stage === 'reveal'
  const silhouette = reveal
    ? `<g opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;${(FADE_S / span).toFixed(3)};${((SPRITE_AT - SILHOUETTE_AT) / span).toFixed(3)};1" dur="${span}s" fill="freeze"/>${modsterShape(x, '#0d0d0d', '#0d0d0d')}</g>`
    : ''
  const modster =
    reveal || stage === 'up'
      ? `${silhouette}<g opacity="${reveal ? 0 : 1}">${fadeIn(SPRITE_AT - SILHOUETTE_AT, reveal)}${modsterShape(x, '#7cb342', '#111')}</g>` +
        `<g opacity="${reveal ? 0 : 1}">${fadeIn(TAG_AT - SILHOUETTE_AT, reveal)}<rect x="10" y="88" width="150" height="22" rx="11" fill="#000" fill-opacity="0.45"/>` +
        `<text x="22" y="103" font-size="12" font-family="system-ui" fill="#fff">Sproutling ● common</text></g>`
      : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#1b1b1b"/>` +
    `<g transform="translate(${slid ? SLIDE : 0} 0)">${slide}<rect width="${W}" height="${H}" fill="#2e4a3a"/><rect y="96" width="${W}" height="24" fill="#4e6b3a"/>` +
    `<circle cx="40" cy="20" r="3" fill="#9ccc65"><animate attributeName="cy" values="10;100" dur="3s" repeatCount="indefinite"/></circle>` +
    `${modster}</g>${flash}</svg>`
  )
}

interface Probe {
  site: string
  kind: 'down' | 'key'
  x?: number
  y?: number
  columns: number
  rows: number
  key?: string
}

async function onProbe($: EngineInterface, p: Probe): Promise<string> {
  if (p.kind === 'key') return `${p.site}: key "${p.key}" reached the Client`
  const cw = W / Math.max(1, p.columns)
  const ch = H / Math.max(1, p.rows)
  const px = ((p.x ?? 0) + 0.5) * cw
  const py = ((p.y ?? 0) + 0.5) * ch
  const state = await read($, encounter)
  const onModster = state.phase === 'up' && px >= MODSTER.x && px < MODSTER.x + MODSTER.w && py >= MODSTER.y && py < MODSTER.y + MODSTER.h
  return `${p.site}: click at cell ${p.x},${p.y} (~${Math.round(px)},${Math.round(py)} px) → ${onModster ? 'THROW (the Modster)' : 'the scene'}`
}

function note($: EngineInterface, line: string) {
  return update($, log, (now) => [line, ...now].slice(0, 8))
}

async function throwOnce($: EngineInterface, line: string) {
  await update($, tries, (n) => Math.max(0, n - 1))
  return note($, line)
}

// The scene with the strip's buttons and the Client laid over it, for the band or the pane
async function scene($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0], site: string) {
  const { Box, Button, Svg, Client, Text } = $.ui.resolve(e) as any
  const state = await read($, encounter)
  const now = await $.clock.now()
  const show = await read($, outline)
  const stage = stageOf(state, now)
  const left = await read($, tries)
  return (
    <Box key={`spike-${site}`} position="relative">
      <Svg source={sceneSvg(stage)} alt={`${site} scene`} width={W} height={H} />
      <Box position="absolute" top={0} left={0}>
        <Client key={`spike-${site}-overlay`} module="./overlay-probe.tsx" props={{ site, outline: show, rows: CELLS.rows }} width={CELLS.columns} height={CELLS.rows} />
      </Box>
      {stage === 'reveal' || stage === 'up' ? (
        <Box position="absolute" top={0} left={1} flexDirection="column" gap={1}>
          <Button key={`spike-${site}-throw`} label="Throw" hotkey="1" plain onPress={() => throwOnce($, `${site}: Throw button`)} />
          <Button key={`spike-${site}-run`} label="Run" hotkey="2" plain onPress={() => note($, `${site}: Run button`)} />
          <Text dimColor>{`${left} left`}</Text>
        </Box>
      ) : null}
    </Box>
  )
}


export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'overlay-spike', description: 'P5-58: test the sliding encounter scene in the Desktop Code tab', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'overlay-spike' }, async ($) => {
    const opened = await $.ui.open({ id: PANE_ID, title: 'P5-58 overlay spike', focus: true, closeOnEscape: true })
    return opened.isPlaced ? {} : { text: 'overlay-spike: the pane is waiting for room' }
  })

  on('ui.message', async ($, e, next) => {
    const line = await onProbe($, e.data as unknown as Probe)
    if (line.includes('THROW')) await update($, tries, (n) => Math.max(0, n - 1))
    await update($, log, (now) => [line, ...now].slice(0, 8))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || !(await read($, band))) return next(e)
    return scene($, e, 'band')
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE_ID) return next(e)
    if (e.surface !== 'desktop') {
      const { Text } = $.ui.resolve(e)
      return <Text>Open /overlay-spike in the Desktop app's Code tab.</Text>
    }
    const { Box, Text, Button } = $.ui.resolve(e)
    const lines = await read($, log)
    const state = await read($, encounter)
    const count = await read($, redraws)
    const setPhase = async (phase: Encounter['phase']) => {
      const at = await $.clock.now()
      await update($, encounter, () => ({ phase, at }))
      if (phase === 'up') await update($, tries, () => 3)
      // The buttons show once the strip is uncovered, and the scene drops its motion once it's over
      if (phase === 'up') {
        $.clock.after(BUTTONS_AT_MS, () => $.ui.invalidate('ui.render'))
        $.clock.after(ARRIVAL_S * 1000 + 50, () => $.ui.invalidate('ui.render'))
      } else {
        $.clock.after(SLIDE_S * 1000 + 50, () => $.ui.invalidate('ui.render'))
      }
    }
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>The sliding scene (decision 0050)</Text>
        <Text dimColor>Start: does it flash, then slide right, with Throw and Run in the strip? Click the Modster, the buttons, and press 1 and 2. Redraw mid-encounter: does the slide replay? End: does it slide back?</Text>
        {await scene($, e, 'pane')}
        <Box flexDirection="row" gap={1}>
          <Button key="spike-start" label={state.phase === 'up' ? 'End encounter' : 'Start encounter'} onPress={() => setPhase(state.phase === 'up' ? 'leaving' : 'up')} />
          <Button key="spike-redraw" label={`Redraw (${count})`} onPress={() => update($, redraws, (n) => n + 1)} />
          <Button key="spike-outline" label={(await read($, outline)) ? 'Hide the Client outline' : 'Outline the Client'} onPress={() => update($, outline, (now) => !now)} />
          <Button key="spike-band-toggle" label={(await read($, band)) ? 'Hide the band test' : 'Show the band test'} onPress={() => update($, band, (now) => !now)} />
        </Box>
        <Text bold>What reached the mod (newest first)</Text>
        {lines.length ? lines.map((l, i) => <Text key={`log-${i}`}>{l}</Text>) : <Text dimColor>Nothing yet.</Text>}
        <Button key="spike-clear" label="Clear" onPress={() => update($, log, () => [])} />
      </Box>
    )
  })
}
