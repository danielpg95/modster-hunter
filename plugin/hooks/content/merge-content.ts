import { fieldPath } from './fields'
import type { ContentRegistry, LoadedBiome, LoadedModster } from './load-content'
import { resolveReferences } from './load-content'
import type { ContentIssue, UserSettings } from './types'

/** The merged content, plus what the pane needs to turn items on and off (decision 0032). */
export interface MergedContent extends ContentRegistry {
  /** Loaded but turned off in `settings.json`: kept aside for the pane, never played (0032 point 5) */
  off: { biomes: Map<string, LoadedBiome>; modsters: Map<string, LoadedModster> }
  /** Ids that loaded from the user folder, on or off; the pane offers delete only for these (0032 point 7) */
  userIds: { biomes: Set<string>; modsters: Set<string> }
}

export interface ContentSources {
  /** Absent when `includeBuiltins` is off (decision 0007 point 5) */
  builtIn?: ContentRegistry
  user: ContentRegistry
  settings?: UserSettings
  /** The settings file's name as issues show it */
  settingsFile: string
}

/**
 * Merges built-in and user content (decision 0007): a user biome or Modster
 * with a built-in's id replaces it whole, except that a Modster keeps the
 * built-in's dex number (decision 0017); ids in `disabledBiomes` and
 * `disabledModsters` are set aside in `off` (0032); then biome entries are
 * checked against the Modsters left. An entry naming a Modster that's off is
 * dropped quietly (0032 point 6). A user file that failed to load replaces nothing.
 */
export function mergeContent(sources: ContentSources): MergedContent {
  const { builtIn, user, settings, settingsFile } = sources
  const issues: ContentIssue[] = [...(builtIn?.issues ?? []), ...user.issues]

  const modsters = new Map<string, LoadedModster>(builtIn?.modsters ?? [])
  for (const [id, loaded] of user.modsters) modsters.set(id, keepDexNumber(loaded, modsters.get(id)))
  const biomes = new Map<string, LoadedBiome>([...(builtIn?.biomes ?? []), ...user.biomes])

  const offModsters = disable(modsters, settings?.disabledModsters, 'disabledModsters', 'a Modster', settingsFile, issues)
  const offBiomes = disable(biomes, settings?.disabledBiomes, 'disabledBiomes', 'a biome', settingsFile, issues)
  for (const [id, loaded] of biomes) biomes.set(id, withoutModsters(loaded, offModsters))
  for (const [id, loaded] of offBiomes) offBiomes.set(id, withoutModsters(loaded, offModsters))

  return {
    ...resolveReferences({ biomes, modsters, issues }),
    off: { biomes: offBiomes, modsters: offModsters },
    userIds: { biomes: new Set(user.biomes.keys()), modsters: new Set(user.modsters.keys()) },
  }
}

/** The biome without its entries for Modsters that are off; unchanged when it has none. */
function withoutModsters(loaded: LoadedBiome, off: ReadonlyMap<string, unknown>): LoadedBiome {
  if (!loaded.biome.modsters.some((entry) => off.has(entry.id))) return loaded
  return { ...loaded, biome: { ...loaded.biome, modsters: loaded.biome.modsters.filter((entry) => !off.has(entry.id)) } }
}

/** A user Modster that replaces a built-in keeps the built-in's dex number (decision 0017 point 3). */
function keepDexNumber(loaded: LoadedModster, replaced: LoadedModster | undefined): LoadedModster {
  const number = replaced?.modster.dex?.number
  if (number === undefined) return loaded
  return { ...loaded, modster: { ...loaded.modster, dex: { ...loaded.modster.dex, number } } }
}

/** Moves the ids out of `loaded` and returns them. */
function disable<T>(
  loaded: Map<string, T>,
  ids: readonly string[] | undefined,
  key: string,
  kind: string,
  file: string,
  issues: ContentIssue[],
): Map<string, T> {
  const off = new Map<string, T>()
  ids?.forEach((id, index) => {
    const item = loaded.get(id)
    // A warning, not an error: nothing to skip, but likely a typo
    if (item === undefined) {
      issues.push({ severity: 'warning', file, field: fieldPath(key, index), problem: `names ${kind} that isn't loaded: "${id}"` })
      return
    }
    loaded.delete(id)
    off.set(id, item)
  })
  return off
}
