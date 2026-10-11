// The encounter pane's hint on how to move the keys (decision 0024 point 4).
// A pane Button's hotkey fires only while the pane holds the keys, and inline
// the engine's close mark can't be clicked, so the pane says what to press.

export interface PaneHintInput {
  isFocused: boolean
  placement: 'dock' | 'inline'
  /** Columns the header has left after the biome name and the working note */
  columns: number
}

const BACK = ' · Esc: back to prompt'
const CLOSE = ' · ctrl+x x: close'
const PLAY = ' · ctrl+x tab to play'

/** The longest hint that fits, or none: the hint is cut before the header's other parts. */
export function paneHint(input: PaneHintInput): string | undefined {
  const choices = !input.isFocused ? [PLAY] : input.placement === 'inline' ? [BACK + CLOSE, BACK] : [BACK]
  return choices.find((hint) => hint.length <= input.columns)
}
