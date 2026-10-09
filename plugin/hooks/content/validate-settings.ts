import { CONTENT } from '../constants'
import { checkKeys, checkPatternValue, checkSchemaVersion, fieldPath, isObject } from './fields'
import { IssueList } from './issue-list'
import type { UserSettings, Validation } from './types'

const KEYS = ['schemaVersion', 'disabledBiomes', 'disabledModsters']
const REQUIRED = ['schemaVersion']

/** Checks a parsed user `settings.json` against CONTENT_FORMAT.md (decision 0007 point 4). */
export function validateSettings(input: unknown, where: { file: string }): Validation<UserSettings> {
  const issues = new IssueList(where.file)
  if (!isObject(input)) return issues.fail('', 'must be a JSON object')

  checkKeys(input, KEYS, REQUIRED, issues)
  checkSchemaVersion(input, CONTENT.schemaVersion, issues)
  checkIds(input.disabledBiomes, 'disabledBiomes', issues)
  checkIds(input.disabledModsters, 'disabledModsters', issues)

  return issues.result(input as unknown as UserSettings)
}

function checkIds(value: unknown, key: string, issues: IssueList): void {
  if (value === undefined) return
  if (!Array.isArray(value)) {
    issues.error(key, 'must be a list of ids, like ["mossbeast"]')
    return
  }
  value.forEach((id, index) => checkPatternValue(id, CONTENT.idPattern, 'a lowercase id', fieldPath(key, index), issues))
}
