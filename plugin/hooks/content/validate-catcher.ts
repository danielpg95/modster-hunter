import { CONTENT } from '../constants'
import { checkSpriteRef } from './check-sprite-ref'
import { checkKeys, checkNumber, checkPattern, checkSchemaVersion, checkString, describe, fieldPath, isObject, type JsonObject } from './fields'
import { IssueList } from './issue-list'
import type { Catcher, ContentIssue, Sprite, Validation } from './types'

const KEYS = ['schemaVersion', 'id', 'name', 'description', 'style', 'sprite', 'beats', 'glowIndex', 'rimIndex', 'lidRows']
const REQUIRED = ['schemaVersion', 'id', 'name', 'style', 'sprite']
const SPRITE_KEYS = ['file', 'frames']
const BEAT_KEYS = ['frames', 'place', 'modster', 'path']
const RULES = CONTENT.catcher

/**
 * Checks a parsed `catcher.json` against CONTENT_FORMAT.md (decision 0035).
 * `folder` must equal its `id`; `userContent` allows a PNG sheet (decision
 * 0016). What depends on the sprite (frame indexes, palette indexes, size) is
 * checked by `checkCatcherSprite` once it loads.
 */
export function validateCatcher(input: unknown, where: { file: string; folder: string; userContent?: boolean }): Validation<Catcher> {
  const issues = new IssueList(where.file)
  if (!isObject(input)) return issues.fail('', 'must be a JSON object')

  checkKeys(input, KEYS, REQUIRED, issues)
  checkSchemaVersion(input, CONTENT.schemaVersion, issues)
  const id = checkPattern(input, 'id', CONTENT.idPattern, 'a lowercase id like "glass-jar"', issues)
  if (id !== undefined && id !== where.folder) {
    issues.error('id', `must match its folder name "${where.folder}" (it is "${id}")`)
  }
  checkString(input, 'name', { min: 1, max: RULES.nameMaxChars }, issues)
  checkString(input, 'description', { min: 0, max: CONTENT.descriptionMaxChars }, issues)
  const style = checkOneOf(input, 'style', RULES.styles, issues)
  checkSpriteRef(input.sprite, { allowPng: where.userContent === true, keys: SPRITE_KEYS, maxFrames: RULES.framesMax }, issues)
  checkBeats(input.beats, style, issues)
  const paletteIndex = { min: RULES.paletteIndexMin, max: RULES.paletteIndexMax, integer: true }
  checkNumber(input, 'glowIndex', paletteIndex, issues)
  checkNumber(input, 'rimIndex', paletteIndex, issues)
  checkNumber(input, 'lidRows', { min: RULES.lidRowsMin, max: RULES.lidRowsMax, integer: true }, issues)

  return issues.result(input as unknown as Catcher)
}

/**
 * What a valid catcher asks of its loaded sprite: at most 32×32, every beat's
 * frame inside it, `glowIndex` and `rimIndex` inside its palette, and
 * `lidRows` shorter than it. Each problem is an error that skips the catcher.
 */
export function checkCatcherSprite(catcher: Catcher, sprite: Sprite, file: string): ContentIssue[] {
  const issues = new IssueList(file)
  if (sprite.width > RULES.widthMax || sprite.height > RULES.heightMax) {
    issues.error('sprite.file', `points to a ${sprite.width}×${sprite.height} sprite; a catcher's is at most ${RULES.widthMax}×${RULES.heightMax}`)
  }
  const frameCount = sprite.frames.length
  for (const beat of RULES.beats) {
    catcher.beats?.[beat]?.frames?.forEach((frame, index) => {
      if (frame >= frameCount) issues.error(fieldPath(`beats.${beat}.frames`, index), `is frame ${frame}, but the sprite has ${frameCount} (0–${frameCount - 1})`)
    })
  }
  const colors = sprite.palette.length
  for (const key of ['glowIndex', 'rimIndex'] as const) {
    const index = catcher[key]
    if (index !== undefined && index >= colors) issues.error(key, `is palette index ${index}, but the sprite's palette has ${colors} colors (0–${colors - 1})`)
  }
  if (catcher.lidRows !== undefined && catcher.lidRows >= sprite.height) {
    issues.error('lidRows', `must be less than the sprite's height, ${sprite.height} (it is ${catcher.lidRows})`)
  }
  return issues.items
}

/** A `custom` catcher gives every beat with its `modster`; a preset style overrides only what it names (0035 point 4). */
function checkBeats(value: unknown, style: string | undefined, issues: IssueList): void {
  if (value === undefined) {
    if (style === 'custom') issues.error('beats', `is required with "style": "custom": give all six beats, ${RULES.beats.join(', ')}`)
    return
  }
  if (!isObject(value)) {
    issues.error('beats', 'must be an object like { "rock": { "frames": [1, 0, 2, 0] } }')
    return
  }
  checkKeys(value, RULES.beats, style === 'custom' ? RULES.beats : [], issues, 'beats')
  for (const name of RULES.beats) {
    if (!Object.hasOwn(value, name)) continue
    const field = `beats.${name}`
    const beat = value[name]
    if (!isObject(beat)) {
      issues.error(field, 'must be an object like { "frames": [0], "modster": "hidden" }')
      continue
    }
    checkKeys(beat, BEAT_KEYS, style === 'custom' ? ['modster'] : [], issues, field)
    checkFrames(beat, field, issues)
    checkOneOf(beat, 'place', RULES.places, issues, field)
    checkOneOf(beat, 'modster', RULES.modsterActions, issues, field)
    if (name === 'throw') checkOneOf(beat, 'path', RULES.paths, issues, field)
    else if (Object.hasOwn(beat, 'path')) issues.error(fieldPath(field, 'path'), 'is only for the throw beat')
  }
}

function checkFrames(beat: JsonObject, prefix: string, issues: IssueList): void {
  if (!Object.hasOwn(beat, 'frames')) return
  const frames = beat.frames
  const field = fieldPath(prefix, 'frames')
  if (!Array.isArray(frames) || frames.length < 1 || frames.length > RULES.beatFramesMax) {
    issues.error(field, `must be a list of 1–${RULES.beatFramesMax} frame indexes like [1, 0, 2, 0] (it is ${describe(frames)})`)
    return
  }
  frames.forEach((frame: unknown, index) => {
    const ok = typeof frame === 'number' && Number.isInteger(frame) && frame >= 0 && frame < RULES.framesMax
    if (!ok) issues.error(fieldPath(field, index), `must be a frame index from 0 to ${RULES.framesMax - 1} (it is ${describe(frame)})`)
  })
}

function checkOneOf<T extends string>(obj: JsonObject, key: string, allowed: readonly T[], issues: IssueList, prefix = ''): T | undefined {
  if (!Object.hasOwn(obj, key)) return undefined
  const value = obj[key]
  const match = allowed.find((option) => option === value)
  if (match === undefined) issues.error(fieldPath(prefix, key), `must be one of ${allowed.join(', ')} (it is ${describe(value)})`)
  return match
}
