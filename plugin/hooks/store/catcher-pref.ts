/** `prefs:catcher` (decision 0035 point 9): the catcher the player picked in `/modsters`. */
export interface CatcherPref {
  v: 1
  id: string
}

export const CATCHER_KEY = 'prefs:catcher'

export const catcherPref = (id: string): CatcherPref => ({ v: 1, id })

/** The picked catcher's id, or undefined when none is stored or the value is unreadable. */
export function readCatcherId(raw: unknown): string | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const value = raw as Partial<CatcherPref>
  // v1 is the only version so far; a future v2 migrates here
  return value.v === 1 && typeof value.id === 'string' ? value.id : undefined
}

/**
 * The catcher to play: the picked one when it loaded and `playable` allows it, else the
 * default (0035 point 10), else none. A catcher with desktop art only isn't playable
 * until desktop throws draw it, so the default plays instead (0045 point 10).
 */
export function catcherInUse<T>(catchers: ReadonlyMap<string, T>, pickedId: string | undefined, defaultId: string, playable: (catcher: T) => boolean = () => true): T | undefined {
  const picked = pickedId === undefined ? undefined : catchers.get(pickedId)
  if (picked !== undefined && playable(picked)) return picked
  const fallback = catchers.get(defaultId)
  return fallback !== undefined && playable(fallback) ? fallback : undefined
}
