import { describe, expect, test } from 'claude-code/testing'
import type { ContentRegistry } from '../../../hooks/content'
import { checkReport } from '../../../skills/create-modster-content/scripts/lib'

const empty: ContentRegistry = { biomes: new Map(), modsters: new Map(), issues: [] }

describe('checkReport', () => {
  test('every issue, then a summary; errors counted for the exit code', () => {
    const registry: ContentRegistry = {
      ...empty,
      issues: [
        { severity: 'error', file: '~/c/modsters/a/modster.json', field: 'name', problem: 'is required' },
        { severity: 'warning', file: '~/c/modsters/a/sprite.sprite.json', field: 'palette[0]', problem: 'should be transparent' },
      ],
    }
    expect(checkReport(registry)).toEqual({
      lines: [
        '~/c/modsters/a/modster.json: name is required',
        '~/c/modsters/a/sprite.sprite.json: palette[0] should be transparent (warning)',
        '0 biomes and 0 Modsters load; 1 error, 1 warning',
      ],
      errors: 1,
    })
  })

  test('a clean folder is one line and no errors', () => {
    expect(checkReport(empty)).toEqual({ lines: ['0 biomes and 0 Modsters load; 0 errors, 0 warnings'], errors: 0 })
  })
})
