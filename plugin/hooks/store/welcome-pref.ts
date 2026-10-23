/** `prefs:welcomed` (decision 0038 point 9): the welcome toast has been shown to this player. */
export interface WelcomedPref {
  v: 1
}

export const WELCOMED_KEY = 'prefs:welcomed'

export const welcomedPref = (): WelcomedPref => ({ v: 1 })

/** Whether the stored value says the welcome was shown; anything unreadable counts as no. */
export function readWelcomed(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false
  // v1 is the only version so far; a future v2 migrates here
  return (raw as Partial<WelcomedPref>).v === 1
}
