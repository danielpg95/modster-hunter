import { CONTENT } from '../constants'
import { checkKeys, checkNumber, checkPattern, isObject, type JsonObject } from './fields'
import type { IssueList } from './issue-list'

/**
 * Checks a field naming desktop art (decision 0045): `{ "file": "desktop.png",
 * "frames": 4 }` and the `keys` each kind allows. Shared by `desktopSprite`
 * (Modsters, catchers) and `desktopBackground` (biomes). The PNG itself is
 * checked by `desktopSheet` once it's read. Returns the object for any further
 * checks of its own keys.
 */
export function checkDesktopRef(
  value: unknown,
  options: { field: string; keys: readonly string[]; framesMin: number; framesMax: number },
  issues: IssueList,
): JsonObject | undefined {
  const { field } = options
  if (value === undefined) return undefined
  if (!isObject(value)) {
    issues.error(field, 'must be an object like { "file": "desktop.png", "frames": 4 }')
    return undefined
  }
  checkKeys(value, options.keys, ['file', 'frames'], issues, field)
  checkPattern(value, 'file', CONTENT.pngFilePattern, 'a .png file in this folder', issues, field)
  checkNumber(value, 'frames', { min: options.framesMin, max: options.framesMax, integer: true }, issues, field)
  return value
}
