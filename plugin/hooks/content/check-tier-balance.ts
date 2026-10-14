import { TIERS } from '../constants'
import { IssueList } from './issue-list'
import type { Biome, ContentIssue, Modster, Rarity } from './types'

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`

/**
 * Decision 0030 point 6: a warning for each tier whose Modsters each appear
 * less often than the Modsters of a rarer tier in the same biome, e.g. 100
 * commons sharing 76% next to a lone uncommon. Entries whose Modster is
 * missing are skipped; `checkBiomeReferences` reports those.
 */
export function checkTierBalance(biome: Biome, modsters: ReadonlyMap<string, Modster>, file: string): ContentIssue[] {
  const counts = new Map<Rarity, number>()
  for (const entry of biome.modsters) {
    const modster = modsters.get(entry.id)
    if (!modster) continue
    const tier = entry.rarity ?? modster.rarity
    counts.set(tier, (counts.get(tier) ?? 0) + 1)
  }
  const present = TIERS.filter((row) => counts.has(row.tier))
  const total = present.reduce((sum, row) => sum + row.weight, 0)
  // Each Modster's chance to appear, by tier, most common tier first
  const each = present.map((row) => ({ tier: row.tier, chance: row.weight / total / (counts.get(row.tier) ?? 1) }))

  const issues = new IssueList(file)
  each.forEach((tier, index) => {
    const rarer = each.slice(index + 1).filter((other) => other.chance > tier.chance)
    if (rarer.length === 0) return
    const most = rarer.reduce((best, other) => (other.chance > best.chance ? other : best))
    issues.warning(
      'modsters',
      `each ${tier.tier} Modster appears ${percent(tier.chance)} of the time, less than each ${most.tier} one (${percent(most.chance)}); move some to a rarer tier or out of this biome`,
    )
  })
  return issues.items
}
