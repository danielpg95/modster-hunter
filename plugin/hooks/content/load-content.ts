import { checkBiomeReferences } from './check-biome-references'
import type { Biome, ContentIssue, Modster, Sprite, Validation } from './types'
import { validateBiome } from './validate-biome'
import { validateModster } from './validate-modster'
import { validateSprite } from './validate-sprite'

/** The file access the loader needs; the adapter backs it with `$.fs`, tests with a map. */
export interface ContentReader {
  /** Names of the folders inside `path`, or [] when `path` doesn't exist */
  listFolders(path: string): Promise<string[]>
  /** The file's text, or undefined when it doesn't exist. May reject (e.g. over 4 MiB). */
  readText(path: string): Promise<string | undefined>
}

export interface LoadedModster {
  modster: Modster
  sprite: Sprite
}

export interface LoadedBiome {
  /** Entries naming a Modster that didn't load are already dropped */
  biome: Biome
  background?: Sprite
}

/** Everything that loaded, by id, and every problem found on the way. */
export interface ContentRegistry {
  biomes: Map<string, LoadedBiome>
  modsters: Map<string, LoadedModster>
  issues: ContentIssue[]
}

/**
 * Loads a content folder (docs/CONTENT_FORMAT.md layout): Modsters with their
 * sprites first, then biomes, whose entries must name a loaded Modster. A bad
 * file is skipped with its issues listed; this never rejects (decision 0007).
 */
export async function loadContent(reader: ContentReader, root: string): Promise<ContentRegistry> {
  const issues: ContentIssue[] = []

  const modsterFolders = await listFolders(reader, root, 'modsters', issues)
  const modsters = new Map<string, LoadedModster>()
  for (const loaded of await Promise.all(modsterFolders.map((folder) => loadModster(reader, root, folder, issues)))) {
    if (loaded) modsters.set(loaded.modster.id, loaded)
  }

  const biomeFolders = await listFolders(reader, root, 'biomes', issues)
  const biomes = new Map<string, LoadedBiome>()
  const modsterIds = new Set(modsters.keys())
  for (const loaded of await Promise.all(biomeFolders.map((folder) => loadBiome(reader, root, folder, modsterIds, issues)))) {
    if (loaded) biomes.set(loaded.biome.id, loaded)
  }

  return { biomes, modsters, issues }
}

async function loadModster(
  reader: ContentReader,
  root: string,
  folder: string,
  issues: ContentIssue[],
): Promise<LoadedModster | undefined> {
  const file = `modsters/${folder}/modster.json`
  const json = await readJson(reader, root, file, issues)
  const modster = json && keep(validateModster(json.value, { file, folder }), issues)
  if (!modster) return undefined

  const spriteFile = `modsters/${folder}/${modster.sprite.file}`
  const spriteJson = await readJson(reader, root, spriteFile, issues)
  const sprite = spriteJson && keep(validateSprite(spriteJson.value, { file: spriteFile }), issues)
  if (!sprite) {
    // A Modster can't appear without its sprite, so it's skipped too
    issues.push(issueFor(file, 'sprite.file', `points to a sprite that didn't load: ${spriteFile}`))
    return undefined
  }
  return { modster, sprite }
}

async function loadBiome(
  reader: ContentReader,
  root: string,
  folder: string,
  modsterIds: ReadonlySet<string>,
  issues: ContentIssue[],
): Promise<LoadedBiome | undefined> {
  const file = `biomes/${folder}/biome.json`
  const json = await readJson(reader, root, file, issues)
  const validated = json && keep(validateBiome(json.value, { file, folder }), issues)
  if (!validated) return undefined
  const biome = keep(checkBiomeReferences(validated, modsterIds, file), issues)
  if (!biome) return undefined

  if (biome.background === undefined) return { biome }
  const backgroundFile = `biomes/${folder}/${biome.background}`
  const backgroundJson = await readJson(reader, root, backgroundFile, issues)
  const background = backgroundJson && keep(validateSprite(backgroundJson.value, { file: backgroundFile, singleFrame: true }), issues)
  if (background) return { biome, background }
  // The background is optional: the biome still loads, drawn without it
  const { background: _dropped, ...withoutBackground } = biome
  return { biome: withoutBackground }
}

/** The parsed JSON, or undefined after reporting why the file can't be used. */
async function readJson(
  reader: ContentReader,
  root: string,
  file: string,
  issues: ContentIssue[],
): Promise<{ value: unknown } | undefined> {
  let text: string | undefined
  try {
    text = await reader.readText(`${root}/${file}`)
  } catch (error) {
    issues.push(issueFor(file, '', `could not be read: ${errorMessage(error)}`))
    return undefined
  }
  if (text === undefined) {
    issues.push(issueFor(file, '', 'is missing'))
    return undefined
  }
  try {
    return { value: JSON.parse(text) as unknown }
  } catch (error) {
    issues.push(issueFor(file, '', `is not valid JSON: ${errorMessage(error)}`))
    return undefined
  }
}

async function listFolders(reader: ContentReader, root: string, kind: string, issues: ContentIssue[]): Promise<string[]> {
  try {
    const names = await reader.listFolders(`${root}/${kind}`)
    // Hidden folders (.git, editor state) aren't content; sorted so the load order never depends on the disk
    return names.filter((name) => !name.startsWith('.')).sort()
  } catch (error) {
    issues.push(issueFor(`${kind}/`, '', `could not be listed: ${errorMessage(error)}`))
    return []
  }
}

/** Collects a validator's issues and returns its value when it passed. */
function keep<T>(result: Validation<T>, issues: ContentIssue[]): T | undefined {
  issues.push(...result.issues)
  return result.ok ? result.value : undefined
}

function issueFor(file: string, field: string, problem: string): ContentIssue {
  return { severity: 'error', file, field, problem }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
