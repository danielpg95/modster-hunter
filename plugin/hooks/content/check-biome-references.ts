import { fieldPath } from './fields'
import { IssueList } from './issue-list'
import type { Biome, Validation } from './types'

/**
 * Runs after merging (decision 0007): drops biome entries whose Modster
 * doesn't exist, an error for that entry only (CONTENT_FORMAT.md). The biome
 * itself is dropped only when no entries are left.
 */
export function checkBiomeReferences(biome: Biome, modsterIds: ReadonlySet<string>, file: string): Validation<Biome> {
  const issues = new IssueList(file)
  const modsters = biome.modsters.filter((entry, index) => {
    if (modsterIds.has(entry.id)) return true
    issues.error(fieldPath(fieldPath('modsters', index), 'id'), `names a Modster that doesn't exist: "${entry.id}"`)
    return false
  })
  if (modsters.length === 0) return issues.fail('modsters', 'has no Modsters left that exist')
  return { ok: true, value: { ...biome, modsters }, issues: issues.items }
}
