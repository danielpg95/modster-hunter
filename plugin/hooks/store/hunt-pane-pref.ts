import type { PaneCloseOrigin } from 'claude-code'

/** `prefs:huntPane` (decision 0019): whether the encounter pane reopens at session start. */
export interface HuntPanePref {
  v: 1
  open: boolean
}

export const HUNT_PANE_KEY = 'prefs:huntPane'

export const huntPanePref = (open: boolean): HuntPanePref => ({ v: 1, open })

/**
 * What a close of the pane stores: only a close by hand (`person`) stops the
 * reopening; a close by the mod (`plugin`) or an unload changes nothing.
 */
export function prefAfterClose(origin: PaneCloseOrigin['kind']): HuntPanePref | undefined {
  return origin === 'person' ? huntPanePref(false) : undefined
}

/** Whether the stored value asks to reopen the pane; anything unreadable counts as no. */
export function readHuntPaneOpen(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false
  const value = raw as Partial<HuntPanePref>
  // v1 is the only version so far; a future v2 migrates here
  return value.v === 1 && value.open === true
}
