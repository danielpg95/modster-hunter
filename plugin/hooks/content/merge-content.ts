import { fieldPath } from './fields'
import type { ContentRegistry, LoadedBiome, LoadedModster } from './load-content'
import { resolveReferences } from './load-content'
import type { ContentIssue, UserSettings } from './types'

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
 * `disabledModsters` are removed; then biome entries are checked against the
 * Modsters left. A user file that failed to load replaces nothing.
 */
export function mergeContent(sources: ContentSources): ContentRegistry {
  const { builtIn, user, settings, settingsFile } = sources
  const issues: ContentIssue[] = [...(builtIn?.issues ?? []), ...user.issues]

  const modsters = new Map<string, LoadedModster>(builtIn?.modsters ?? [])
  for (const [id, loaded] of user.modsters) modsters.set(id, keepDexNumber(loaded, modsters.get(id)))
  const biomes = new Map<string, LoadedBiome>([...(builtIn?.biomes ?? []), ...user.biomes])

  disable(modsters, settings?.disabledModsters, 'disabledModsters', 'a Modster', settingsFile, issues)
  disable(biomes, settings?.disabledBiomes, 'disabledBiomes', 'a biome', settingsFile, issues)

  return resolveReferences({ biomes, modsters, issues })
}

/** A user Modster that replaces a built-in keeps the built-in's dex number (decision 0017 point 3). */
function keepDexNumber(loaded: LoadedModster, replaced: LoadedModster | undefined): LoadedModster {
  const number = replaced?.modster.dex?.number
  if (number === undefined) return loaded
  return { ...loaded, modster: { ...loaded.modster, dex: { ...loaded.modster.dex, number } } }
}

function disable(
  loaded: Map<string, unknown>,
  ids: readonly string[] | undefined,
  key: string,
  kind: string,
  file: string,
  issues: ContentIssue[],
): void {
  ids?.forEach((id, index) => {
    // A warning, not an error: nothing to skip, but likely a typo
    if (!loaded.delete(id)) {
      issues.push({ severity: 'warning', file, field: fieldPath(key, index), problem: `names ${kind} that isn't loaded: "${id}"` })
    }
  })
}
