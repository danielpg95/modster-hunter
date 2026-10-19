import { CONTENT } from '../constants'
import { checkKeys, checkNumber, checkPattern, isObject } from './fields'
import type { IssueList } from './issue-list'

/**
 * Checks a `sprite` field naming the art in its folder: a `.sprite.json`, or
 * in user content a `.png` sheet with `frames` (decision 0016). Shared by
 * Modsters and catchers (decision 0035), which allow different `keys` and
 * frame counts. Returns the object for any further checks of its own keys.
 */
export function checkSpriteRef(
  value: unknown,
  options: { allowPng: boolean; keys: readonly string[]; maxFrames: number },
  issues: IssueList,
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined
  if (!isObject(value)) {
    issues.error('sprite', 'must be an object like { "file": "sprite.sprite.json" }')
    return undefined
  }
  checkKeys(value, options.keys, ['file'], issues, 'sprite')

  const isPng = options.allowPng && typeof value.file === 'string' && CONTENT.pngFilePattern.test(value.file)
  if (!isPng) {
    const expected = options.allowPng ? 'a .sprite.json or .png file in this folder' : 'a .sprite.json file in this folder'
    const file = checkPattern(value, 'file', CONTENT.spriteFilePattern, expected, issues, 'sprite')
    // The .sprite.json holds its own frames
    if (file !== undefined && Object.hasOwn(value, 'frames')) issues.error('sprite.frames', 'is only for a .png sheet')
    return value
  }
  // A sheet's frames sit side by side; only the file names how many (decision 0016)
  if (!Object.hasOwn(value, 'frames')) {
    issues.error('sprite.frames', 'is required with a .png sheet: how many frames sit side by side')
    return value
  }
  checkNumber(value, 'frames', { min: CONTENT.sprite.framesMin, max: options.maxFrames, integer: true }, issues, 'sprite')
  return value
}
