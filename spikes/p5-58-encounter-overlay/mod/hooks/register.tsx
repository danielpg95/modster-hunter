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
// The departure: a cue where the Modster stood (a gold burst when caught, a grey puff when it fled), then the slide back
const CUE_S = 0.4
const DEPARTURE_S = CUE_S + SLIDE_S
const COLUMN_PX = 8.8
const ROW_PX = 20
const CELLS = { columns: Math.round(W / COLUMN_PX), rows: Math.ceil(H / ROW_PX) }
// The Modster stands in the middle of the part the scene shows once slid
const MODSTER = { x: SLIDE + (W - SLIDE) / 2 - 30, y: 40, w: 60, h: 70 }

/** Seconds for SMIL, rounded so sums like 0.4 + 0.45 read 0.85s */
const sec = (n: number): string => `${+n.toFixed(3)}s`

/** Fades from 0 to 1 at `at`, held after; nothing outside the arrival */
function fadeIn(at: number, playing: boolean): string {
  return playing ? `<animate attributeName="opacity" from="0" to="1" begin="${sec(at)}" dur="${sec(FADE_S)}" fill="freeze"/>` : ''
}

function modsterShape(x: number, body: string, eyes: string): string {
  return (
    `<rect x="${x}" y="${MODSTER.y}" width="${MODSTER.w}" height="${MODSTER.h}" rx="18" fill="${body}"/>` +
    `<circle cx="${x + 20}" cy="${MODSTER.y + 28}" r="5" fill="${eyes}"/><circle cx="${x + 40}" cy="${MODSTER.y + 28}" r="5" fill="${eyes}"/>`
  )
}

/**
 * Where an encounter's motion stands. A redraw that changes an image Svg's source blinks, and one that keeps
 * it restarts its animation, so the whole arrival is one source with no planned redraw in it; the next redraw
 * after it ends, for whatever reason, swaps in the still scene (0050 point 7).
 */
type Stage = 'idle' | 'arrive' | 'up' | 'leave'

function stageOf(state: Encounter, now: number): Stage {
  const t = (now - state.at) / 1000
  if (state.phase === 'up') return t < ARRIVAL_S ? 'arrive' : 'up'
  if (state.phase === 'leaving') return t < DEPARTURE_S ? 'leave' : 'idle'
  return 'idle'
}

