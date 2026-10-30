import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// P5-58 spike, not part of Modster Hunter: `/overlay-spike` opens a pane with a
// scene Svg and a Client laid over it that draws nothing. Clicks and keys the
// Client hears are listed below the scene, with which target they landed on.

const PANE_ID = 'overlay-spike'
const log = atom({ plugin: 'modster-overlay-spike', key: 'log' } as const, [])
const band = atom({ plugin: 'modster-overlay-spike', key: 'band' } as const, false)

// The scene, in CSS pixels: a strip, a Modster in the middle and a Run tag at the right
const W = 480
const H = 120
const MODSTER = { x: 210, y: 40, w: 60, h: 70 }
const RUN = { x: 404, y: 88, w: 64, h: 22 }

const SCENE =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  `<rect width="${W}" height="${H}" fill="#2e4a3a"/><rect y="96" width="${W}" height="24" fill="#4e6b3a"/>` +
  `<circle cx="40" cy="20" r="3" fill="#9ccc65"><animate attributeName="cy" values="10;100" dur="3s" repeatCount="indefinite"/></circle>` +
  `<rect x="${MODSTER.x}" y="${MODSTER.y}" width="${MODSTER.w}" height="${MODSTER.h}" rx="18" fill="#7cb342"/>` +
  `<circle cx="${MODSTER.x + 20}" cy="${MODSTER.y + 28}" r="5" fill="#111"/><circle cx="${MODSTER.x + 40}" cy="${MODSTER.y + 28}" r="5" fill="#111"/>` +
  `<rect x="10" y="${RUN.y}" width="150" height="${RUN.h}" rx="11" fill="#000" fill-opacity="0.45"/>` +
  `<text x="22" y="${RUN.y + 15}" font-size="12" font-family="system-ui" fill="#fff">Sproutling ● common</text>` +
  `<rect x="${RUN.x}" y="${RUN.y}" width="${RUN.w}" height="${RUN.h}" rx="11" fill="#000" fill-opacity="0.45"/>` +
  `<text x="${RUN.x + 20}" y="${RUN.y + 15}" font-size="12" font-family="system-ui" fill="#fff">Run</text></svg>`

interface Probe {
  site: string
  kind: 'down' | 'key'
  x?: number
  y?: number
  columns: number
  rows: number
  key?: string
  button?: string
}

function describe(p: Probe): string {
  if (p.kind === 'key') return `${p.site}: key "${p.key}" (region ${p.columns}×${p.rows} cells)`
  const cw = W / Math.max(1, p.columns)
  const ch = H / Math.max(1, p.rows)
  const px = ((p.x ?? 0) + 0.5) * cw
  const py = ((p.y ?? 0) + 0.5) * ch
  const inside = (r: { x: number; y: number; w: number; h: number }) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h
  const target = inside(MODSTER) ? 'the Modster' : inside(RUN) ? 'the Run tag' : 'the scene'
  return `${p.site}: click at cell ${p.x},${p.y} of ${p.columns}×${p.rows} (${cw.toFixed(1)}×${ch.toFixed(1)} px per cell) → ~${Math.round(px)},${Math.round(py)} px → ${target}`
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'overlay-spike', description: 'P5-58: test a Client laid over a scene in the Desktop Code tab', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'overlay-spike' }, async ($) => {
    const opened = await $.ui.open({ id: PANE_ID, title: 'P5-58 overlay spike', focus: true, closeOnEscape: true })
    return opened.isPlaced ? {} : { text: 'overlay-spike: the pane is waiting for room' }
  })

  on('ui.message', async ($, e, next) => {
    const line = describe(e.data as unknown as Probe)
    await update($, log, (now) => [line, ...now].slice(0, 8))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || !(await read($, band))) return next(e)
    const { Box, Svg, Client } = $.ui.resolve(e)
    return (
      <Box key="spike-band" position="relative" width={W} height={H}>
        <Svg source={SCENE} alt="Band scene" width={W} height={H} />
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <Client key="spike-band-overlay" module="./overlay-probe.tsx" props="band" width="100%" height="100%" />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE_ID) return next(e)
    if (e.surface !== 'desktop') {
      const { Text } = $.ui.resolve(e)
      return <Text>Open /overlay-spike in the Desktop app's Code tab.</Text>
    }
    const { Box, Text, Button, Svg, Client } = $.ui.resolve(e)
    const lines = await read($, log)
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>1. A Client laid over the scene</Text>
        <Text dimColor>Is the scene fully visible, with the leaf falling? Click the Modster, the scene, and the Run tag.</Text>
        <Box key="spike-pane" position="relative" width={W} height={H}>
          <Svg source={SCENE} alt="Pane scene" width={W} height={H} />
          <Box position="absolute" top={0} left={0} right={0} bottom={0}>
            <Client key="spike-pane-overlay" module="./overlay-probe.tsx" props="pane" width="100%" height="100%" />
          </Box>
        </Box>
        <Text bold>2. Keys</Text>
        <Text dimColor>After a click on the scene, press 1 and 2. Then Escape, ctrl+x tab, and press 1 and 2 again.</Text>
        <Text bold>3. The band</Text>
        <Button key="spike-band-toggle" label={(await read($, band)) ? 'Hide the band test' : 'Show the band test'} onPress={() => update($, band, (now) => !now)} />
        <Text bold>What reached the mod (newest first)</Text>
        {lines.length ? lines.map((l, i) => <Text key={`log-${i}`}>{l}</Text>) : <Text dimColor>Nothing yet.</Text>}
        <Button key="spike-clear" label="Clear" onPress={() => update($, log, () => [])} />
      </Box>
    )
  })
}
