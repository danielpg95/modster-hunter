// Field checks shared by the validators. Each one reports into an IssueList
// and returns the value only when it's valid. A missing key returns undefined
// without a report; `checkKeys` reports missing required keys once.

import type { IssueList } from './issue-list'

export type JsonObject = Record<string, unknown>

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `modsters` + 2 → `modsters[2]`; `sprite` + `fps` → `sprite.fps` */
export function fieldPath(prefix: string, key: string | number): string {
  if (typeof key === 'number') return `${prefix}[${key}]`
  return prefix ? `${prefix}.${key}` : key
}

/** Unknown keys and missing required keys are errors (the format is closed). */
export function checkKeys(
  obj: JsonObject,
  allowed: readonly string[],
  required: readonly string[],
  issues: IssueList,
  prefix = '',
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) issues.error(fieldPath(prefix, key), 'is not a known field')
  }
  for (const key of required) {
    if (!Object.hasOwn(obj, key)) issues.error(fieldPath(prefix, key), 'is required')
  }
}

/** Length in characters as people count them (code points), not UTF-16 units. */
function charCount(text: string): number {
  return [...text].length
}

export function checkString(
  obj: JsonObject,
  key: string,
  bounds: { min: number; max: number },
  issues: IssueList,
  prefix = '',
): string | undefined {
  if (!Object.hasOwn(obj, key)) return undefined
  const value = obj[key]
  const field = fieldPath(prefix, key)
  if (typeof value !== 'string') {
    issues.error(field, 'must be text')
    return undefined
  }
  const count = charCount(value)
  if (count < bounds.min || count > bounds.max) {
    const range = bounds.min === 0 ? `at most ${bounds.max}` : `${bounds.min}–${bounds.max}`
    issues.error(field, `must be ${range} characters (it has ${count})`)
    return undefined
  }
  return value
}

export function checkPattern(
  obj: JsonObject,
  key: string,
  pattern: RegExp,
  expected: string,
  issues: IssueList,
  prefix = '',
): string | undefined {
  if (!Object.hasOwn(obj, key)) return undefined
  return checkPatternValue(obj[key], pattern, expected, fieldPath(prefix, key), issues)
}

export function checkPatternValue(
  value: unknown,
  pattern: RegExp,
  expected: string,
  field: string,
  issues: IssueList,
): string | undefined {
  if (typeof value !== 'string' || !pattern.test(value)) {
    issues.error(field, `must be ${expected} (it is ${describe(value)})`)
    return undefined
  }
  return value
}

export interface NumberRule {
  min: number
  max: number
  integer?: boolean
  /** `null` is allowed and means "use the default" */
  nullable?: boolean
}

export function checkNumber(
  obj: JsonObject,
  key: string,
  rule: NumberRule,
  issues: IssueList,
  prefix = '',
): number | null | undefined {
  if (!Object.hasOwn(obj, key)) return undefined
  return checkNumberValue(obj[key], rule, fieldPath(prefix, key), issues)
}

export function checkNumberValue(
  value: unknown,
  rule: NumberRule,
  field: string,
  issues: IssueList,
): number | null | undefined {
  if (value === null && rule.nullable) return null
  const kind = rule.integer ? 'a whole number' : 'a number'
  const range = `${kind} from ${rule.min} to ${rule.max}${rule.nullable ? ', or null' : ''}`
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.error(field, `must be ${range} (it is ${describe(value)})`)
    return undefined
  }
  if ((rule.integer && !Number.isInteger(value)) || value < rule.min || value > rule.max) {
    issues.error(field, `must be ${range} (it is ${value})`)
    return undefined
  }
  return value
}

export function checkSchemaVersion(obj: JsonObject, expected: number, issues: IssueList): void {
  if (!Object.hasOwn(obj, 'schemaVersion')) return
  if (obj.schemaVersion !== expected) {
    issues.error('schemaVersion', `must be ${expected} (it is ${describe(obj.schemaVersion)})`)
  }
}

/** Short description of a bad value for messages: `"abc"`, `12`, `null`, `a list`, `an object`. */
export function describe(value: unknown): string {
  if (value === undefined) return 'missing'
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'a list'
  if (typeof value === 'object') return 'an object'
  if (typeof value === 'string') {
    const shown = value.length > 24 ? `${value.slice(0, 24)}…` : value
    return JSON.stringify(shown)
  }
  return String(value)
}