function sceneSvg(stage: Stage, caught: boolean, at: number): string {
  const arrive = stage === 'arrive'
  const slid = stage === 'up' || stage === 'leave'
  const slide =
    arrive || stage === 'leave'
      ? `<animateTransform attributeName="transform" type="translate" from="${arrive ? '0 0' : `${SLIDE} 0`}" to="${arrive ? `${SLIDE} 0` : '0 0'}" dur="${SLIDE_S}s" begin="${sec(arrive ? SLIDE_AT : CUE_S)}" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.8 0.2 1" fill="freeze"/>`
      : ''
  const flash = arrive
    ? `<rect width="${W}" height="${H}" fill="#fff" opacity="0"><animate attributeName="opacity" values="0;0.45;0" dur="${FLASH_S}s" fill="freeze"/></rect>`
    : ''
  const x = MODSTER.x - SLIDE
  // The silhouette fades in after the slide, holds, then gives way to the sprite, and the tag fades in last
  const span = SPRITE_AT + FADE_S - SILHOUETTE_AT
  const silhouette = arrive
    ? `<g opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;${(FADE_S / span).toFixed(3)};${((SPRITE_AT - SILHOUETTE_AT) / span).toFixed(3)};1" begin="${sec(SILHOUETTE_AT)}" dur="${sec(span)}" fill="freeze"/>${modsterShape(x, '#0d0d0d', '#0d0d0d')}</g>`
    : ''
  const modster =
    arrive || stage === 'up'
      ? `${silhouette}<g opacity="${arrive ? 0 : 1}">${fadeIn(SPRITE_AT, arrive)}${modsterShape(x, '#7cb342', '#111')}</g>` +
        `<g opacity="${arrive ? 0 : 1}">${fadeIn(TAG_AT, arrive)}<rect x="10" y="88" width="150" height="22" rx="11" fill="#000" fill-opacity="0.45"/>` +
        `<text x="22" y="103" font-size="12" font-family="system-ui" fill="#fff">Sproutling ● common</text></g>`
      : ''
  // On the way out the Modster and its tag fade under the cue, then the scene slides back
  const cx = x + MODSTER.w / 2
  const cy = MODSTER.y + MODSTER.h / 2
  const cueColor = caught ? '#ffd54f' : '#cfd8dc'
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    const dx = +(Math.cos(a) * 46).toFixed(1)
    const dy = +(Math.sin(a) * 46).toFixed(1)
    return `<circle cx="${cx}" cy="${cy}" r="4" fill="${cueColor}"><animate attributeName="cx" from="${cx}" to="${cx + dx}" dur="${sec(CUE_S)}" fill="freeze"/><animate attributeName="cy" from="${cy}" to="${cy + dy}" dur="${sec(CUE_S)}" fill="freeze"/><animate attributeName="r" from="4" to="0" dur="${sec(CUE_S)}" fill="freeze"/></circle>`
  }).join('')
  const departing =
    stage === 'leave'
      ? `<g opacity="1"><animate attributeName="opacity" from="1" to="0" dur="${sec(CUE_S * 0.6)}" fill="freeze"/>${modsterShape(x, '#7cb342', '#111')}` +
        `<rect x="10" y="88" width="150" height="22" rx="11" fill="#000" fill-opacity="0.45"/><text x="22" y="103" font-size="12" font-family="system-ui" fill="#fff">${caught ? 'Caught Sproutling!' : 'Sproutling fled'}</text></g>` +
        `<circle cx="${cx}" cy="${cy}" r="0" fill="${cueColor}" opacity="0.7"><animate attributeName="r" from="0" to="44" dur="${sec(CUE_S)}" fill="freeze"/><animate attributeName="opacity" from="0.7" to="0" dur="${sec(CUE_S)}" fill="freeze"/></circle>${rays}`
      : ''
  // The buttons' backdrop: a panel at the left edge, there from the arrival's first frame (the buttons show at
  // once, a redraw can't wait for the slide), faded out as the scene slides back on departure
  const PANEL_FADE_S = 0.15
  const panelRect = (anim: string, opacity: number) =>
    `<rect width="${SLIDE}" height="${H}" fill="#1b1b1b" opacity="${opacity}">${anim}</rect>`
  const panel =
    stage === 'arrive'
      ? panelRect(`<animate attributeName="opacity" from="0" to="1" dur="${sec(PANEL_FADE_S)}" fill="freeze"/>`, 0)
      : stage === 'up'
        ? panelRect('', 1)
        : stage === 'leave'
          ? panelRect(`<animate attributeName="opacity" from="1" to="0" begin="${sec(CUE_S)}" dur="${sec(SLIDE_S)}" fill="freeze"/>`, 1)
          : ''
  // Each arrival and departure is a new source, stamped with its encounter's time: the surface reuses an
  // image it has drawn before, with its animation already over, so the same markup twice showed the end first
  const stamp = stage === 'arrive' || stage === 'leave' ? ` data-motion="${stage}/${at}"` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg"${stamp} width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#1b1b1b"/>` +
    `<g transform="translate(${slid ? SLIDE : 0} 0)">${slide}<rect width="${W}" height="${H}" fill="#2e4a3a"/><rect y="96" width="${W}" height="24" fill="#4e6b3a"/>` +
    `<circle cx="40" cy="20" r="3" fill="#9ccc65"><animate attributeName="cy" values="10;100" dur="3s" repeatCount="indefinite"/></circle>` +
    `${modster}${departing}</g>${panel}${flash}</svg>`
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
      <Svg source={sceneSvg(stage, state.caught === true, state.at)} alt={`${site} scene`} width={W} height={H} />
      <Box position="absolute" top={0} left={0}>
        <Client key={`spike-${site}-overlay`} module="./overlay-probe.tsx" props={{ site, outline: show, rows: CELLS.rows }} width={CELLS.columns} height={CELLS.rows} />
      </Box>
      {state.phase === 'up' ? (
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
    const setPhase = async (phase: Encounter['phase'], caught = false) => {
      const at = await $.clock.now()
      await update($, encounter, () => ({ phase, at, ...(caught ? { caught } : {}) }))
      if (phase === 'up') await update($, tries, () => 3)
    }
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>The sliding scene (decision 0050)</Text>
        <Text dimColor>Start: does it flash, then slide right, with Throw and Run in the strip? Click the Modster, the buttons, and press 1 and 2. Redraw mid-encounter: does the slide replay? End: does it slide back?</Text>
        {await scene($, e, 'pane')}
        <Box flexDirection="row" gap={1}>
          {/* Always the same three, so a press never changes the pane's layout (that redraw replayed the arrival) */}
          <Button key="spike-start" label="Start encounter" onPress={() => (state.phase === 'up' ? undefined : setPhase('up'))} />
          <Button key="spike-caught" label="End: caught" onPress={() => (state.phase === 'up' ? setPhase('leaving', true) : undefined)} />
          <Button key="spike-fled" label="End: fled" onPress={() => (state.phase === 'up' ? setPhase('leaving') : undefined)} />
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
