import type { ContentIssue } from '../../hooks/content'

/** The issues a validator reported for one field, so tests can say which field failed. */
export function issuesAt(result: { issues: ContentIssue[] }, field: string): ContentIssue[] {
  return result.issues.filter((issue) => issue.field === field)
}
