import type { RandomSource } from './random-source'

/**
 * One item, with chance weight ÷ total weight (decision 0007). Undefined when
 * the list is empty or no weight is positive.
 */
export function pickWeighted<T extends { weight: number }>(items: readonly T[], random: RandomSource): T | undefined {
  const total = items.reduce((sum, item) => sum + Math.max(item.weight, 0), 0)
  if (total <= 0) return undefined
  let roll = random() * total
  for (const item of items) {
    if (item.weight <= 0) continue
    roll -= item.weight
    if (roll < 0) return item
  }
  // Only reached when random() returns 1 or rounding leaves a sliver: the last positive item
  return [...items].reverse().find((item) => item.weight > 0)
}
