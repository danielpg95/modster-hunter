import { CONTENT } from '../constants'
import type { Catcher, CatcherBeatName, CatcherModsterAction, CatcherPath, CatcherPlace } from '../content'

// A catcher's six beats with every field filled in: the file's own beats over
// its style's preset (decision 0035 point 4, CONTENT_FORMAT "Styles").

export interface ResolvedBeat {
  /** Undefined when the frames are made from frame 0 by the preset's motion */
  frames?: readonly number[]
  place: CatcherPlace
  modster: CatcherModsterAction
  path: CatcherPath
}

export type ResolvedBeats = Record<CatcherBeatName, ResolvedBeat>

type Preset = Record<CatcherBeatName, Omit<ResolvedBeat, 'frames' | 'path'>>

const CONTAIN: Preset = {
  throw: { place: 'over', modster: 'visible' },
  take: { place: 'over', modster: 'shrink-in' },
  settle: { place: 'over', modster: 'hidden' },
  rock: { place: 'over', modster: 'hidden' },
  caught: { place: 'over', modster: 'hidden' },
  broken: { place: 'over', modster: 'pop-out' },
}

const COVER: Preset = {
  throw: { place: 'stretch', modster: 'visible' },
  take: { place: 'stretch', modster: 'visible' },
  settle: { place: 'stretch', modster: 'visible' },
  rock: { place: 'stretch', modster: 'shake' },
  caught: { place: 'stretch', modster: 'shrink' },
  broken: { place: 'stretch', modster: 'hop-out' },
}

export function resolveBeats(catcher: Catcher): ResolvedBeats {
  const preset = catcher.style === 'contain' ? CONTAIN : catcher.style === 'cover' ? COVER : undefined
  const entries = CONTENT.catcher.beats.map((name): [CatcherBeatName, ResolvedBeat] => {
    const own = catcher.beats?.[name] ?? {}
    // A custom catcher has no motion to make frames with, so its default is frame 0 held still
    const frames = own.frames ?? (preset ? undefined : [0])
    return [
      name,
      {
        ...(frames ? { frames } : {}),
        place: own.place ?? preset?.[name].place ?? 'over',
        modster: own.modster ?? preset?.[name].modster ?? 'visible',
        path: own.path ?? 'arc',
      },
    ]
  })
  return Object.fromEntries(entries) as ResolvedBeats
}
