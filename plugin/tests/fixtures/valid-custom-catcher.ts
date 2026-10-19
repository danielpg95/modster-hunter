import { validCatcher } from './valid-catcher'

/** A `custom` catcher giving all six beats, each with its `modster`. */
export function validCustomCatcher(): Record<string, unknown> {
  return {
    ...validCatcher(),
    style: 'custom',
    beats: {
      throw: { frames: [0], path: 'drop', modster: 'visible' },
      take: { frames: [1], place: 'behind', modster: 'dim' },
      settle: { modster: 'dim' },
      rock: { frames: [0, 1], place: 'stretch', modster: 'shake' },
      caught: { modster: 'shrink' },
      broken: { modster: 'hop-out' },
    },
    rimIndex: 1,
  }
}
