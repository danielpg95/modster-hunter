import { describe, expect, test } from 'claude-code/testing'
import type { ContentIssue } from '../../hooks/content'
import { CONFIG_TEXT, NO_ISSUES_TEXT, RELOAD_TEXT, settingsLines } from '../../hooks/render'

// P4-02: every content issue, formatted as formatIssue writes it (0025), then how to reload.

const text = (line: ReturnType<typeof settingsLines>[number]) => line.map((segment) => ('text' in segment ? segment.text : '')).join('')

const error = (file: string, field: string, problem: string): ContentIssue => ({ severity: 'error', file, field, problem })
const warning = (file: string, field: string, problem: string): ContentIssue => ({ severity: 'warning', file, field, problem })

describe('settingsLines', () => {
  test('with no issues it says so, then how to reload and where the settings are', () => {
    expect(settingsLines([]).map(text)).toEqual([NO_ISSUES_TEXT, '', RELOAD_TEXT, CONFIG_TEXT])
  })

  test('every issue gets a line, as formatIssue writes it, errors before warnings', () => {
    const issues = [
      warning('biomes/forest/biome.json', 'modsters', 'has no rare Modster'),
      error('modsters/blob/modster.json', 'rarity', 'must be one of common, uncommon, rare, legendary'),
      error('modsters/zap/modster.json', '', 'is not valid JSON'),
    ]
    expect(settingsLines(issues).map(text)).toEqual([
      'Content problems 2 errors, 1 warning',
      'modsters/blob/modster.json: rarity must be one of common, uncommon, rare, legendary',
      'modsters/zap/modster.json is not valid JSON',
      'biomes/forest/biome.json: modsters has no rare Modster (warning)',
      '',
      RELOAD_TEXT,
      CONFIG_TEXT,
    ])
  })

  test('warnings are dim, errors are not', () => {
    const lines = settingsLines([error('a.json', '', 'is broken'), warning('b.json', '', 'is odd')])
    expect(lines[1]?.[0]).toEqual({ text: 'a.json is broken' })
    expect(lines[2]?.[0]).toEqual({ text: 'b.json is odd (warning)', dim: true })
  })

  test('the count leaves out a kind with none and says one in the singular', () => {
    expect(text(settingsLines([warning('b.json', '', 'is odd')])[0] ?? [])).toBe('Content problems 1 warning')
    expect(text(settingsLines([error('a.json', '', 'x'), error('c.json', '', 'y')])[0] ?? [])).toBe('Content problems 2 errors')
  })
})
