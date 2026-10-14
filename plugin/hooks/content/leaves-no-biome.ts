import type { ContentRegistry } from './load-content'
import type { ToggleChange } from './toggle-disabled'

/**
 * Whether turning an item off would leave no biome to play (decision 0032
 * point 8): the last biome, or a Modster every biome left depends on alone.
 * Turning on never does, and with no biome already there's nothing to keep.
 */
export function leavesNoBiome(content: Pick<ContentRegistry, 'biomes'>, change: ToggleChange): boolean {
  if (!change.off || content.biomes.size === 0) return false
  for (const { biome } of content.biomes.values()) {
    const survives = change.kind === 'biome' ? biome.id !== change.id : biome.modsters.some((entry) => entry.id !== change.id)
    if (survives) return false
  }
  return true
}
