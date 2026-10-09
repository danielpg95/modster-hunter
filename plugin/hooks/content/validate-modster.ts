import { CONTENT } from '../constants'
import { checkKeys, checkNumber, checkPattern, checkSchemaVersion, checkString, describe, isObject } from './fields'
import { IssueList } from './issue-list'
import type { Modster, Rarity, Validation } from './types'

const KEYS = ['schemaVersion', 'id', 'name', 'description', 'rarity', 'maxAttempts', 'catchRate', 'shinyChance', 'sprite']
const REQUIRED = ['schemaVersion', 'id', 'name', 'sprite']
const SPRITE_KEYS = ['file', 'frames', 'fps']
const SPRITE_REQUIRED = ['file']
const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'legendary']

/**
 * Checks a parsed `modster.json` against CONTENT_FORMAT.md. `folder` is the
 * name of the folder it was read from, which must equal its `id`. `allowPng`
 * is set for user content, whose sprite may be a PNG sheet (decision 0016).
 */
export function validateModster(input: unknown, where: { file: string; folder: string; allowPng?: boolean }): Validation<Modster> {
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
  checkRarity(input.rarity, issues)
  // null means "use the tier default" (decision 0004)
  checkNumber(input, 'maxAttempts', { min: CONTENT.maxAttemptsMin, max: CONTENT.maxAttemptsMax, integer: true, nullable: true }, issues)
  checkNumber(input, 'catchRate', { min: CONTENT.catchRateMin, max: CONTENT.catchRateMax, nullable: true }, issues)
  checkNumber(input, 'shinyChance', { min: 0, max: 1, nullable: true }, issues)
  checkSprite(input.sprite, where.allowPng === true, issues)

  return issues.result(input as unknown as Modster)
}

function checkRarity(value: unknown, issues: IssueList): void {
  if (value === undefined || value === null) return
  if (!RARITIES.some((rarity) => rarity === value)) {
    issues.error('rarity', `must be ${RARITIES.join(', ')} or null (it is ${describe(value)})`)
  }
}

function checkSprite(value: unknown, allowPng: boolean, issues: IssueList): void {
  if (value === undefined) return
  if (!isObject(value)) {
    issues.error('sprite', 'must be an object like { "file": "sprite.sprite.json" }')
    return
  }
  checkKeys(value, SPRITE_KEYS, SPRITE_REQUIRED, issues, 'sprite')
  checkNumber(value, 'fps', { min: CONTENT.modster.fpsMin, max: CONTENT.modster.fpsMax }, issues, 'sprite')

  const isPng = allowPng && typeof value.file === 'string' && CONTENT.pngFilePattern.test(value.file)
  if (!isPng) {
    const expected = allowPng ? 'a .sprite.json or .png file in this folder' : 'a .sprite.json file in this folder'
    const file = checkPattern(value, 'file', CONTENT.spriteFilePattern, expected, issues, 'sprite')
    // The .sprite.json holds its own frames
    if (file !== undefined && Object.hasOwn(value, 'frames')) issues.error('sprite.frames', 'is only for a .png sheet')
    return
  }
  // A sheet's frames sit side by side; only the file names how many (decision 0016)
  if (!Object.hasOwn(value, 'frames')) {
    issues.error('sprite.frames', 'is required with a .png sheet: how many frames sit side by side')
    return
  }
  checkNumber(value, 'frames', { min: CONTENT.sprite.framesMin, max: CONTENT.sprite.framesMax, integer: true }, issues, 'sprite')
}
