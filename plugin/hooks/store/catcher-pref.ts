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

/** The catcher to play: the picked one when it loaded, else the default (0035 point 10), else none. */
export function catcherInUse<T>(catchers: ReadonlyMap<string, T>, pickedId: string | undefined, defaultId: string): T | undefined {
  return (pickedId === undefined ? undefined : catchers.get(pickedId)) ?? catchers.get(defaultId)
}
