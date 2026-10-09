import type { EngineInterface, Register, Timer } from 'claude-code'
import { BAND, USER_CONTENT } from './constants'
import {
  cachedSheetLoader,
  formatIssue,
  loadAllContent,
  noBiomesMessage,
  type ContentReader,
  type ContentRegistry,
  type SheetFiles,
} from './content'
import {
  pickBiome,
  startEncounters,
  stepEncounter,
  type EncounterContext,
  type EncounterInput,
  type EncounterState,
} from './game'
import { bandView, spriteCells, type BandEncounter, type BandLine } from './render'
import { recordEncounterEvents, recordStat, type StorePort } from './store'

// Rebuilt at every session start; cheap, so it isn't kept in $.state (ARCHITECTURE.md)
let content: ContentRegistry | undefined
// The session's biome (decision 0006). /clear, /resume and /branch don't start a
// new process or reload the module, so it survives them as a module variable.
let biomeId: string | undefined

// The encounter loop (decisions 0005, 0014). Not persisted: a reload or a new
// session drops an encounter in progress without counting it (0005).
let machine: EncounterState | undefined
let machineContext: EncounterContext | undefined
let tickTimer: Timer | undefined

// Collection and stats (decision 0009). Writes run one after another so this
// session never races itself; each one re-reads its key first.
let sessionId = 'unknown'
let pendingWrites: Promise<void> = Promise.resolve()

// How issues and messages name the user's content folder (decision 0007)
const USER_FOLDER_LABEL = `~/${USER_CONTENT.contentFolder}/`

// Sprite animation: the mounted Raster is repainted in place with $.ui.blit (0012)
const SPRITE_KEY = 'sprite'
const cellsByModster = new Map<string, string[]>()
let frameTimer: Timer | undefined
let frameRequestId: string | undefined
let frameModsterId: string | undefined
let frameIndex = 0
let isBlitting = false

