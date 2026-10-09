import type { ContentIssue, Validation } from './types'

/** Collects the issues for one file while a validator walks it. */
export class IssueList {
  readonly items: ContentIssue[] = []

  constructor(readonly file: string) {}

  error(field: string, problem: string): void {
    this.items.push({ severity: 'error', file: this.file, field, problem })
  }

  warning(field: string, problem: string): void {
    this.items.push({ severity: 'warning', file: this.file, field, problem })
  }

  get hasErrors(): boolean {
    return this.items.some((issue) => issue.severity === 'error')
  }

  /** Not `ok`, for input too broken to walk any further. */
  fail(field: string, problem: string): Validation<never> {
    this.error(field, problem)
    return { ok: false, issues: this.items }
  }

  /** `ok` with `value` when nothing is an error; the issues come along either way. */
  result<T>(value: T): Validation<T> {
    return this.hasErrors ? { ok: false, issues: this.items } : { ok: true, value, issues: this.items }
  }
}

/** One line for logs and the Settings tab: `biomes/forest/biome.json: modsters[1].weight must be …` */
export function formatIssue(issue: ContentIssue): string {
  const where = issue.field ? `${issue.file}: ${issue.field}` : issue.file
  const tag = issue.severity === 'warning' ? ' (warning)' : ''
  return `${where} ${issue.problem}${tag}`
}
