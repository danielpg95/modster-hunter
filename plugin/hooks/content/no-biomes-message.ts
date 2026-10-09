/**
 * The one message shown when no biome is left to play (decision 0007 point 5):
 * at session start and from /modsters. `userFolder` is how the user's content
 * folder is shown, e.g. `~/.claude/modster-hunter/content/`.
 */
export function noBiomesMessage(includeBuiltins: boolean, userFolder: string): string {
  return includeBuiltins
    ? 'No biomes to play: every biome is disabled or failed to load'
    : `No biomes to play: built-in content is off and no biome in ${userFolder} loaded`
}