export const register: Register = (on, options) => {
  const idleTimeoutSec = typeof options.encounterIdleTimeoutSec === 'number' ? options.encounterIdleTimeoutSec : 90
  const showIdleLine = options.showIdleLine !== false
  const includeBuiltins = options.includeBuiltins !== false

  on('session.start', async ($, e, next) => {
    content = await loadGameContent($, includeBuiltins)
    if (content.biomes.size === 0) $.ui.toast(`Modster Hunter: ${noBiomesMessage(includeBuiltins, USER_FOLDER_LABEL)}`)
    sessionId = await $.session.id().catch(() => 'unknown')
    // Keep the biome if session.start ever repeats in this process; pick only when there's none yet
    if (biomeId === undefined || !content.biomes.has(biomeId)) biomeId = pickBiome(content.biomes.keys(), Math.random)
    startMachine($, idleTimeoutSec)
    // Register last: a taken name throws and would skip the rest of this hook
    await $.command.register({ name: 'modsters', description: 'Open your Modster collection' })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await advanceMachine($, 'turnStart')
    const at = await $.clock.now()
    queueWrite($, (store) => recordStat(store, sessionId, { kind: 'turn', at }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await advanceMachine($, 'turnEnd')
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    stopTimers()
    // Let queued writes land, within the 1.5 s session.end budget (ARCHITECTURE.md)
    await Promise.race([pendingWrites, $.clock.sleep(1000)])
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    // A survey owns the band while it's up
    if (e.props.hasSurvey) return next(e)
    const encounter = machine?.encounter
    const modster = encounter && content?.modsters.get(encounter.modsterId)
    const biome = biomeId === undefined ? undefined : content?.biomes.get(biomeId)?.biome

    const band: BandEncounter | undefined =
      encounter && modster
        ? {
            phase: encounter.phase,
            name: modster.modster.name,
            tier: encounter.tier,
            attemptsLeft: encounter.attemptsLeft,
            spriteWidth: modster.sprite.width,
            spriteHeight: modster.sprite.height,
            ...(encounter.outcome ? { outcome: encounter.outcome } : {}),
            ...(encounter.fledBecause ? { fledBecause: encounter.fledBecause } : {}),
          }
        : undefined
    const view = bandView({
      maxRows: e.props.maxRows,
      columns: e.props.bodyColumns,
      // Raster is terminal only (0012; Svg for the desktop app is P5-06)
      canDrawSprite: e.surface === 'terminal',
      showIdleLine,
      ...(band ? { encounter: band } : {}),
      ...(biome ? { biome: biome.accentColor ? { name: biome.name, accentColor: biome.accentColor } : { name: biome.name } } : {}),
    })

    if (view.kind !== 'full') stopFrames()
    if (view.kind === 'none') return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const line = (segments: BandLine, index: number) => (
      <Box key={`line-${index}`} flexDirection="row">
        {segments.map((segment, at) =>
          'button' in segment ? (
            <Button
              key="throw"
              label="Throw"
              hotkey="1"
              plain
              onPress={() => {
                void advanceMachine($, 'throw')
              }}
            />
          ) : (
            <Text
              key={`text-${at}`}
              wrap="truncate"
              {...(segment.bold ? { bold: true } : {})}
              {...(segment.dim ? { dimColor: true } : {})}
              {...(segment.color ? { color: segment.color } : {})}
            >
              {segment.text}
            </Text>
          ),
        )}
      </Box>
    )

    if (view.kind === 'idle') return line(view.line, 0)
    if (view.kind === 'compact') return <Box flexDirection="column">{view.lines.map(line)}</Box>

    // Full layout: the sprite, then the text block beside it. Only chosen on the
    // terminal (canDrawSprite); the check narrows the surface so Raster resolves
    if (e.surface !== 'terminal') return next(e)
    const { Raster } = $.ui.resolve(e)
    const cells = modster ? cellsFor(modster.modster.id, modster.sprite) : []
    if (modster && frameModsterId !== modster.modster.id) frameIndex = 0
    frameRequestId = e.requestId
    if (modster && cells.length > 1 && (!frameTimer || frameModsterId !== modster.modster.id)) {
      startFrames($, modster.modster.id, cells, modster.modster.sprite.fps ?? 6)
    }
    return (
      <Box flexDirection="row" columnGap={BAND.gapColumns}>
        <Raster key={SPRITE_KEY} columns={view.spriteColumns} rows={view.spriteRows} cells={cells[frameIndex] ?? cells[0] ?? ''} />
        <Box flexDirection="column">{view.lines.map(line)}</Box>
      </Box>
    )
  })

  on('command.run', { command: 'modsters' }, async () => {
    // Until the pane (P3-01), the command says where you are
    const biome = biomeId === undefined ? undefined : content?.biomes.get(biomeId)?.biome
    return {
      text: biome
        ? `Modster Hunter is loaded · You're in ${biome.name}`
        : `Modster Hunter is loaded · ${noBiomesMessage(includeBuiltins, USER_FOLDER_LABEL)}`,
    }
  })
}

function cellsFor(id: string, sprite: Parameters<typeof spriteCells>[0]): string[] {
  let cells = cellsByModster.get(id)
  if (!cells) {
    cells = spriteCells(sprite)
    cellsByModster.set(id, cells)
  }
  return cells
}

// Functions that take `$` live in this file: the engine follows `$` only into
// functions declared in the same file, never across an import (decision 0013).

/** Sets up the encounter machine for the session's biome and starts its tick. */
function startMachine($: EngineInterface, idleTimeoutSec: number): void {
  stopTimers()
  machine = undefined
  machineContext = undefined
  cellsByModster.clear()
  const biome = biomeId === undefined ? undefined : content?.biomes.get(biomeId)?.biome
  if (!content || !biome) return
  machineContext = {
    biome,
    modsters: new Map([...content.modsters].map(([id, loaded]) => [id, loaded.modster])),
    random: Math.random,
    idleTimeoutMs: idleTimeoutSec * 1000,
  }
  machine = startEncounters(machineContext)
  // Timers start in session.start, never at module top level (mod-code rule)
  tickTimer = $.clock.every(BAND.tickMs, () => {
    void advanceMachine($, 'tick')
  })
}

/** Steps the machine at the clock's now and redraws the band when anything changed. */
async function advanceMachine($: EngineInterface, type: EncounterInput['type']): Promise<void> {
  if (!machine || !machineContext) return
  const now = await $.clock.now()
  const step = stepEncounter(machine, { type, now }, machineContext)
  if (step.state === machine) return
  machine = step.state
  $.ui.invalidate('ui.render')
  const where = { sessionId, biomeId: machineContext.biome.id }
  if (step.events.length > 0) queueWrite($, (store) => recordEncounterEvents(store, where, step.events, now))
}

/** Runs a store write after the ones before it; a failure is logged, never thrown at the game. */
function queueWrite($: EngineInterface, write: (store: StorePort) => Promise<void>): void {
  const store: StorePort = {
    get: (key) => $.store.get(key),
    set: (key, value) => $.store.set(key, value),
  }
  pendingWrites = pendingWrites
    .then(() => write(store))
    .catch((error: unknown) => {
      $.ui.log(`store write failed: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
    })
}

/** Loops the sprite's frames at its fps, skipping a tick while the last blit is in flight (P1-03). */
function startFrames($: EngineInterface, modsterId: string, cells: string[], fps: number): void {
  frameTimer?.cancel()
  frameModsterId = modsterId
  frameTimer = $.clock.every(Math.max(1, Math.round(1000 / fps)), () => {
    if (!frameRequestId || isBlitting) return
    isBlitting = true
    frameIndex = (frameIndex + 1) % cells.length
    $.ui
      .blit({ requestId: frameRequestId, key: SPRITE_KEY, cells: cells[frameIndex] ?? '' })
      .catch(() => undefined)
      .finally(() => {
        isBlitting = false
      })
  })
}

function stopFrames(): void {
  frameTimer?.cancel()
  frameTimer = undefined
  frameRequestId = undefined
  frameModsterId = undefined
}

function stopTimers(): void {
  tickTimer?.cancel()
  tickTimer = undefined
  stopFrames()
}

/**
 * Loads built-in and user content, merged by id (decision 0007). Problems go
 * to the debug log, not the transcript; the Settings tab will list them (P4-02).
 */
async function loadGameContent($: EngineInterface, includeBuiltins: boolean): Promise<ContentRegistry> {
  const started = performance.now()
  const home = await homeFolder($)
  if (home === undefined) $.ui.log('content: no HOME or USERPROFILE, so user content is skipped', { to: 'debug' })
  const registry = await loadAllContent({
    reader: fsReader($),
    builtInRoot: `${$.plugin.root}/content`,
    includeBuiltins,
    ...(home === undefined
      ? {}
      : {
          user: {
            root: `${home}/${USER_CONTENT.contentFolder}`,
            label: USER_FOLDER_LABEL,
            sheets: cachedSheetLoader(sheetFiles($), `${home}/${USER_CONTENT.spriteCacheFolder}`),
          },
        }),
  })
  const ms = Math.round(performance.now() - started)
  for (const issue of registry.issues) $.ui.log(formatIssue(issue), { to: 'debug' })
  const summary = `${registry.biomes.size} biomes, ${registry.modsters.size} Modsters, ${registry.issues.length} issues`
  $.ui.log(`content: ${summary} in ${ms} ms`, { to: 'debug' })
  return registry
}

/** The home folder: HOME, or USERPROFILE on Windows. */
async function homeFolder($: EngineInterface): Promise<string | undefined> {
  // No home folder means no user content, never a failed session start
  const home = (await $.env.get('HOME').catch(() => undefined)) || (await $.env.get('USERPROFILE').catch(() => undefined))
  return home ? home.replace(/[\\/]+$/, '') : undefined
}

/** `$.fs` behind the PNG cache: decoded user sheets are written under the cache folder only (decision 0015). */
function sheetFiles($: EngineInterface): SheetFiles {
  return {
    async stat(path) {
      if (!(await $.fs.exists(path))) return undefined
      const stat = await $.fs.stat(path)
      return { size: stat.size, mtimeMs: stat.mtimeMs }
    },
    async readBytes(path) {
      const read = await $.fs.read(path, { as: 'bytes' })
      if (typeof read === 'string') throw new Error('was read as text')
      // Uint8Array.fromBase64 isn't in the es2023 lib the types target
      const binary = atob(read.base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return bytes
    },
    async readText(path) {
      if (!(await $.fs.exists(path))) return undefined
      const text = await $.fs.read(path)
      return typeof text === 'string' ? text : undefined
    },
    writeText: (path, text) => $.fs.write(path, text),
  }
}

/** `$.fs` behind the loader's reader: a missing folder or file is absent, not an error. */
function fsReader($: EngineInterface): ContentReader {
  return {
    async listFolders(path) {
      if (!(await $.fs.exists(path))) return []
      const entries = await $.fs.list(path)
      return entries.filter((entry) => entry.kind === 'dir').map((entry) => entry.name)
    },
    async readText(path) {
      if (!(await $.fs.exists(path))) return undefined
      const text = await $.fs.read(path)
      // Without `{ as: 'bytes' }` a read is always text
      return typeof text === 'string' ? text : undefined
    },
  }
}
