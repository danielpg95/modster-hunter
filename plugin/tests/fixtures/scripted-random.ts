import type { RandomSource } from '../../hooks/game'

/**
 * A random source that returns `values` in order and throws when they run
 * out, so a test fails loudly if the code draws more numbers than expected.
 */
export function scriptedRandom(...values: number[]): RandomSource & { remaining: () => number } {
  const queue = [...values]
  const next = (): number => {
    const value = queue.shift()
    if (value === undefined) throw new Error('scriptedRandom: no numbers left')
    return value
  }
  return Object.assign(next, { remaining: () => queue.length })
}
