import { CONTENT } from '../constants'
import {
  checkKeys,
  checkNumber,
  checkNumberValue,
  checkPattern,
  checkSchemaVersion,
  checkString,
  fieldPath,
  isObject,
} from './fields'
import { IssueList } from './issue-list'
import type { Biome, Validation } from './types'

const KEYS = ['schemaVersion', 'id', 'name', 'description', 'accentColor', 'background', 'encounterEverySec', 'modsters']
const REQUIRED = ['schemaVersion', 'id', 'name', 'modsters']
const ENTRY_KEYS = ['id', 'weight', 'maxAttempts', 'catchRate']
const ENTRY_REQUIRED = ['id', 'weight']

/**
 * Checks a parsed `biome.json` against CONTENT_FORMAT.md. `folder` is the name
 * of the folder it was read from, which must equal its `id`. Whether each
 * listed Modster exists is checked after merging, by `checkBiomeReferences`.
 */
export function validateBiome(input: unknown, where: { file: string; folder: string }): Validation<Biome> {
  const issues = new IssueList(where.file)
  if (!isObject(input)) return issues.fail('', 'must be a JSON object')

  checkKeys(input, KEYS, REQUIRED, issues)
  checkSchemaVersion(input, CONTENT.schemaVersion, issues)
  const id = checkPattern(input, 'id', CONTENT.idPattern, 'a lowercase id like "whispering-forest"', issues)
  if (id !== undefined && id !== where.folder) {
    issues.error('id', `must match its folder name "${where.folder}" (it is "${id}")`)
  }
  checkString(input, 'name', { min: 1, max: CONTENT.biome.nameMaxChars }, issues)
  checkString(input, 'description', { min: 0, max: CONTENT.descriptionMaxChars }, issues)
  checkPattern(input, 'accentColor', CONTENT.rgbColorPattern, 'a color like "#4caf50"', issues)
  checkPattern(input, 'background', CONTENT.spriteFilePattern, 'a .sprite.json file in this folder', issues)
  checkEncounterEverySec(input.encounterEverySec, issues)
  checkEntries(input.modsters, issues)

  return issues.result(input as unknown as Biome)
}

function checkEncounterEverySec(value: unknown, issues: IssueList): void {
  if (value === undefined) return
  const { encounterEverySecMin: low, encounterEverySecMax: high } = CONTENT.biome
  const expected = `[min, max] seconds with ${low} ≤ min ≤ max ≤ ${high}`
  if (!Array.isArray(value) || value.length !== 2) {
    issues.error('encounterEverySec', `must be ${expected}`)
    return
  }
  const rule = { min: low, max: high }
  const min = checkNumberValue(value[0], rule, 'encounterEverySec[0]', issues)
  const max = checkNumberValue(value[1], rule, 'encounterEverySec[1]', issues)
  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    issues.error('encounterEverySec', `min must not be above max (it is [${min}, ${max}])`)
  }
}

function checkEntries(value: unknown, issues: IssueList): void {
  if (value === undefined) return
  const { modstersMin, modstersMax } = CONTENT.biome
  if (!Array.isArray(value) || value.length < modstersMin || value.length > modstersMax) {
    issues.error('modsters', `must be a list of ${modstersMin}–${modstersMax} Modsters`)
    return
  }
  const seen = new Map<string, number>()
  value.forEach((entry: unknown, index) => {
    const prefix = fieldPath('modsters', index)
    if (!isObject(entry)) {
      issues.error(prefix, 'must be an object like { "id": "sproutling", "weight": 60 }')
      return
    }
    checkKeys(entry, ENTRY_KEYS, ENTRY_REQUIRED, issues, prefix)
    const id = checkPattern(entry, 'id', CONTENT.idPattern, 'a lowercase Modster id', issues, prefix)
    if (id !== undefined) {
      const first = seen.get(id)
      if (first === undefined) seen.set(id, index)
      else issues.error(fieldPath(prefix, 'id'), `repeats "${id}" (already at modsters[${first}])`)
    }
    const { weightMin, weightMax } = CONTENT.biome
    checkNumber(entry, 'weight', { min: weightMin, max: weightMax, integer: true }, issues, prefix)
    checkNumber(entry, 'maxAttempts', { min: CONTENT.maxAttemptsMin, max: CONTENT.maxAttemptsMax, integer: true }, issues, prefix)
    checkNumber(entry, 'catchRate', { min: CONTENT.catchRateMin, max: CONTENT.catchRateMax }, issues, prefix)
  })
}
