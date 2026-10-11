import type { EngineInterface, Register, Timer } from 'claude-code'
import { BAND, USER_CONTENT } from './constants'
import {
  cachedSheetLoader,
  formatIssue,
  loadAllContent,
  noBiomesMessage,
  type ContentReader,
  type ContentRegistry,
  type LoadedModster,
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
import { BAND_BUTTONS, bandView, displayPlan, paneHint, readDisplaySettings, spriteCells, type BandEncounter, type BandLine, type DisplayPlan } from './render'
import { HUNT_PANE_KEY, huntPanePref, isCaught, prefAfterClose, readHuntPaneOpen, recordEncounterEvents, recordStat, type StorePort } from './store'

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

// Sprite animation: each mounted Raster is repainted in place with $.ui.blit (0012).
// The band and the encounter pane (0015) are "sites"; each frame is blitted to every
// site drawing the sprite right now.
const SPRITE_KEY = 'sprite'
const cellsByModster = new Map<string, string[]>()
const spriteSites = new Set<string>() // requestIds
let frameTimer: Timer | undefined
let frameModster: LoadedModster | undefined
let frameIndex = 0
let isBlitting = false

// The opt-in encounter pane (decision 0015), opened with `/modsters hunt`; it
// reopens at session start for people who opened it (0019), or every session (0023)
const PANE_ID = 'modster-hunt'

// Where the game shows (0023). A change in /config reloads the module, so this is
// read once per load
let display = readDisplaySettings({})
// What the status line shows now, so a tick that changes nothing doesn't re-pin it
let shownStatus: string | undefined
/** The collection had the current Modster when it appeared (P5-10); read once per encounter */
let alreadyCaught = false
/** Bumped on every appearance, so a slow read never marks a later encounter */
let caughtCheck = 0

// Points people to the settings until the collection pane has its own (0023 point 7)
const CONFIG_HINT = ' · Change where the game shows in /config'

export const register: Register = (on, options) => {
  const idleTimeoutSec = typeof options.encounterIdleTimeoutSec === 'number' ? options.encounterIdleTimeoutSec : 90
  const showIdleLine = options.showIdleLine !== false
  const includeBuiltins = options.includeBuiltins !== false
  display = readDisplaySettings(options)

  on('session.start', async ($, e, next) => {
    content = await loadGameContent($, includeBuiltins)
    if (content.biomes.size === 0) $.ui.toast(`Modster Hunter: ${noBiomesMessage(includeBuiltins, USER_FOLDER_LABEL)}`)
    sessionId = await $.session.id().catch(() => 'unknown')
    // Keep the biome if session.start ever repeats in this process; pick only when there's none yet
    if (biomeId === undefined || !content.biomes.has(biomeId)) biomeId = pickBiome(content.biomes.keys(), Math.random)
    startMachine($, idleTimeoutSec)
    // Clears a line left by a load that had the status line on (0023 point 6)
    shownStatus = undefined
    $.ui.status(undefined)
    await openHuntPaneAtStart($)
    // Register last: a taken name throws and would skip the rest of this hook
    await $.command.register({ name: 'modsters', description: 'Open your Modster collection' })
    return next(e)
  })

  // /clear, /resume and /branch don't fire session.start; keep the pane for them too (0019)
  on('classic.SessionStart', async ($, e, next) => {
    if (e.source !== 'startup') await openHuntPaneAtStart($)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await advanceMachine($, { type: 'turnStart' })
    const at = await $.clock.now()
    queueWrite($, (store) => recordStat(store, sessionId, { kind: 'turn', at }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await advanceMachine($, { type: 'turnEnd' })
    return next(e)
  })

  // Background subagents count as work time, so Modsters can appear while you wait on them (0018)
  on('classic.SubagentStart', async ($, e, next) => {
    await advanceMachine($, { type: 'agentStart', agentId: e.agent_id })
    return next(e)
  })

  on('classic.SubagentStop', async ($, e, next) => {
    await advanceMachine($, { type: 'agentStop', agentId: e.agent_id })
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await advanceMachine($, { type: 'sessionEnd' })
    stopTimers()
    shownStatus = undefined
    $.ui.status(undefined)
    // Let queued writes land, within the 1.5 s session.end budget (ARCHITECTURE.md)
    await Promise.race([pendingWrites, $.clock.sleep(1000)])
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // A survey owns the band while it's up
    if (e.props.hasSurvey) return next(e)
    // While the encounter pane is on screen the band steps aside, so the same
    // encounter isn't drawn twice (0015)
    if (await isPaneShown($)) {
      removeSite(e.requestId)
      return next(e)
    }
    const modster = currentModster()
    const biome = biomeId === undefined ? undefined : content?.biomes.get(biomeId)?.biome
    const band = currentEncounter()
    const view = bandView({
      maxRows: e.props.maxRows,
      columns: e.props.bodyColumns,
      // Raster is terminal only (0012; Svg for the desktop app is P5-06)
      canDrawSprite: e.surface === 'terminal',
      showIdleLine,
      // The band turned off still keeps Throw on screen during an encounter (0023 point 3)
      ...(currentPlan().band === 'one-row' ? { oneRow: true } : {}),
      // The caught mark is the band's alone (P5-10); the pane draws the encounter without it
      ...(band ? { encounter: alreadyCaught ? { ...band, alreadyCaught: true } : band } : {}),
      ...(biome ? { biome: biome.accentColor ? { name: biome.name, accentColor: biome.accentColor } : { name: biome.name } } : {}),
    })

    if (view.kind !== 'full') removeSite(e.requestId)
    if (view.kind === 'none') return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const line = (segments: BandLine, index: number) => (
      <Box key={`line-${index}`} flexDirection="row">
        {segments.map((segment, at) =>
          'button' in segment ? (
            <Button
              key={segment.button}
              label={BAND_BUTTONS[segment.button].label}
              hotkey={BAND_BUTTONS[segment.button].hotkey}
              plain
              onPress={() => {
                void advanceMachine($, { type: segment.button })
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
    const cells = modster ? cellsFor(modster) : []
    if (modster) addSite($, e.requestId, modster)
    return (
      <Box flexDirection="row" columnGap={BAND.gapColumns}>
        <Raster key={SPRITE_KEY} columns={view.spriteColumns} rows={view.spriteRows} cells={cells[frameIndex] ?? cells[0] ?? ''} />
        <Box flexDirection="column">{view.lines.map(line)}</Box>
      </Box>
    )
  })

  // The same encounter in a pane the person opens (0015). It docks beside the
  // transcript in fullscreen from 110 columns, else sits inline above the prompt.
  on('ui.render', { component: 'Pane' }, ($, e, next) => {
    if (e.requestId !== PANE_ID) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const modster = currentModster()
    const encounter = currentEncounter()
    const biome = biomeId === undefined ? undefined : content?.biomes.get(biomeId)?.biome
    const rows = Math.max(0, e.props.scroll.bodyRows - 2) // header and a blank line
    const columns = e.props.bodyColumns

    const biomeName = biome ? biome.name : 'No biome'
    const working = workingLabel(machine)
    // How to move the keys between the prompt and the pane (0024 point 4)
    const hint = paneHint({ isFocused: e.props.isFocused, placement: e.props.placement, columns: columns - biomeName.length - working.length })
    const header = (
      <Box key="header" flexDirection="row">
        <Text bold {...(biome?.accentColor ? { color: biome.accentColor } : {})}>
          {biomeName}
        </Text>
        <Text dimColor>{working}</Text>
        {hint ? (
          <Text key="hint" dimColor>
            {hint}
          </Text>
        ) : null}
      </Box>
    )
    if (!encounter || !modster) {
      removeSite(e.requestId)
      return (
        <Box flexDirection="column">
          {header}
          <Text key="gap"> </Text>
          <Text key="idle" dimColor>
            Listening for Modsters… they appear while Claude works.
          </Text>
        </Box>
      )
    }

    // The sprite's normal size, as in the band: 2x looked far too big in a real terminal (0015)
    const fits = () => Math.ceil(modster.sprite.height / 2) <= rows && modster.sprite.width + BAND.gapColumns + BAND.textColumns <= columns
    const view = bandView({
      maxRows: rows,
      columns,
      canDrawSprite: e.surface === 'terminal' && fits(),
      showIdleLine: false,
      encounter,
    })
    const line = (segments: BandLine, index: number) => (
      <Box key={`line-${index}`} flexDirection="row">
        {segments.map((segment, at) =>
          'button' in segment ? (
            <Button
              key={segment.button}
              label={BAND_BUTTONS[segment.button].label}
              hotkey={BAND_BUTTONS[segment.button].hotkey}
              plain
              onPress={() => {
                void advanceMachine($, { type: segment.button })
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
    if (view.kind !== 'full' || e.surface !== 'terminal') {
      removeSite(e.requestId)
      const lines = view.kind === 'compact' ? view.lines : []
      return (
        <Box flexDirection="column">
          {header}
          {lines.map(line)}
        </Box>
      )
    }
    const { Raster } = $.ui.resolve(e)
    const cells = cellsFor(modster)
    addSite($, e.requestId, modster)
    return (
      <Box flexDirection="column">
        {header}
        <Text key="gap"> </Text>
        <Box key="encounter" flexDirection="row" columnGap={BAND.gapColumns}>
          <Raster key={SPRITE_KEY} columns={view.spriteColumns} rows={view.spriteRows} cells={cells[frameIndex] ?? cells[0] ?? ''} />
          <Box flexDirection="column">{view.lines.map(line)}</Box>
        </Box>
      </Box>
    )
  })

  // The spinner names the Modster while Claude works (0023 point 5). Subagents'
  // rows keep their own words; their requestId is the agent id
  on('ui.render', { component: 'Spinner' }, ($, e, next) => {
    const message = currentPlan().spinner
    if (message === undefined || (machine && e.requestId in machine.agents)) return next(e)
    // An empty suffix: the engine's ellipsis would follow "Caught Sproutling!"
    return next({ ...e, props: { ...e.props, message, suffix: '' } })
  })

  // When the pane closes, the band takes the encounter back (0015). Only a close
  // by hand stops the reopening; ours and an unload change nothing (0019)
  on('ui.close', async ($, e, next) => {
    const result = await next(e)
    const pref = e.id === PANE_ID ? prefAfterClose(e.origin.kind) : undefined
    if (pref) queueWrite($, (store) => store.set(HUNT_PANE_KEY, pref))
    $.ui.invalidate('ui.render')
    return result
  })

  on('command.run', { command: 'modsters' }, async ($, e) => {
    // `/modsters hunt` opens the encounter pane; the mod opens it by itself only to reopen it (0015, 0019)
    const verb = typeof e.args === 'string' ? e.args.trim() : ''
    if (verb === 'hunt') {
      if (display.encounterPane === 'off') return { text: 'The encounter pane is off · turn it on in /config' }
      queueWrite($, (store) => store.set(HUNT_PANE_KEY, huntPanePref(true)))
      // The person asked for it, so the pane takes the keys; granted only over an empty composer (0024)
      const opened = await $.ui.open({ id: PANE_ID, title: 'Modster Hunter', focus: true })
      // The band redraws without the encounter now that the pane shows it
      $.ui.invalidate('ui.render')
      return opened.isPlaced ? {} : { text: 'Modster Hunter: the pane is waiting for more room (widen the terminal)' }
    }
    // Until the collection pane (P3-01), the command says where you are
    const biome = biomeId === undefined ? undefined : content?.biomes.get(biomeId)?.biome
    return {
      text: biome
        ? `Modster Hunter is loaded · You're in ${biome.name}${CONFIG_HINT}`
        : `Modster Hunter is loaded · ${noBiomesMessage(includeBuiltins, USER_FOLDER_LABEL)}${CONFIG_HINT}`,
    }
  })
}

function cellsFor(loaded: LoadedModster): string[] {
  let cells = cellsByModster.get(loaded.modster.id)
  if (!cells) {
    cells = spriteCells(loaded.sprite)
    cellsByModster.set(loaded.modster.id, cells)
  }
  return cells
}

function currentModster(): LoadedModster | undefined {
  const encounter = machine?.encounter
  return encounter && content?.modsters.get(encounter.modsterId)
}

/** The encounter as the band, pane, spinner and status line draw it. */
function currentEncounter(): BandEncounter | undefined {
  const encounter = machine?.encounter
  const modster = currentModster()
  if (!encounter || !modster) return undefined
  return {
    phase: encounter.phase,
    name: modster.modster.name,
    tier: encounter.tier,
    attemptsLeft: encounter.attemptsLeft,
    spriteWidth: modster.sprite.width,
    spriteHeight: modster.sprite.height,
    ...(encounter.outcome ? { outcome: encounter.outcome } : {}),
    ...(encounter.fledBecause ? { fledBecause: encounter.fledBecause } : {}),
  }
}

function currentPlan(): DisplayPlan {
  const encounter = currentEncounter()
  return displayPlan(display, { turnRunning: machine?.turnRunning ?? false, ...(encounter ? { encounter } : {}) })
}

// Functions that take `$` live in this file: the engine follows `$` only into
// functions declared in the same file, never across an import (decision 0013).

/** Sets up the encounter machine for the session's biome and starts its tick. */
function startMachine($: EngineInterface, idleTimeoutSec: number): void {
  stopTimers()
  machine = undefined
  machineContext = undefined
  alreadyCaught = false
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
    void advanceMachine($, { type: 'tick' })
  })
}

/** The pane header's note on what's running; ticks drop agents past their cap within `BAND.tickMs`. */
function workingLabel(state: EncounterState | undefined): string {
  if (state?.turnRunning) return ' · Claude is working'
  if (state && Object.keys(state.agents).length > 0) return ' · agents are working'
  return ' · waiting for work'
}

/** An encounter input before the clock stamps it (distributes over the union, so `agentId` stays). */
type MachineAction = EncounterInput extends infer I ? (I extends { now: number } ? Omit<I, 'now'> : never) : never

/** Steps the machine at the clock's now and redraws the band when anything changed. */
async function advanceMachine($: EngineInterface, action: MachineAction): Promise<void> {
  if (!machine || !machineContext) return
  const now = await $.clock.now()
  const step = stepEncounter(machine, { ...action, now } as EncounterInput, machineContext)
  if (step.state === machine) return
  machine = step.state
  $.ui.invalidate('ui.render')
  updateStatus($)
  const where = { sessionId, biomeId: machineContext.biome.id }
  if (step.events.length > 0) queueWrite($, (store) => recordEncounterEvents(store, where, step.events, now))
  const appeared = step.events.find((event) => event.type === 'appeared')
  if (appeared) checkAlreadyCaught($, appeared.modsterId)
}

/**
 * Reads whether the collection has `modsterId`, once, as it appears (P5-10).
 * Queued after earlier writes so the last encounter's catch counts; a catch in
 * this encounter doesn't add the mark until the next one.
 */
function checkAlreadyCaught($: EngineInterface, modsterId: string): void {
  alreadyCaught = false
  const check = ++caughtCheck
  queueWrite($, async (store) => {
    const caught = await isCaught(store, modsterId)
    if (!caught || check !== caughtCheck) return
    alreadyCaught = true
    $.ui.invalidate('ui.render')
  })
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

/** Notes that `requestId` draws the sprite, and keeps the frame loop running for it. */
function addSite($: EngineInterface, requestId: string, loaded: LoadedModster): void {
  spriteSites.add(requestId)
  if (frameModster?.modster.id !== loaded.modster.id) {
    frameIndex = 0
    frameModster = loaded
    frameTimer?.cancel()
    frameTimer = undefined
  }
  if (frameTimer || loaded.sprite.frames.length < 2) return
  frameTimer = $.clock.every(Math.max(1, Math.round(1000 / (loaded.modster.sprite.fps ?? 6))), () => {
    const current = frameModster
    // Skip a tick while the last blits are in flight (P1-03)
    if (!current || isBlitting || spriteSites.size === 0) return
    isBlitting = true
    frameIndex = (frameIndex + 1) % current.sprite.frames.length
    const blits = [...spriteSites].map((site) =>
      $.ui.blit({ requestId: site, key: SPRITE_KEY, cells: cellsFor(current)[frameIndex] ?? '' }).catch(() => undefined),
    )
    void Promise.all(blits).finally(() => {
      isBlitting = false
    })
  })
}

/** Pins the status line the plan asks for (0023 point 6); undefined clears it. */
function updateStatus($: EngineInterface): void {
  const text = currentPlan().status
  if (text === shownStatus) return
  shownStatus = text
  $.ui.status(text)
}

/**
 * Opens the encounter pane at session start as `encounterPane` says (0023 point 4):
 * `when-opened` reopens it when the person left it open (0019), `always` opens it
 * every session, `off` closes one left open. Never asks for focus; under 110
 * columns it waits unplaced and the band keeps the encounter.
 */
async function openHuntPaneAtStart($: EngineInterface): Promise<void> {
  try {
    if (display.encounterPane === 'off') {
      // Our close, so prefs:huntPane is kept for when the setting comes back (0019 point 2)
      if ((await $.ui.panes()).some((pane) => pane.id === PANE_ID)) await $.ui.close({ id: PANE_ID })
      return
    }
    if (display.encounterPane === 'when-opened') {
      // A close by hand may still be queued
      await pendingWrites
      if (!readHuntPaneOpen(await $.store.get(HUNT_PANE_KEY))) return
    }
    const opened = await $.ui.open({ id: PANE_ID, title: 'Modster Hunter' })
    if (opened.isPlaced) $.ui.invalidate('ui.render')
  } catch (error) {
    $.ui.log(`hunt pane: not opened at start: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** Whether our encounter pane is open, placed and the shown tab. Unknown counts as no. */
async function isPaneShown($: EngineInterface): Promise<boolean> {
  try {
    return (await $.ui.panes()).some((pane) => pane.id === PANE_ID && pane.isShown && pane.isPlaced)
  } catch {
    return false
  }
}

function removeSite(requestId: string): void {
  spriteSites.delete(requestId)
  if (spriteSites.size === 0) stopFrames()
}

function stopFrames(): void {
  frameTimer?.cancel()
  frameTimer = undefined
  frameModster = undefined
  spriteSites.clear()
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

/** `$.fs` behind the PNG cache: decoded user sheets are written under the cache folder only (decision 0016). */
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
