import type { ClientModule, RenderElement } from 'claude-code'

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
  /** The throws left, shown as pips under the buttons; null hides them */
  triesLeft: number | null
  /** The encounter's throws in all: the pips' count */
  maxTries: number
  /** The backdrop's width in columns */
  panelColumns: number
  /** The buttons' fills (MOTION.buttonFills) */
  fills: { throw: string; run: string }
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
  // Throw and Run as filled buttons of one width, a row apart so a click meant for Throw never lands on Run,
  // the throws left as pips. A Button in a Client draws as plain text on desktop, so each sits in a filled Box.
  // The stack sits a row below centre (P5-59); short of room the pips go first (the status line has them)
  const place = panelPlace(props.rows, props.buttons, props.triesLeft !== null)
  const pill = (key: string, fill: string, button: RenderElement) => (
    <Box key={key} width={Math.max(1, props.panelColumns - 2)} justifyContent="center" backgroundColor={fill}>
      {button}
    </Box>
  )
  const panel =
    shown && (props.buttons || props.triesLeft !== null) ? (
      <Box flexDirection="column" height={props.rows} paddingTop={place.top} alignItems="center">
        {props.buttons ? pill('throw-fill', props.fills.throw, <Button key="throw" label="Throw" hotkey="1" variant="primary" onPress={act('throw')} />) : null}
        {props.buttons ? (
          <Box key="run-gap" marginTop={1}>
            {pill('run-fill', props.fills.run, <Button key="run" label="Run" hotkey="2" variant="secondary" onPress={act('run')} />)}
          </Box>
        ) : null}
        {place.pips && props.triesLeft !== null ? (
          <Text key="tries" dimColor>
            {pips(props.triesLeft, props.maxTries)}
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

/**
 * Where the panel's stack starts, in rows from the top, and whether the pips fit: a row below centre
 * (P5-59), never past the panel's bottom. The pips give way before the stack moves less; the gap
 * between Throw and Run never does.
 */
export function panelPlace(rows: number, buttons: boolean, pipsWanted: boolean): { top: number; pips: boolean } {
  const height = (withPips: boolean) => (buttons ? 3 : 0) + (withPips ? 1 : 0)
  const at = (stack: number) => Math.floor((rows - stack) / 2) + 1
  const pips = pipsWanted && at(height(true)) + height(true) <= rows
  const stack = height(pips)
  return { top: Math.max(0, Math.min(at(stack), rows - stack)), pips }
}

/** `● ● ○`: a filled pip per throw left, an empty one per throw used. */
export function pips(left: number, max: number): string {
  const all = Math.max(max, left, 0)
  return Array.from({ length: all }, (_, i) => (i < left ? '●' : '○')).join(' ')
}

export default EncounterControls
