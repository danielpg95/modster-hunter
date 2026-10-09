import type { EngineInterface, Register, Timer } from 'claude-code'
import { BAND } from './constants'
import { formatIssue, loadContent, type ContentReader, type ContentRegistry } from './content'
import {
  pickBiome,
  startEncounters,
  stepEncounter,
  type EncounterContext,
  type EncounterInput,
  type EncounterState,
} from './game'
import { bandView, spriteCells, type BandEncounter, type BandLine } from './render'

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

  on('session.start', async ($, e, next) => {
    content = await loadBuiltInContent($)
    // Keep the biome if session.start ever repeats in this process; pick only when there's none yet
    if (biomeId === undefined || !content.biomes.has(biomeId)) biomeId = pickBiome(content.biomes.keys(), Math.random)
    startMachine($, idleTimeoutSec)
    // Register last: a taken name throws and would skip the rest of this hook
    await $.command.register({ name: 'modsters', description: 'Open your Modster collection' })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await advanceMachine($, 'turnStart')
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await advanceMachine($, 'turnEnd')
    return next(e)
  })

  on('session.end', ($, e, next) => {
    stopTimers()
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
    return { text: biome ? `Modster Hunter is loaded · You're in ${biome.name}` : 'Modster Hunter is loaded · No biomes yet' }
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
 * Loads `plugin/content/` (P2-03; user content joins in P4-01). Problems go to
 * the debug log, not the transcript; the Settings tab will list them (P4-02).
 */
async function loadBuiltInContent($: EngineInterface): Promise<ContentRegistry> {
  const started = performance.now()
  const registry = await loadContent(fsReader($), `${$.plugin.root}/content`)
  const ms = Math.round(performance.now() - started)
  for (const issue of registry.issues) $.ui.log(formatIssue(issue), { to: 'debug' })
  const summary = `${registry.biomes.size} biomes, ${registry.modsters.size} Modsters, ${registry.issues.length} issues`
  $.ui.log(`content: ${summary} in ${ms} ms`, { to: 'debug' })
  return registry
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
