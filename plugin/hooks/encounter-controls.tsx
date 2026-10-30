import type { ClientModule } from 'claude-code'

// The desktop encounter's controls (decision 0051 point 3): a surface module laid over the scene.
// It draws Throw, Run and the throws left in the backdrop the slide uncovers, on its own timer, and
// hears a click on the Modster. A Client redraws only its own region, so showing the buttons never
// redraws the scene's Svg (which would blink or restart it). It posts `{ action }` to the hooks
// module; it has no `$`, and imports nothing but types, so it stays self-contained.

export interface ControlsProps {
  /** The encounter's id while one is up, else null */
  encounter: number | null
  /** How long after first seeing this encounter the buttons show, in ms */
  showAfterMs: number
  /** Throw and Run take presses: the Modster is appearing or waiting */
  buttons: boolean
  /** The throws left, shown under the buttons; null hides it */
  triesLeft: number | null
  /** The backdrop's width in columns */
  panelColumns: number
  /** The scene's height in rows */
  rows: number
  /** The cells a click on the Modster lands in, right and bottom exclusive; null while it can't be thrown at */
  hit: { left: number; top: number; right: number; bottom: number } | null
}

export type ControlsAction = 'throw' | 'run'

/** The surface's frame clock moves in ticks of this many ms */
const TICK_MS = 50

interface Seen {
  encounter: number
  tick: number
  showAfterMs: number
}

// Per instance (the same surface object on every call): the latest props, the ticks so far, and when this encounter was first seen
const instances = new WeakMap<object, { props: ControlsProps; tick: number; seen?: Seen }>()

const EncounterControls: ClientModule<ControlsProps & Record<string, never>, { shown: number | null }> = (props, surface) => {
  const { Box, Text, Button } = surface.elements
  const site = instances.get(surface) ?? { props, tick: 0 }
  site.props = props
  if (props.encounter !== null && site.seen?.encounter !== props.encounter) site.seen = { encounter: props.encounter, tick: site.tick, showAfterMs: props.showAfterMs }
  instances.set(surface, site)
  if (surface.state === undefined) {
    surface.setState({ shown: null })
    surface.every(TICK_MS, () => {
      site.tick++
      const seen = site.seen
      if (!seen || site.props.encounter !== seen.encounter || surface.state?.shown === seen.encounter) return
      if ((site.tick - seen.tick) * TICK_MS >= seen.showAfterMs) surface.setState({ shown: seen.encounter })
    })
  }
  const shown = props.encounter !== null && surface.state?.shown === props.encounter
  const act = (action: ControlsAction) => () => surface.post({ action })
  surface.onPointer((p) => {
    const hit = site.props.hit
    if (p.type !== 'down' || (p.button !== undefined && p.button !== 'left') || !hit || !shown) return
    if (p.x >= hit.left && p.x < hit.right && p.y >= hit.top && p.y < hit.bottom) act('throw')()
  })
  // Blank rows give the region its height: an empty Box collapses to its border on desktop
  const blank = (n: number, prefix: string) => Array.from({ length: Math.max(1, n) }, (_, i) => <Text key={`${prefix}${i}`}>{' '}</Text>)
  const gap = props.rows >= 5 ? 1 : 0
  const panel =
    shown && (props.buttons || props.triesLeft !== null) ? (
      <Box flexDirection="column" gap={gap} paddingLeft={1}>
        {props.buttons ? <Button key="throw" label="Throw" hotkey="1" plain onPress={act('throw')} /> : null}
        {props.buttons ? <Button key="run" label="Run" hotkey="2" plain onPress={act('run')} /> : null}
        {props.triesLeft !== null && props.rows >= 3 ? (
          <Text key="tries" dimColor>
            {`${props.triesLeft} left`}
          </Text>
        ) : null}
      </Box>
    ) : (
      blank(props.rows, 'p')
    )
  return (
    <Box flexDirection="row" width="100%">
      <Box flexDirection="column" width={props.panelColumns}>
        {panel}
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {blank(props.rows, 'r')}
      </Box>
    </Box>
  )
}

export default EncounterControls
