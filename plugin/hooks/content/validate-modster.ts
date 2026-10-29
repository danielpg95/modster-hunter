import { CONTENT, MODSTER_TYPES } from '../constants'
import { checkDesktopRef } from './check-desktop-ref'
import { checkSpriteRef } from './check-sprite-ref'
import { checkKeys, checkNumber, checkPattern, checkRarity, checkSchemaVersion, checkString, describe, fieldPath, isObject, type JsonObject } from './fields'
import { IssueList } from './issue-list'
import type { Modster, Validation } from './types'

const KEYS = ['schemaVersion', 'id', 'name', 'description', 'rarity', 'maxAttempts', 'catchRate', 'shinyChance', 'dex', 'sprite', 'desktopSprite']
const REQUIRED = ['schemaVersion', 'id', 'name', 'rarity', 'sprite']
const SPRITE_KEYS = ['file', 'frames', 'fps']
const DESKTOP_KEYS = ['file', 'frames', 'fps']
// `type` is listed only so its rename error isn't doubled by "not a known field" (decision 0022)
const DEX_KEYS = ['number', 'types', 'type', 'category', 'heightM', 'weightKg', 'entry']
const TYPES = Object.keys(MODSTER_TYPES)

/**
 * Checks a parsed `modster.json` against CONTENT_FORMAT.md. `folder` is the
 * name of the folder it was read from, which must equal its `id`.
 * `userContent` is set for the user folder: its sprite may be a PNG sheet
 * (decision 0016), and it may not set a dex number (decision 0017).
 */
export function validateModster(input: unknown, where: { file: string; folder: string; userContent?: boolean }): Validation<Modster> {
  const issues = new IssueList(where.file)
  if (!isObject(input)) return issues.fail('', 'must be a JSON object')

  checkKeys(input, KEYS, REQUIRED, issues)
  checkSchemaVersion(input, CONTENT.schemaVersion, issues)
  const id = checkPattern(input, 'id', CONTENT.idPattern, 'a lowercase id like "sproutling"', issues)
  if (id !== undefined && id !== where.folder) {
    issues.error('id', `must match its folder name "${where.folder}" (it is "${id}")`)
  }
  checkString(input, 'name', { min: 1, max: CONTENT.modster.nameMaxChars }, issues)
  checkString(input, 'description', { min: 0, max: CONTENT.descriptionMaxChars }, issues)
  checkRarity(input, issues)
  // null means "use the tier default" (decision 0004)
  checkNumber(input, 'maxAttempts', { min: CONTENT.maxAttemptsMin, max: CONTENT.maxAttemptsMax, integer: true, nullable: true }, issues)
  checkNumber(input, 'catchRate', { min: CONTENT.catchRateMin, max: CONTENT.catchRateMax, nullable: true }, issues)
  checkNumber(input, 'shinyChance', { min: 0, max: 1, nullable: true }, issues)
  checkDex(input.dex, where.userContent === true, issues)
  checkSprite(input.sprite, where.userContent === true, issues)
  checkDesktopSprite(input.desktopSprite, issues)

  return issues.result(input as unknown as Modster)
}

/** Hi-res desktop art, built-in or user (decision 0045 point 3); its PNG is checked when it loads. */
function checkDesktopSprite(value: unknown, issues: IssueList): void {
  const { framesMin, framesMax } = CONTENT.desktop.modster
  const sprite = checkDesktopRef(value, { field: 'desktopSprite', keys: DESKTOP_KEYS, framesMin, framesMax }, issues)
  if (sprite) checkNumber(sprite, 'fps', { min: CONTENT.modster.fpsMin, max: CONTENT.modster.fpsMax }, issues, 'desktopSprite')
}

function checkDex(value: unknown, userContent: boolean, issues: IssueList): void {
  if (value === undefined) return
  if (!isObject(value)) {
    issues.error('dex', 'must be an object like { "types": ["grass"], "entry": "…" }')
    return
  }
  const rules = CONTENT.dex
  checkKeys(value, DEX_KEYS, [], issues, 'dex')
  if (userContent && Object.hasOwn(value, 'number')) {
    // Numbers belong to built-in Modsters, so user ones never clash (decision 0017 point 3)
    issues.error('dex.number', 'is for built-in Modsters only; remove it')
  } else {
    checkNumber(value, 'number', { min: rules.numberMin, max: rules.numberMax, integer: true }, issues, 'dex')
  }
  if (Object.hasOwn(value, 'type')) issues.error('dex.type', 'is now "types", a list of one or two: "types": ["grass"] (decision 0022)')
  checkTypes(value, issues)
  checkString(value, 'category', { min: 1, max: rules.categoryMaxChars }, issues, 'dex')
  checkNumber(value, 'heightM', { min: rules.heightMMin, max: rules.heightMMax }, issues, 'dex')
  checkNumber(value, 'weightKg', { min: rules.weightKgMin, max: rules.weightKgMax }, issues, 'dex')
  checkString(value, 'entry', { min: 1, max: rules.entryMaxChars }, issues, 'dex')
}

function checkTypes(dex: JsonObject, issues: IssueList): void {
  if (!Object.hasOwn(dex, 'types')) return
  const { typesMin, typesMax } = CONTENT.dex
  const types = dex.types
  if (!Array.isArray(types) || types.length < typesMin || types.length > typesMax) {
    issues.error('dex.types', `must be a list of ${typesMin} or ${typesMax} types, the first one primary (it is ${describe(types)})`)
    return
  }
  types.forEach((type, index) => {
    if (!TYPES.some((known) => known === type)) {
      issues.error(fieldPath('dex.types', index), `must be one of ${TYPES.join(', ')} (it is ${describe(type)})`)
    } else if (types.indexOf(type) !== index) {
      issues.error(fieldPath('dex.types', index), `repeats "${String(type)}"`)
    }
  })
}

function checkSprite(value: unknown, allowPng: boolean, issues: IssueList): void {
  const sprite = checkSpriteRef(value, { allowPng, keys: SPRITE_KEYS, maxFrames: CONTENT.sprite.framesMax }, issues)
  if (sprite) checkNumber(sprite, 'fps', { min: CONTENT.modster.fpsMin, max: CONTENT.modster.fpsMax }, issues, 'sprite')
}
