import { CONTENT } from '../constants'
import { checkBiomeReferences } from './check-biome-references'
import { checkTierBalance } from './check-tier-balance'
import { desktopSheet, type DesktopSheetRules } from './desktop-sheet'
import type { Biome, Catcher, ContentIssue, DesktopSheet, Modster, Sprite, Validation } from './types'
import { validateBiome } from './validate-biome'
import { checkCatcherDesktop, checkCatcherSprite, validateCatcher } from './validate-catcher'
import { validateModster } from './validate-modster'
import { validateSprite } from './validate-sprite'

/** The file access the loader needs; the adapter backs it with `$.fs`, tests with a map. */
export interface ContentReader {
  /** Names of the folders inside `path`, or [] when `path` doesn't exist */
  listFolders(path: string): Promise<string[]>
  /** The file's text, or undefined when it doesn't exist. May reject (e.g. over 4 MiB). */
  readText(path: string): Promise<string | undefined>
  /** The file's bytes as base64 (desktop art, decision 0045), or undefined when it doesn't exist. May reject. */
  readBase64(path: string): Promise<string | undefined>
}

/**
 * Turns a Modster's or a catcher's PNG sheet into a sprite (decision 0016):
 * undefined when the PNG doesn't exist. May reject when it can't be read.
 * `cacheKey` names it among cached sheets: the Modster's id, or
 * `<id>.catcher` for a catcher (ids have no dots, so they never clash).
 * `maxFrames` is set for a catcher, whose sheet may have more (decision 0035).
 */
export type SheetLoader = (sheet: { path: string; file: string; cacheKey: string; frames: number; maxFrames?: number }) => Promise<Validation<Sprite> | undefined>

export interface LoadOptions {
  /** Put before every file name in issues, so they say which folder, e.g. `~/.claude/modster-hunter/content/` */
  label?: string
  /** Given for user content only: its Modsters and catchers may then name a PNG sheet */
  sheets?: SheetLoader
  /** Load only the catchers: built-in catchers load even with `includeBuiltins` off (decision 0035 point 1) */
  catchersOnly?: true
}

export interface LoadedModster {
  modster: Modster
  sprite: Sprite
  /** Its `desktopSprite`, when it passed decision 0045's checks */
  desktop?: DesktopSheet
}

export interface LoadedBiome {
  /** After `resolveReferences`, entries naming a Modster that didn't load are dropped */
  biome: Biome
  background?: Sprite
  /** Its `desktopBackground`, when it passed decision 0045's checks */
  desktopBackground?: DesktopSheet
  /** The biome file's name as issues show it */
  file: string
}

export interface LoadedCatcher {
  catcher: Catcher
  sprite: Sprite
  /** Its `desktopSprite`, when it passed decision 0045's checks */
  desktop?: DesktopSheet
}

/** Everything that loaded, by id, and every problem found on the way. */
export interface ContentRegistry {
  biomes: Map<string, LoadedBiome>
  modsters: Map<string, LoadedModster>
  catchers: Map<string, LoadedCatcher>
  issues: ContentIssue[]
}

/** One content folder, with each biome's Modsters checked against that folder's own. */
export async function loadContent(reader: ContentReader, root: string, options: LoadOptions = {}): Promise<ContentRegistry> {
  return resolveReferences(await loadFolder(reader, root, options))
}

/**
 * Loads a content folder (docs/CONTENT_FORMAT.md layout): Modsters with their
 * sprites first, then biomes, then catchers. Biome entries aren't checked against the
 * Modsters yet; that runs after merging, in `resolveReferences`. A bad file is
 * skipped with its issues listed; this never rejects (decision 0007).
 */
export async function loadFolder(reader: ContentReader, root: string, options: LoadOptions = {}): Promise<ContentRegistry> {
  const issues: ContentIssue[] = []
  const at: Folder = { reader, root, label: options.label ?? '', issues, ...(options.sheets ? { sheets: options.sheets } : {}) }
  if (options.catchersOnly) return { biomes: new Map(), modsters: new Map(), catchers: await loadCatchers(at), issues }

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

  return { biomes, modsters, catchers: await loadCatchers(at), issues }
}

/**
 * Drops biome entries whose Modster isn't in the registry, and biomes left
 * with none (CONTENT_FORMAT.md), then warns about lopsided tiers (decision
 * 0030 point 6). Runs once all content is merged (decision 0007).
 */
export function resolveReferences(registry: ContentRegistry): ContentRegistry {
  const issues = [...registry.issues]
  const modsterIds = new Set(registry.modsters.keys())
  const modsters = new Map([...registry.modsters].map(([id, loaded]) => [id, loaded.modster]))
  const biomes = new Map<string, LoadedBiome>()
  for (const [id, loaded] of registry.biomes) {
    const biome = keep(checkBiomeReferences(loaded.biome, modsterIds, loaded.file), issues)
    if (!biome) continue
    issues.push(...checkTierBalance(biome, modsters, loaded.file))
    biomes.set(id, { ...loaded, biome })
  }
  return { biomes, modsters: registry.modsters, catchers: registry.catchers, issues }
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
  // Only the user folder is loaded with a sheet loader
  const userContent = at.sheets !== undefined
  const modster = json && keep(validateModster(json.value, { file: at.label + file, folder, userContent }), at.issues)
  if (!modster) return undefined

  const spriteFile = `modsters/${folder}/${modster.sprite.file}`
  const sprite = await loadSprite(at, spriteFile, modster.sprite.frames, { cacheKey: modster.id })
  if (!sprite) {
    // A Modster can't appear without its sprite, so it's skipped too
    at.issues.push(issueFor(at.label + file, 'sprite.file', `points to a sprite that didn't load: ${at.label + spriteFile}`))
    return undefined
  }
  const desktop = modster.desktopSprite && (await loadDesktopSheet(at, `modsters/${folder}`, modster.desktopSprite, 'desktopSprite', CONTENT.desktop.modster, at.label + file))
  return desktop ? { modster, sprite, desktop } : { modster, sprite }
}

