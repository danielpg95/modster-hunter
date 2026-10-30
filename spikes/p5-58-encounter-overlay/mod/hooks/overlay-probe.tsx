import type { ClientModule } from 'claude-code'

// P5-58 spike: a surface module laid over the scene. It posts every click (with the cell it landed in) and
// every key to the mod, and draws Throw and Run itself once the slide has uncovered their panel: the
// Client redraws only its own region, so the scene's Svg isn't redrawn and nothing blinks or restarts.

interface Props {
  site: string
  outline: boolean
  rows: number
  /** The encounter's start, while one is up */
  encounter: number | null
  /** When the buttons show, in ms after the encounter starts */
  buttonsAfterMs: number
  /** The panel's width in columns */
  panelColumns: number
  tries: number
}

const TICK_MS = 50
// Per site: the latest props and the tick an encounter was first seen, read by the timer
const sites = new Map<string, { props: Props; seen?: { encounter: number; tick: number } }>()
let tick = 0

const OverlayProbe: ClientModule<Props & Record<string, never>, { shown: number | null }> = (props, surface) => {
  const { Box, Text, Button } = surface.elements
  const site = sites.get(props.site) ?? { props }
  site.props = props
  if (props.encounter !== null && site.seen?.encounter !== props.encounter) site.seen = { encounter: props.encounter, tick }
  sites.set(props.site, site)
  if (surface.state === undefined) {
    surface.setState({ shown: null })
    surface.every(TICK_MS, () => {
      tick++
      const now = sites.get(props.site)
      const seen = now?.seen
      if (!now || !seen || now.props.encounter !== seen.encounter) return
      if ((tick - seen.tick) * TICK_MS >= now.props.buttonsAfterMs && surface.state?.shown !== seen.encounter) surface.setState({ shown: seen.encounter })
    })
  }
  surface.onPointer((p) => {
    if (p.type !== 'down') return
    surface.post({ site: props.site, kind: 'down', x: p.fine?.x ?? p.x, y: p.fine?.y ?? p.y, columns: surface.columns, rows: surface.rows })
  })
  surface.onKey((k) => {
    surface.post({ site: props.site, kind: 'key', key: k.key, columns: surface.columns, rows: surface.rows })
  })
  const blank = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => <Text key={`${prefix}${i}`}>{' '}</Text>)
  const shown = props.encounter !== null && surface.state?.shown === props.encounter
  // Blank rows give the region its height (an empty Box collapses on desktop); the outline shows where it is
  return (
    <Box flexDirection="row" width="100%" {...(props.outline ? { borderStyle: 'single', borderColor: '#ff00ff' } : {})}>
      <Box flexDirection="column" width={props.panelColumns}>
        {shown ? (
          <Box flexDirection="column" gap={1} paddingLeft={1}>
            <Button key="throw" label="Throw" hotkey="1" plain onPress={() => surface.post({ site: props.site, kind: 'press', button: 'throw' })} />
            <Button key="run" label="Run" hotkey="2" plain onPress={() => surface.post({ site: props.site, kind: 'press', button: 'run' })} />
            <Text dimColor>{`${props.tries} left`}</Text>
          </Box>
        ) : (
          blank(props.rows, 'p')
        )}
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {blank(props.rows, 'r')}
      </Box>
    </Box>
  )
}

export default OverlayProbe
