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

/**
 * Turns a Modster's PNG sheet into a sprite (decision 0015): undefined when
 * the PNG doesn't exist. May reject when it can't be read.
 */
export type SheetLoader = (sheet: { path: string; file: string; modsterId: string; frames: number }) => Promise<Validation<Sprite> | undefined>

export interface LoadOptions {
  /** Put before every file name in issues, so they say which folder, e.g. `~/.claude/modster-hunter/content/` */
  label?: string
  /** Given for user content only: its Modsters may then name a PNG sheet */
  sheets?: SheetLoader
}

export interface LoadedModster {
  modster: Modster
  sprite: Sprite
}

export interface LoadedBiome {
  /** After `resolveReferences`, entries naming a Modster that didn't load are dropped */
  biome: Biome
  background?: Sprite
  /** The biome file's name as issues show it */
  file: string
}

/** Everything that loaded, by id, and every problem found on the way. */
export interface ContentRegistry {
  biomes: Map<string, LoadedBiome>
  modsters: Map<string, LoadedModster>
  issues: ContentIssue[]
}

/** One content folder, with each biome's Modsters checked against that folder's own. */
export async function loadContent(reader: ContentReader, root: string, options: LoadOptions = {}): Promise<ContentRegistry> {
  return resolveReferences(await loadFolder(reader, root, options))
}

/**
 * Loads a content folder (docs/CONTENT_FORMAT.md layout): Modsters with their
 * sprites first, then biomes. Biome entries aren't checked against the
 * Modsters yet; that runs after merging, in `resolveReferences`. A bad file is
 * skipped with its issues listed; this never rejects (decision 0007).
 */
export async function loadFolder(reader: ContentReader, root: string, options: LoadOptions = {}): Promise<ContentRegistry> {
  const issues: ContentIssue[] = []
  const at: Folder = { reader, root, label: options.label ?? '', issues, ...(options.sheets ? { sheets: options.sheets } : {}) }

  const modsterFolders = await listFolders(at, 'modsters')
  const modsters = new Map<string, LoadedModster>()
  for (const loaded of await Promise.all(modsterFolders.map((folder) => loadModster(at, folder)))) {
    if (loaded) modsters.set(loaded.modster.id, loaded)
  }

  const biomeFolders = await listFolders(at, 'biomes')
  const biomes = new Map<string, LoadedBiome>()
  for (const loaded of await Promise.all(biomeFolders.map((folder) => loadBiome(at, folder)))) {
    if (loaded) biomes.set(loaded.biome.id, loaded)
  }

  return { biomes, modsters, issues }
}

/**
 * Drops biome entries whose Modster isn't in the registry, and biomes left
 * with none (CONTENT_FORMAT.md). Runs once all content is merged (decision 0007).
 */
export function resolveReferences(registry: ContentRegistry): ContentRegistry {
  const issues = [...registry.issues]
  const modsterIds = new Set(registry.modsters.keys())
  const biomes = new Map<string, LoadedBiome>()
  for (const [id, loaded] of registry.biomes) {
    const biome = keep(checkBiomeReferences(loaded.biome, modsterIds, loaded.file), issues)
    if (biome) biomes.set(id, { ...loaded, biome })
  }
  return { biomes, modsters: registry.modsters, issues }
}

/** Where a load is reading from, and where its issues go. */
interface Folder {
  reader: ContentReader
  root: string
  label: string
  issues: ContentIssue[]
  sheets?: SheetLoader
}

async function loadModster(at: Folder, folder: string): Promise<LoadedModster | undefined> {
  const file = `modsters/${folder}/modster.json`
  const json = await readJson(at, file)
  const modster = json && keep(validateModster(json.value, { file: at.label + file, folder, allowPng: at.sheets !== undefined }), at.issues)
  if (!modster) return undefined

  const spriteFile = `modsters/${folder}/${modster.sprite.file}`
  const sprite = modster.sprite.frames === undefined ? await loadSpriteJson(at, spriteFile) : await loadSheet(at, spriteFile, modster)
  if (!sprite) {
    // A Modster can't appear without its sprite, so it's skipped too
    at.issues.push(issueFor(at.label + file, 'sprite.file', `points to a sprite that didn't load: ${at.label + spriteFile}`))
    return undefined
  }
  return { modster, sprite }
}

async function loadSpriteJson(at: Folder, file: string): Promise<Sprite | undefined> {
  const json = await readJson(at, file)
  return json && keep(validateSprite(json.value, { file: at.label + file }), at.issues)
}

/** A PNG sheet, through the sheet loader; `frames` is only set when the validator allowed a PNG. */
async function loadSheet(at: Folder, file: string, modster: Modster): Promise<Sprite | undefined> {
  if (!at.sheets || modster.sprite.frames === undefined) return undefined
  let result: Validation<Sprite> | undefined
  try {
    result = await at.sheets({ path: `${at.root}/${file}`, file: at.label + file, modsterId: modster.id, frames: modster.sprite.frames })
  } catch (error) {
    at.issues.push(issueFor(at.label + file, '', `could not be read: ${errorMessage(error)}`))
    return undefined
  }
  if (!result) {
    at.issues.push(issueFor(at.label + file, '', 'is missing'))
    return undefined
  }
  return keep(result, at.issues)
}

async function loadBiome(at: Folder, folder: string): Promise<LoadedBiome | undefined> {
  const file = `biomes/${folder}/biome.json`
  const shownFile = at.label + file
  const json = await readJson(at, file)
  const biome = json && keep(validateBiome(json.value, { file: shownFile, folder }), at.issues)
  if (!biome) return undefined

  if (biome.background === undefined) return { biome, file: shownFile }
  const backgroundFile = `biomes/${folder}/${biome.background}`
  const backgroundJson = await readJson(at, backgroundFile)
  const background =
    backgroundJson && keep(validateSprite(backgroundJson.value, { file: at.label + backgroundFile, singleFrame: true }), at.issues)
  if (background) return { biome, background, file: shownFile }
  // The background is optional: the biome still loads, drawn without it
  const { background: _dropped, ...withoutBackground } = biome
  return { biome: withoutBackground, file: shownFile }
}

/** The parsed JSON, or undefined after reporting why the file can't be used. */
async function readJson(at: Folder, file: string): Promise<{ value: unknown } | undefined> {
  const shown = at.label + file
  let text: string | undefined
  try {
    text = await at.reader.readText(`${at.root}/${file}`)
  } catch (error) {
    at.issues.push(issueFor(shown, '', `could not be read: ${errorMessage(error)}`))
    return undefined
  }
  if (text === undefined) {
    at.issues.push(issueFor(shown, '', 'is missing'))
    return undefined
  }
  try {
    return { value: JSON.parse(text) as unknown }
  } catch (error) {
    at.issues.push(issueFor(shown, '', `is not valid JSON: ${errorMessage(error)}`))
    return undefined
  }
}

async function listFolders(at: Folder, kind: string): Promise<string[]> {
  try {
    const names = await at.reader.listFolders(`${at.root}/${kind}`)
    // Hidden folders (.git, editor state) aren't content; sorted so the load order never depends on the disk
    return names.filter((name) => !name.startsWith('.')).sort()
  } catch (error) {
    at.issues.push(issueFor(`${at.label}${kind}/`, '', `could not be listed: ${errorMessage(error)}`))
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
