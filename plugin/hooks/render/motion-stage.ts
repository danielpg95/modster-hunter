import { MOTION } from '../constants'

// Where the desktop encounter's motion stands (decisions 0051 and 0053). A redraw that changes an image Svg's
// source blinks and one that keeps it restarts its animation, so each motion is one source played
// whole; this says which one a redraw draws at `now`.

export type MotionStage = 'arrive' | 'up' | 'leave' | 'gone'

export interface MotionTimes {
  /** When the Modster appeared; undefined when it was already up before this load */
  appearedAt?: number
  /** When the departure starts: the result card, after a catch's animation */
  departAt?: number
  /** The departure is a catch's: the catcher fades, the Modster doesn't vanish */
  caught?: boolean
}

/** Rounded to the millisecond, so 0.4 + 0.45 is 0.85 */
function ms(seconds: number): number {
  return Math.round(seconds * 1000) / 1000
}

/** Seconds, as the arrival's parts start (0051 point 2) */
export const ARRIVAL = (() => {
  const slideAt = MOTION.flashS
  const silhouetteAt = ms(slideAt + MOTION.slideS)
  const spriteAt = ms(silhouetteAt + MOTION.fadeS + MOTION.silhouetteHoldS)
  const tagAt = ms(spriteAt + MOTION.fadeS)
  return { slideAt, silhouetteAt, spriteAt, tagAt, endS: ms(tagAt + MOTION.fadeS) }
})()

/**
 * Seconds, as the departure's slide back starts and as it ends (0053): a catch's catcher fades,
 * then the slide; any other departure is the arrival reversed (the sprite turns into its silhouette, which
 * holds, then vanishes), then the slide.
 */
export function departure(caught: boolean): { slideAt: number; endS: number } {
  const slideAt = caught ? MOTION.fadeS : ms(MOTION.fadeS * 2 + MOTION.silhouetteHoldS)
  return { slideAt, endS: ms(slideAt + MOTION.slideS) }
}

/** The buttons show once the slide has uncovered their backdrop (0051 point 3) */
export const BUTTONS_AFTER_MS = Math.round(ARRIVAL.silhouetteAt * 1000)

export function motionStage({ appearedAt, departAt, caught = false }: MotionTimes, now: number): MotionStage {
  if (departAt !== undefined && now >= departAt) return now - departAt < departure(caught).endS * 1000 ? 'leave' : 'gone'
  if (appearedAt !== undefined && now - appearedAt < ARRIVAL.endS * 1000) return 'arrive'
  return 'up'
}