async function loadCatchers(at: Folder): Promise<Map<string, LoadedCatcher>> {
  const catchers = new Map<string, LoadedCatcher>()
  for (const loaded of await Promise.all((await listFolders(at, 'catchers')).map((folder) => loadCatcher(at, folder)))) {
    if (loaded) catchers.set(loaded.catcher.id, loaded)
  }
  return catchers
}

async function loadCatcher(at: Folder, folder: string): Promise<LoadedCatcher | undefined> {
  const file = `catchers/${folder}/catcher.json`
  const shownFile = at.label + file
  const json = await readJson(at, file)
  const userContent = at.sheets !== undefined
  const catcher = json && keep(validateCatcher(json.value, { file: shownFile, folder, userContent }), at.issues)
  if (!catcher) return undefined

  const spriteFile = `catchers/${folder}/${catcher.sprite.file}`
  const maxFrames = CONTENT.catcher.framesMax
  const sprite = await loadSprite(at, spriteFile, catcher.sprite.frames, { cacheKey: `${catcher.id}.catcher`, maxFrames })
  if (!sprite) {
    at.issues.push(issueFor(shownFile, 'sprite.file', `points to a sprite that didn't load: ${at.label + spriteFile}`))
    return undefined
  }
  const spriteIssues = checkCatcherSprite(catcher, sprite, shownFile)
  at.issues.push(...spriteIssues)
  if (spriteIssues.length > 0) return undefined

  const desktop = catcher.desktopSprite && (await loadDesktopSheet(at, `catchers/${folder}`, catcher.desktopSprite, 'desktopSprite', CONTENT.desktop.catcher, shownFile))
  if (!desktop) return { catcher, sprite }
  const desktopIssues = checkCatcherDesktop(catcher, desktop, shownFile)
  at.issues.push(...desktopIssues)
  return desktopIssues.length === 0 ? { catcher, sprite, desktop } : { catcher, sprite }
}

/**
 * Desktop art named by `ref`, checked against decision 0045. Art that can't be
 * read or breaks a rule is reported and left out: what names it still loads
 * with its terminal art (point 8).
 */
async function loadDesktopSheet(
  at: Folder,
  folder: string,
  ref: { file: string; frames: number },
  field: string,
  rules: DesktopSheetRules,
  shownFile: string,
): Promise<DesktopSheet | undefined> {
  const path = `${folder}/${ref.file}`
  let png: string | undefined
  try {
    png = await at.reader.readBase64(`${at.root}/${path}`)
  } catch (error) {
    at.issues.push(issueFor(shownFile, `${field}.file`, `points to ${at.label + path}, which could not be read: ${errorMessage(error)}`))
    return undefined
  }
  if (png === undefined) {
    at.issues.push(issueFor(shownFile, `${field}.file`, `points to ${at.label + path}, which is missing`))
    return undefined
  }
  return keep(desktopSheet(png, { frames: ref.frames, field: `${field}.file`, file: shownFile }, rules), at.issues)
}

/** A `.sprite.json`, or a PNG sheet when `frames` is set (only when the validator allowed a PNG). */
async function loadSprite(at: Folder, file: string, frames: number | undefined, sheet: { cacheKey: string; maxFrames?: number }): Promise<Sprite | undefined> {
  return frames === undefined ? loadSpriteJson(at, file, sheet.maxFrames) : loadSheet(at, file, frames, sheet)
}

async function loadSpriteJson(at: Folder, file: string, maxFrames?: number): Promise<Sprite | undefined> {
  const json = await readJson(at, file)
  return json && keep(validateSprite(json.value, { file: at.label + file, ...(maxFrames === undefined ? {} : { maxFrames }) }), at.issues)
}

/** A PNG sheet, through the sheet loader. */
async function loadSheet(at: Folder, file: string, frames: number, sheet: { cacheKey: string; maxFrames?: number }): Promise<Sprite | undefined> {
  if (!at.sheets) return undefined
  let result: Validation<Sprite> | undefined
  try {
    result = await at.sheets({ path: `${at.root}/${file}`, file: at.label + file, frames, ...sheet })
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

  const desktopBackground =
    biome.desktopBackground && (await loadDesktopSheet(at, `biomes/${folder}`, biome.desktopBackground, 'desktopBackground', CONTENT.desktop.background, shownFile))
  const loaded = await loadBackground(at, folder, biome, shownFile)
  return desktopBackground ? { ...loaded, desktopBackground } : loaded
}

/** The biome with its terminal background, or without it when that didn't load. */
async function loadBackground(at: Folder, folder: string, biome: Biome, shownFile: string): Promise<LoadedBiome> {
  if (biome.background === undefined) return { biome, file: shownFile }
  const backgroundFile = `biomes/${folder}/${biome.background}`
  const backgroundJson = await readJson(at, backgroundFile)
  const background =
    backgroundJson && keep(validateSprite(backgroundJson.value, { file: at.label + backgroundFile, maxFrames: CONTENT.biome.backgroundFramesMax }), at.issues)
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
