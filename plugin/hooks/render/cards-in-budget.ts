/**
 * Which cards on a page keep their art (0054 point 6): the selected card first,
 * then the rest in order, each only while the page's total stays within
 * `budget` characters. A card that doesn't fit shows `?`, the others keep theirs.
 * `sizes` holds each card's Svg length, undefined for a card with no art.
 */
export function cardsInBudget(sizes: readonly (number | undefined)[], selected: number, budget: number): boolean[] {
  const kept = sizes.map(() => false)
  let used = 0
  const order = [selected, ...sizes.keys()].filter((at, i, all) => at >= 0 && at < sizes.length && all.indexOf(at) === i)
  for (const at of order) {
    const size = sizes[at]
    if (size === undefined || used + size > budget) continue
    kept[at] = true
    used += size
  }
  return kept
}
