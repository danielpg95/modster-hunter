/**
 * Where all game randomness comes from (decision 0003): a number in [0, 1),
 * like Math.random. `register.ts` passes Math.random; tests pass a script.
 */
export type RandomSource = () => number
