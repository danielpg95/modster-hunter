import { CONTENT } from '../constants'
import {
  checkKeys,
  checkNumber,
  checkNumberValue,
  checkPattern,
  checkRarity,
  checkSchemaVersion,
  checkString,
  describe,
  fieldPath,
  isObject,
} from './fields'
import { IssueList } from './issue-list'
import type { Biome, Validation } from './types'

const KEYS = [
  'schemaVersion',
  'id',
  'name',
  'description',
  'accentColor',
  'background',
  'backgroundFps',
  'particles',
  'encounterEverySec',
  'modsters',
]
const REQUIRED = ['schemaVersion', 'id', 'name', 'modsters']
const ENTRY_KEYS = ['id', 'rarity', 'maxAttempts', 'catchRate']
const ENTRY_REQUIRED = ['id']
const PARTICLE_KEYS = ['style', 'color', 'density']

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
  const { backgroundFpsMin, backgroundFpsMax } = CONTENT.biome
  checkNumber(input, 'backgroundFps', { min: backgroundFpsMin, max: backgroundFpsMax, integer: true }, issues)
  checkParticles(input.particles, issues)
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

// Decision 0026 point 3
function checkParticles(value: unknown, issues: IssueList): void {
  if (value === undefined) return
  if (!isObject(value)) {
    issues.error('particles', 'must be an object like { "style": "sparkle" }')
    return
  }
  const { particleStyles, particleDensityMin, particleDensityMax } = CONTENT.biome
  checkKeys(value, PARTICLE_KEYS, ['style'], issues, 'particles')
  if (Object.hasOwn(value, 'style') && !(particleStyles as readonly unknown[]).includes(value.style)) {
    issues.error('particles.style', `must be one of ${particleStyles.join(', ')} (it is ${describe(value.style)})`)
  }
  checkPattern(value, 'color', CONTENT.rgbColorPattern, 'a color like "#4caf50"', issues, 'particles')
  checkNumber(value, 'density', { min: particleDensityMin, max: particleDensityMax, integer: true }, issues, 'particles')
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
      issues.error(prefix, 'must be an object like { "id": "sproutling" }')
      return
    }
    checkKeys(entry, ENTRY_KEYS, ENTRY_REQUIRED, issues, prefix)
    const id = checkPattern(entry, 'id', CONTENT.idPattern, 'a lowercase Modster id', issues, prefix)
    if (id !== undefined) {
      const first = seen.get(id)
      if (first === undefined) seen.set(id, index)
      else issues.error(fieldPath(prefix, 'id'), `repeats "${id}" (already at modsters[${first}])`)
    }
    checkRarity(entry, issues, prefix)
    checkNumber(entry, 'maxAttempts', { min: CONTENT.maxAttemptsMin, max: CONTENT.maxAttemptsMax, integer: true }, issues, prefix)
    checkNumber(entry, 'catchRate', { min: CONTENT.catchRateMin, max: CONTENT.catchRateMax }, issues, prefix)
  })
}
