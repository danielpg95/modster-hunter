import { CONTENT } from '../constants'
import type { UserSettings } from './types'
import { validateSettings } from './validate-settings'

export interface ToggleChange {
  kind: 'biome' | 'modster'
  id: string
  /** True turns it off (adds the id), false turns it back on */
  off: boolean
}

/** The new `settings.json` text, or why nothing may be written. */
export type TogglePlan = { ok: true; text: string } | { ok: false; problem: string }

/**
 * Turns a biome or Modster off or on in the user's `settings.json` (decision
 * 0032 points 2–3). `current` is the file's text, undefined when there's none.
 * A file that isn't valid is never overwritten, and the result must pass
 * `validateSettings` before it's returned.
 */
export function toggleDisabled(current: string | undefined, change: ToggleChange, file: string): TogglePlan {
  const fixFirst = { ok: false, problem: `fix ${file} first (see /modsters → 4: Settings)` } as const
  let settings: UserSettings = { schemaVersion: CONTENT.schemaVersion }
  if (current !== undefined) {
    let value: unknown
    try {
      value = JSON.parse(current)
    } catch {
      return fixFirst
    }
    const valid = validateSettings(value, { file })
    if (!valid.ok) return fixFirst
    settings = valid.value
  }

  const key = change.kind === 'biome' ? 'disabledBiomes' : 'disabledModsters'
  const ids = (settings[key] ?? []).filter((id) => id !== change.id)
  if (change.off) ids.push(change.id)
  const next: UserSettings = { ...settings, [key]: ids }
  // A list left empty is removed (0032 point 2)
  if (ids.length === 0) delete next[key]

  const result = validateSettings(next, { file })
  if (!result.ok) return { ok: false, problem: `can't turn off "${change.id}": ${result.issues[0]?.problem ?? 'not a valid id'}` }
  return { ok: true, text: `${JSON.stringify(ordered(result.value), null, 2)}\n` }
}

/** The keys in CONTENT_FORMAT.md's order, so the file reads the same after every change. */
function ordered(settings: UserSettings): UserSettings {
  return {
    schemaVersion: settings.schemaVersion,
    ...(settings.disabledBiomes ? { disabledBiomes: settings.disabledBiomes } : {}),
    ...(settings.disabledModsters ? { disabledModsters: settings.disabledModsters } : {}),
  }
}
