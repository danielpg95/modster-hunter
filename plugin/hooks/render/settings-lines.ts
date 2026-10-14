// The Settings tab's lines (P4-02): every content issue from the last load,
// each as `formatIssue` writes it (decision 0025, so the content helper's
// `check` and this tab agree), then how to turn content off (decision 0032),
// how to reload, and where the settings live.
// Like the Stats tab, the rows aren't windowed; past the pane's rows the engine
// scrolls its body.

import { formatIssue, type ContentIssue } from '../content'
import type { BandLine } from './band-view'
import { TOGGLE_HOTKEY } from './item-notes'

export const NO_ISSUES_TEXT = 'All content loaded, no problems.'
// The `o` key is otherwise only a dim button on the Collection and Biomes summary rows
export const TOGGLE_TEXT = `Press ${TOGGLE_HOTKEY} in Collection or Biomes to turn one off or on.`
export const RELOAD_TEXT = 'Changed a file? Run /modsters reload.'
// 0023 point 7, as amended by P3-01
export const CONFIG_TEXT = 'Change where the game shows in /config.'

export function settingsLines(issues: readonly ContentIssue[]): BandLine[] {
  const lines: BandLine[] = []
  if (issues.length === 0) {
    lines.push([{ text: NO_ISSUES_TEXT, dim: true }])
  } else {
    lines.push([{ text: 'Content problems ', dim: true }, { text: issueCount(issues), bold: true }])
    // Errors first: those files were skipped; a warning's file still loaded
    const sorted = [...issues.filter((issue) => issue.severity === 'error'), ...issues.filter((issue) => issue.severity === 'warning')]
    for (const issue of sorted) lines.push([{ text: formatIssue(issue), ...(issue.severity === 'warning' ? { dim: true } : {}) }])
  }
  lines.push([{ text: '' }])
  lines.push([{ text: TOGGLE_TEXT, dim: true }])
  lines.push([{ text: RELOAD_TEXT, dim: true }])
  lines.push([{ text: CONFIG_TEXT, dim: true }])
  return lines
}

/** `2 errors, 1 warning`; a kind with none is left out. */
function issueCount(issues: readonly ContentIssue[]): string {
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.length - errors
  return [plural(errors, 'error'), plural(warnings, 'warning')].filter(Boolean).join(', ')
}

function plural(count: number, word: string): string {
  if (count === 0) return ''
  return `${count} ${word}${count === 1 ? '' : 's'}`
}
