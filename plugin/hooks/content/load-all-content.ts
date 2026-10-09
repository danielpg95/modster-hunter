import { loadFolder, type ContentReader, type ContentRegistry, type SheetLoader } from './load-content'
import { mergeContent } from './merge-content'
import type { ContentIssue, UserSettings } from './types'
import { validateSettings } from './validate-settings'

export interface ContentFolders {
  reader: ContentReader
  builtInRoot: string
  /** The `includeBuiltins` option (decision 0007 point 5) */
  includeBuiltins: boolean
  /** The user's content folder; absent when the home folder is unknown */
  user?: { root: string; label: string; sheets: SheetLoader }
}

/**
 * Loads built-in and user content and merges them by id (decision 0007).
 * The user folder and its `settings.json` are optional; never rejects.
 */
export async function loadAllContent(folders: ContentFolders): Promise<ContentRegistry> {
  const { reader, builtInRoot, includeBuiltins, user } = folders
  const [builtIn, userContent] = await Promise.all([
    includeBuiltins ? loadFolder(reader, builtInRoot) : undefined,
    user ? loadFolder(reader, user.root, { label: user.label, sheets: user.sheets }) : emptyRegistry(),
  ])
  const settingsFile = `${user?.label ?? ''}settings.json`
  const settingsIssues: ContentIssue[] = []
  const settings = user ? await readSettings(reader, `${user.root}/settings.json`, settingsFile, settingsIssues) : undefined

  return mergeContent({
    ...(builtIn ? { builtIn } : {}),
    user: { ...userContent, issues: [...userContent.issues, ...settingsIssues] },
    ...(settings ? { settings } : {}),
    settingsFile,
  })
}

/** The settings, or undefined when there's no file or it's invalid (then nothing is disabled). */
async function readSettings(reader: ContentReader, path: string, file: string, issues: ContentIssue[]): Promise<UserSettings | undefined> {
  const fail = (problem: string): undefined => {
    issues.push({ severity: 'error', file, field: '', problem })
    return undefined
  }
  let text: string | undefined
  try {
    text = await reader.readText(path)
  } catch (error) {
    return fail(`could not be read: ${error instanceof Error ? error.message : String(error)}`)
  }
  // The file is optional
  if (text === undefined) return undefined
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (error) {
    return fail(`is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  const result = validateSettings(value, { file })
  issues.push(...result.issues)
  return result.ok ? result.value : undefined
}

function emptyRegistry(): ContentRegistry {
  return { biomes: new Map(), modsters: new Map(), issues: [] }
}
