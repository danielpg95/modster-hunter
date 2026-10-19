import { formatIssue, type ContentRegistry } from '../../../../hooks/content'

/**
 * What `check` prints for a loaded registry (decision 0025): every issue,
 * formatted as the mod logs it, then one summary line. `errors` sets the exit
 * code.
 */
export function checkReport(registry: ContentRegistry): { lines: string[]; errors: number } {
  const errors = registry.issues.filter((issue) => issue.severity === 'error').length
  const warnings = registry.issues.length - errors
  const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`
  const summary = [
    `${count(registry.biomes.size, 'biome')}, ${count(registry.modsters.size, 'Modster')} and ${count(registry.catchers.size, 'catcher')} load`,
    `${count(errors, 'error')}, ${count(warnings, 'warning')}`,
  ].join('; ')
  return { lines: [...registry.issues.map(formatIssue), summary], errors }
}
