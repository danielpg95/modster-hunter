import type { EngineInterface, Register, Timer } from 'claude-code'
import { BAND, CATCH, COLLECTION, CONTENT, DESKTOP, USER_CONTENT, WELCOME_TOAST_MS } from './constants'
import {
  cachedSheetLoader,
  formatIssue,
  leavesNoBiome,
  loadAllContent,
  noBiomesMessage,
  toggleDisabled,
  type ContentReader,
  type ContentRegistry,
  type LoadedBiome,
  type LoadedCatcher,
  type LoadedModster,
  type Sprite,
  type MergedContent,
  type SheetFiles,
  type ToggleChange,
} from './content'
import {
  pickBiome,
  startEncounters,
  stepEncounter,
  throwingMs,
  type CatchOutcome,
  type EncounterContext,
  type EncounterInput,
  type EncounterState,
} from './game'
import {
  BAND_BUTTONS,
  COLLECTION_TABS,
  bandView,
  biomeEntries,
  biomeRow,
  biomesBody,
  catchDots,
  catchFrame,
  catcherEntries,
  catcherRow,
  previewModsterId,
  pixelsToCells,
  prepareCatch,
  oddsRow,
  tierRow,
  tierSections,
  collectionBody,
  collectionEntries,
  collectionLayout,
  detailLines,
  listRow,
  listWindow,
  moreText,
  silhouettePalette,
  displayPlan,
  idleScene,
  isAnimated,
  makeParticles,
  paneHint,
  readDisplaySettings,
  sceneCells,
  settingsLines,
  pixelsToSvg,
  spriteCells,
  spriteRgba,
  statsLines,
  TOGGLE_HOTKEY,
  itemNotes,
  toggleLabel,
  type BandEncounter,
  type BandLine,
  type BiomeEntry,
  type CatchArt,
  type CatcherEntry,
  type CollectionEntry,
  type CollectionTab,
  type DisplayPlan,
  type IdleScene,
  type Particle,
  MODSTERS_ARGUMENT_HINT,
  PANE_OFF_REPLY,
  SETTING_SPECS,
  STOP_REPLY,
  nextSettingValue,
  readSettingValues,
  settingDeniedText,
  settingRow,
  type SettingField,
  type SettingValue,
  type SettingValues,
  autoStartDeniedReply,
  helpText,
  huntReply,
  unknownSubcommandText,
  welcomeText,
} from './render'
import {
  CATCHER_KEY,
  HUNT_PANE_KEY,
  WELCOMED_KEY,
  readWelcomed,
  welcomedPref,
  catcherInUse,
  catcherPref,
  caughtKey,
  compactStats,
  huntPanePref,
  isCaught,
  prefAfterClose,
  readCaughtRecord,
  readCatcherId,
  readHuntPaneOpen,
  recordEncounterEvents,
  recordStat,
  type CaughtRecord,
  type SessionStats,
  type StatsStorePort,
} from './store'

// Rebuilt at every session start; cheap, so it isn't kept in $.state (ARCHITECTURE.md)
let content: MergedContent | undefined
// The session's biome (decision 0006). /clear, /resume and /branch don't start a
// new process or reload the module, so it survives them as a module variable.
let biomeId: string | undefined
// After a reload that dropped the session's biome, its old copy plays on until the
// encounter in progress ends; then a new biome is picked (P4-02)
let retiredBiome: LoadedBiome | undefined
// A reload in progress, so a second /modsters reload waits on it instead of racing it
let reloading: Promise<Reloaded> | undefined
// Turning items off and on (decision 0032), one at a time: each reads settings.json after the last wrote it
let toggling: Promise<void> = Promise.resolve()

// The encounter loop (decisions 0005, 0014). Not persisted: a reload or a new
// session drops an encounter in progress without counting it (0005).
let machine: EncounterState | undefined
let machineContext: EncounterContext | undefined
let tickTimer: Timer | undefined
// The Modster as it loaded when it appeared, so a reload leaves the encounter as it was (P4-02)
let encounterModster: LoadedModster | undefined

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
// Keyed by id, checked against the sprite it was made from: a reload may change a sprite
const cellsByModster = new Map<string, { sprite: LoadedModster['sprite']; cells: string[] }>()
const svgByModster = new Map<string, { sprite: LoadedModster['sprite']; svg: string }>()
const spriteSites = new Set<string>() // requestIds
let frameTimer: Timer | undefined
let frameModster: LoadedModster | undefined
let frameIndex = 0
let isBlitting = false

// The catch animation (decision 0035): while a throw plays, its frames are blitted to
// the same sprite sites at CATCH.fps, and the Modster's idle loop waits. The throw
// keeps the catcher it started with. With no catcher drawn (none loaded, or one too
// big for the sprite area) the Modster holds still and the text tells the throw (0035 point 8).
// The picked catcher's id from `prefs:catcher`, read at session start (point 9)
let pickedCatcherId: string | undefined
// Keyed by catcher and Modster id, checked against what they were made from: a reload may change either
const catchArts = new Map<string, { catcher: LoadedCatcher; modster: LoadedModster; art: CatchArt }>()
// The throw as a dot count for the text (point 7), kept current by the tick
let shownDots: string | undefined
let catchPlay: { art: CatchArt; outcome: CatchOutcome; rocks: number; throwAt: number; endsAt: number } | undefined
let catchCells: string | undefined
let catchTimer: Timer | undefined
let isBlittingCatch = false

// The biome's idle scene between encounters (decision 0026). The band is its only
// site; it moves only while Claude works and holds still otherwise (point 5).
const SCENE_KEY = 'scene'
let scene: IdleScene | undefined
const particlesByColumns = new Map<number, Particle[]>()
const sceneSites = new Map<string, number>() // requestId → columns
let sceneTimer: Timer | undefined
let sceneTick = 0
let isBlittingScene = false
// Why the band last skipped the scene, so the debug log notes each change once
let loggedSceneSkip: string | undefined

// The opt-in encounter pane (decision 0015), opened with `/modsters pane` (0038); it
// reopens at session start for people who opened it (0019), or every session (0023)
const PANE_ID = 'modster-hunt'

// Where the game shows (0023). A change in /config reloads the module, so this is
// read once per load
let display = readDisplaySettings({})
// Whether the game runs (decision 0038): the `autoStart` option at load, then what
// /modsters hunt and stop wrote. While false, nothing draws outside /modsters
let hunting = false
// The options as the Settings tab shows them (decision 0040): read at load, then
// what the tab, /modsters hunt and stop wrote
let settingValues: SettingValues = readSettingValues({})
// The Settings tab's selected row
let settingsSelected: SettingField = 'autoStart'
// An idle timeout changed during an encounter waits for the next one (0040 point 5)
let pendingIdleTimeoutMs: number | undefined
// Options the Settings tab changes in place (0040 point 5); read from the load's options in register
let idleTimeoutSec = 90
let showIdleLine = true
let showIdleScene = true
let includeBuiltins = true
// The `includeBuiltins` option, for messages outside register's closure
let builtinsIncluded = true
// What the status line shows now, so a tick that changes nothing doesn't re-pin it
let shownStatus: string | undefined
/** The collection had the current Modster when it appeared (P5-10); read once per encounter */
let alreadyCaught = false
/** Bumped on every appearance, so a slow read never marks a later encounter */
let caughtCheck = 0

// The collection pane (decision 0002, P3-01), opened with `/modsters`. Separate from
// the encounter pane (0015); Esc closes it
const COLLECTION_PANE_ID = 'modster-collection'
// The tab it shows; kept while the module lives, so a reopened pane shows the last one
let collectionTab: CollectionTab = 'collection'
// The Collection tab (P3-02). Render hooks can't wait on $.store, so the records are
// read into memory at session start, when /modsters opens the pane, and after a catch
const collectionRecords = new Map<string, CaughtRecord>()
// The selected Modster's id; kept across tab switches like the tab
let collectionSelected: string | undefined
// The Biomes tab's selection (P3-03); none yet means the session's biome
let biomesSelected: string | undefined
// The Stats tab (P3-04): every session's counts summed, read when the tab shows.
// Undefined until the first read finishes
let statsShown: { stats: SessionStats | undefined } | undefined
// Its sprite animates on a loop of its own: the encounter's loop follows the encounter's Modster
const COLLECTION_SPRITE_KEY = 'collection-sprite'
// The Catchers tab (P5-30): its selection, none yet meaning the catcher in use, and
// a preview that loops a catch on its own timer while the tab shows it
let catchersSelected: string | undefined
const CATCHER_PREVIEW_KEY = 'catcher-preview'
let catcherPreview: { requestId: string; key: string; catcher: LoadedCatcher; sprite: Sprite; art: CatchArt; tick: number; cells: string } | undefined
let catcherPreviewTimer: Timer | undefined
let isBlittingPreview = false
const silhouettes = new Map<string, string>()
let collectionSite: string | undefined
let collectionSpriteModster: LoadedModster | undefined
let collectionFrame = 0
let collectionTimer: Timer | undefined
let isBlittingCollection = false
// The Biomes tab's scene (0028): the selected biome's, on a timer of its own that
// runs whenever the tab draws it, apart from the band's (0026 point 5)
const BIOMES_SCENE_KEY = 'biomes-scene'
const biomeScenes = new Map<string, IdleScene | undefined>()
let biomesSceneSite: { requestId: string; biomeId: string; scene: IdleScene; columns: number; particles: Particle[] } | undefined
let biomesSceneTimer: Timer | undefined
let biomesSceneTick = 0
let isBlittingBiomesScene = false

export const register: Register = (on, options) => {
  idleTimeoutSec = typeof options.encounterIdleTimeoutSec === 'number' ? options.encounterIdleTimeoutSec : 90
  showIdleLine = options.showIdleLine !== false
  showIdleScene = options.showIdleScene !== false
  includeBuiltins = options.includeBuiltins !== false
  settingValues = readSettingValues(options)
  builtinsIncluded = includeBuiltins
  display = readDisplaySettings(options)
  // On unless the player turned it off (decision 0041)
  hunting = options.autoStart !== false

  on('session.start', async ($, e, next) => {
    content = await loadGameContent($, includeBuiltins)
    biomeScenes.clear()
    if (content.biomes.size === 0) $.ui.toast(`Modster Hunter: ${noBiomesMessage(includeBuiltins, USER_FOLDER_LABEL)}`)
    sessionId = await $.session.id().catch(() => 'unknown')
    // A reload (a /config change, 0040) drops module variables; $.state keeps the session's view
    await restoreSessionState($)
    // Keep the biome if session.start ever repeats in this process; pick only when there's none yet
    if (biomeId === undefined || !content.biomes.has(biomeId)) biomeId = pickBiome(content.biomes.keys(), Math.random)
    if (biomeId !== undefined) await keepState($, 'biomeId', biomeId)
    pickedCatcherId = readCatcherId(await $.store.get(CATCHER_KEY).catch(() => undefined))
    await welcome($)
    if (hunting) startMachine($, idleTimeoutSec)
    loadCollectionRecords($)
    // Clears a line left by a load that had the status line on (0023 point 6)
    shownStatus = undefined
    $.ui.status(undefined)
    // The encounter pane waits for hunting too; one left open is closed (0038 point 1)
    if (hunting) await openHuntPaneAtStart($)
    else await closeHuntPane($)
    // Register last: a taken name throws and would skip the rest of this hook. Immediate, so it
    // runs while Claude works, when people play; the command.run hook never reads the turn (0039)
    await $.command.register({ name: 'modsters', description: 'Open your Modster collection', argumentHint: MODSTERS_ARGUMENT_HINT, immediate: true })
    return next(e)
  })

  // /clear, /resume and /branch don't fire session.start; keep the pane for them too (0019)
  on('classic.SessionStart', async ($, e, next) => {
    if (e.source !== 'startup' && hunting) {
      // They do fire session.end, which stopped the timers: start the game again
      // on the same biome, under the new session id (P5-15)
      if (!tickTimer && content) {
        sessionId = await $.session.id().catch(() => 'unknown')
        startMachine($, idleTimeoutSec)
        shownStatus = undefined
        $.ui.status(undefined)
        $.ui.invalidate('ui.render')
      }
      await openHuntPaneAtStart($)
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    // No turn stats while the game is off (0038 point 1)
    if (!hunting) return next(e)
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
    // The game is off: the band is the prompt's alone (0038 point 1)
    if (!hunting) {
      removeSite(e.requestId)
      removeSceneSite(e.requestId)
      return next(e)
    }
    // While the encounter pane is on screen the band steps aside, so the same
    // encounter isn't drawn twice (0015)
    if (await isPaneShown($)) {
      removeSite(e.requestId)
      removeSceneSite(e.requestId)
      return next(e)
    }
    const modster = currentModster()
    const biome = sessionBiome()?.biome
    const band = markedEncounter()
    const view = bandView({
      maxRows: e.props.maxRows,
      columns: e.props.bodyColumns,
      // Raster is terminal only (0012; Svg for the desktop app is P5-06)
      canDrawSprite: e.surface === 'terminal',
      showIdleLine,
      // The band turned off still keeps Throw on screen during an encounter (0023 point 3)
      ...(currentPlan().band === 'one-row' ? { oneRow: true } : {}),
      ...(band ? { encounter: band } : {}),
      ...(biome ? { biome: biome.accentColor ? { name: biome.name, accentColor: biome.accentColor } : { name: biome.name } } : {}),
      ...(scene && showIdleScene ? { sceneRows: scene.rows } : {}),
    })

    if (view.kind !== 'full') removeSite(e.requestId)
    if (view.kind !== 'scene') removeSceneSite(e.requestId)
    if (scene && showIdleScene && view.kind === 'idle') {
      const skip = `idle scene: not drawn (surface ${e.surface}, band ${e.props.maxRows} rows, scene needs ${scene.rows + 1})`
      if (skip !== loggedSceneSkip) {
        loggedSceneSkip = skip
        $.ui.log(skip, { to: 'debug' })
      }
    }
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
    if (view.kind === 'scene') {
      // Chosen only on the terminal (canDrawSprite); the check narrows the surface so Raster resolves
      if (e.surface !== 'terminal') return line(view.line, 0)
      const { Raster } = $.ui.resolve(e)
      const columns = e.props.bodyColumns
      addSceneSite($, e.requestId, columns)
      return (
        <Box flexDirection="column">
          <Raster key={SCENE_KEY} columns={columns} rows={view.sceneRows} cells={sceneCellsFor(columns)} />
          {line(view.line, 0)}
        </Box>
      )
    }
    if (view.kind === 'compact') return <Box flexDirection="column">{view.lines.map(line)}</Box>

    // Full layout: the sprite, then the text block beside it. Only chosen on the
    // terminal (canDrawSprite); the check narrows the surface so Raster resolves
    if (e.surface !== 'terminal') return next(e)
    const { Raster } = $.ui.resolve(e)
    const cells = modster ? cellsFor(modster) : []
    if (modster) addSite($, e.requestId, modster)
    return (
      <Box flexDirection="row" columnGap={BAND.gapColumns}>
        <Raster key={SPRITE_KEY} columns={view.spriteColumns} rows={view.spriteRows} cells={catchCells ?? cells[frameIndex] ?? cells[0] ?? ''} />
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
    const encounter = markedEncounter()
    const biome = sessionBiome()?.biome
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
      const idleText = (
        <Text key="idle" dimColor>
          Listening for Modsters… they appear while Claude works.
        </Text>
      )
      // The scene above the idle text, by the band's rule on the pane's rows (0027)
      const idleView = bandView({
        maxRows: rows,
        columns,
        canDrawSprite: e.surface === 'terminal',
        showIdleLine: true,
        biome: { name: biomeName },
        ...(scene && showIdleScene ? { sceneRows: scene.rows } : {}),
      })
      if (idleView.kind === 'scene' && e.surface === 'terminal') {
        const { Raster } = $.ui.resolve(e)
        addSceneSite($, e.requestId, columns)
        return (
          <Box flexDirection="column">
            {header}
            <Text key="gap"> </Text>
            <Raster key={SCENE_KEY} columns={columns} rows={idleView.sceneRows} cells={sceneCellsFor(columns)} />
            {idleText}
          </Box>
        )
      }
      removeSceneSite(e.requestId)
      if (scene && showIdleScene) {
        const skip = `idle scene: not drawn in the pane (surface ${e.surface}, ${rows} rows, scene needs ${scene.rows + 1})`
        if (skip !== loggedSceneSkip) {
          loggedSceneSkip = skip
          $.ui.log(skip, { to: 'debug' })
        }
      }
      return (
        <Box flexDirection="column">
          {header}
          <Text key="gap"> </Text>
          {idleText}
        </Box>
      )
    }

    removeSceneSite(e.requestId)
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
    if (e.surface === 'desktop') {
      // P5-06 spike: the Desktop Code tab has Svg but no Raster; the text keeps the compact layout
      removeSite(e.requestId)
      const { Svg } = $.ui.resolve(e)
      const lines = view.kind === 'compact' ? view.lines : []
      return (
        <Box flexDirection="column">
          {header}
          <Svg source={svgFor(modster)} alt={modster.modster.name} isInteractive />
          {lines.map(line)}
        </Box>
      )
    }
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
          <Raster key={SPRITE_KEY} columns={view.spriteColumns} rows={view.spriteRows} cells={catchCells ?? cells[frameIndex] ?? cells[0] ?? ''} />
          <Box flexDirection="column">{view.lines.map(line)}</Box>
        </Box>
      </Box>
    )
  })

  // The collection pane (P3-01): tabs on hotkeys 1–5, which fire while the pane
  // holds the keys. Inline the tabs share the header row when they fit; docked
  // they get a row, or a row each when the dock is narrow
  on('ui.render', { component: 'Pane' }, ($, e, next) => {
    if (e.requestId !== COLLECTION_PANE_ID) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const biome = sessionBiome()?.biome
    const title = biome ? biome.name : 'No biome'
    const layout = collectionLayout({
      placement: e.props.placement,
      isFocused: e.props.isFocused,
      columns: e.props.bodyColumns,
      titleColumns: title.length,
    })
    const tabButtons = COLLECTION_TABS.map((tab) => (
      <Button
        key={tab.id}
        label={tab.label}
        hotkey={tab.hotkey}
        plain
        {...(tab.id === collectionTab ? {} : { dimColor: true })}
        onPress={() => {
          if (tab.id === 'stats' && collectionTab !== 'stats') loadStats($)
          collectionTab = tab.id
          void keepState($, 'paneTab', tab.id)
          $.ui.invalidate('ui.render')
        }}
      />
    ))
    const tabs =
      layout.tabs === 'column' ? (
        <Box key="tabs" flexDirection="column">
          {tabButtons}
        </Box>
      ) : (
        <Box key="tabs" flexDirection="row" columnGap={COLLECTION.tabGapColumns}>
          {tabButtons}
        </Box>
      )
    const header = (
      <Box key="header" flexDirection="row">
        <Text key="title" bold {...(biome?.accentColor ? { color: biome.accentColor } : {})}>
          {title}
        </Text>
        {layout.tabs === 'beside' ? <Text key="tabs-gap">{' '.repeat(COLLECTION.tabGapColumns)}</Text> : null}
        {layout.tabs === 'beside' ? tabs : null}
        {layout.hint ? (
          <Text key="hint" dimColor>
            {layout.hint}
          </Text>
        ) : null}
      </Box>
    )
    const texts = (line: BandLine, wrap: 'wrap' | 'truncate') =>
      line.map((segment, at) =>
        'text' in segment ? (
          <Text
            key={`text-${at}`}
            wrap={wrap}
            {...(segment.bold ? { bold: true } : {})}
            {...(segment.dim ? { dimColor: true } : {})}
            {...(segment.color ? { color: segment.color } : {})}
          >
            {segment.text}
          </Text>
        ) : null,
      )
    const tabRows = layout.tabs === 'beside' ? 0 : layout.tabs === 'row' ? 1 : COLLECTION_TABS.length
    // Header, tabs, the blank line, and the no-biome note when there's no biome
    const usedRows = 1 + tabRows + 1 + (biome ? 0 : 1)
    if (collectionTab !== 'collection') dropCollectionSite(e.requestId)
    if (collectionTab !== 'biomes') dropBiomesSceneSite(e.requestId)
    if (collectionTab !== 'catchers') dropCatcherPreview(e.requestId)
    return (
      <Box flexDirection="column">
        {header}
        {layout.tabs === 'beside' ? null : tabs}
        <Text key="gap"> </Text>
        {biome ? null : (
          <Text key="no-biome" dimColor>
            {noBiomesMessage(includeBuiltins, USER_FOLDER_LABEL)}
          </Text>
        )}
        {collectionTab === 'collection'
          ? collectionView(e.props.scroll.bodyRows - usedRows)
          : collectionTab === 'biomes'
            ? biomesView(e.props.scroll.bodyRows - usedRows)
            : collectionTab === 'stats'
              ? statsView()
              : collectionTab === 'catchers'
                ? catchersView(e.props.scroll.bodyRows - usedRows)
                : settingsView()}
      </Box>
    )

    /** The Catchers tab: a summary line with k/j/u, the list, and the selected catcher's preview (decision 0035 point 9). */
    function catchersView(rows: number) {
      const inUse = content ? catcherInUse(content.catchers, pickedCatcherId, CATCH.defaultCatcher)?.catcher.id : undefined
      const entries = content ? catcherEntries([...content.catchers.values()].map((loaded) => loaded.catcher), inUse, content.userIds.catchers) : []
      // A selected catcher that no longer loads falls back to the one in use
      const at = (id: string | undefined) => entries.findIndex((entry) => entry.id === id)
      const index = Math.max(0, at(catchersSelected) >= 0 ? at(catchersSelected) : at(inUse))
      const selected = entries[index]
      const select = (entry: CatcherEntry | undefined) => {
        if (!entry || entry.id === selected?.id) return
        catchersSelected = entry.id
        $.ui.invalidate('ui.render')
      }
      const summary = (
        <Box key="summary" flexDirection="row" columnGap={COLLECTION.gapColumns}>
          <Text bold>{`Catchers ${entries.length}`}</Text>
          <Button key="catcher-up" label="Up" hotkey="k" plain dimColor onPress={() => select(entries[index - 1])} />
          <Button key="catcher-down" label="Down" hotkey="j" plain dimColor onPress={() => select(entries[index + 1])} />
          {selected && !selected.isInUse ? (
            // `u`, not Enter: a hotkey is one digit or letter (asked by @danielpg95 in P5-30)
            <Button key="catcher-use" label="Use" hotkey="u" plain dimColor onPress={() => useCatcher($, selected)} />
          ) : null}
        </Box>
      )
      const loadedCatcher = selected ? content?.catchers.get(selected.id) : undefined
      if (!selected || !loadedCatcher) {
        dropCatcherPreview(e.requestId)
        return (
          <Box key="catchers" flexDirection="column">
            {summary}
            <Text dimColor>No catchers loaded.</Text>
          </Box>
        )
      }
      // The preview plays on the Modster caught last, or a silhouette when none is caught yet
      const all = content ? [...content.modsters.values(), ...content.off.modsters.values()] : []
      const caughtId = previewModsterId(collectionRecords, new Set(all.map((loaded) => loaded.modster.id)))
      const modster = all.find((loaded) => loaded.modster.id === caughtId) ?? all[0]
      const lines: BandLine[] = [
        [{ text: selected.name, bold: true }],
        ...(selected.description ? [[{ text: selected.description, dim: true }] as BandLine] : []),
        ...itemNotes('catcher', selected.id, selected),
      ]
      const plan = collectionBody({
        columns: e.props.bodyColumns,
        // Less the summary line
        rows: Math.max(1, rows - 1),
        spriteColumns: modster && e.surface === 'terminal' ? modster.sprite.width : Number.MAX_SAFE_INTEGER,
        spriteRows: modster && e.surface === 'terminal' ? Math.ceil(modster.sprite.height / 2) : Number.MAX_SAFE_INTEGER,
        detailRows: COLLECTION.catcherDetailRows,
      })
      const window = listWindow(entries.length, index, plan.listRows)
      const more = moreText(window)
      const list = (
        <Box key="catcher-list" flexDirection="column" {...(plan.split === 'side' ? { width: COLLECTION.listColumns } : {})}>
          {entries.slice(window.start, window.end).map((entry) => (
            <Button key={entry.id} plain onPress={() => select(entry)}>
              {texts(catcherRow(entry, entry.id === selected.id), 'truncate')}
            </Button>
          ))}
          {more ? <Text dimColor>{more}</Text> : null}
        </Box>
      )
      const text = (
        <Box key="catcher-text" flexDirection="column" width={plan.textColumns}>
          {lines.map((line, row) => (
            <Box key={`catcher-line-${row}`} flexDirection="row">
              {texts(line, 'wrap')}
            </Box>
          ))}
        </Box>
      )
      let detail = text
      if (plan.sprite !== 'none' && modster && e.surface === 'terminal') {
        const { Raster } = $.ui.resolve(e)
        const sprite = caughtId === undefined ? silhouetteSprite(modster.sprite) : modster.sprite
        const cells = catcherPreviewCells($, e.requestId, loadedCatcher, modster, sprite)
        const beside = plan.sprite === 'beside'
        detail = (
          <Box key="detail" flexDirection={beside ? 'row' : 'column'} {...(beside ? { columnGap: COLLECTION.gapColumns } : {})}>
            <Raster key={CATCHER_PREVIEW_KEY} columns={sprite.width} rows={Math.ceil(sprite.height / 2)} cells={cells} />
            {text}
          </Box>
        )
      } else {
        dropCatcherPreview(e.requestId)
      }
      return (
        <Box key="catchers" flexDirection="column">
          {summary}
          {plan.split === 'side' ? (
            <Box key="split" flexDirection="row" columnGap={COLLECTION.gapColumns}>
              {list}
              {detail}
            </Box>
          ) : (
            <Box key="split" flexDirection="column">
              {list}
              <Text> </Text>
              {detail}
            </Box>
          )}
        </Box>
      )
    }

    /** The Settings tab: every option with k/j/o (decision 0040), then the content issues and how to reload (P4-02). */
    function settingsView() {
      const fields = SETTING_SPECS.map((spec) => spec.field)
      const index = Math.max(0, fields.indexOf(settingsSelected))
      const select = (field: SettingField | undefined) => {
        if (!field || field === settingsSelected) return
        settingsSelected = field
        void keepState($, 'settingsSelected', field)
        $.ui.invalidate('ui.render')
      }
      return (
        <Box key="settings" flexDirection="column">
          <Box key="settings-summary" flexDirection="row" columnGap={COLLECTION.gapColumns}>
            <Text bold>Settings</Text>
            <Button key="setting-up" label="Up" hotkey="k" plain dimColor onPress={() => select(fields[index - 1])} />
            <Button key="setting-down" label="Down" hotkey="j" plain dimColor onPress={() => select(fields[index + 1])} />
            <Button key="setting-change" label="Change" hotkey={TOGGLE_HOTKEY} plain dimColor onPress={() => void changeSetting($, fields[index] ?? 'autoStart')} />
          </Box>
          {fields.map((field) => (
            <Button key={`setting-${field}`} plain onPress={() => select(field)}>
              {texts(settingRow(field, settingValues, field === fields[index]), 'truncate')}
            </Button>
          ))}
          <Text key="settings-gap"> </Text>
          {settingsLines(content?.issues ?? []).map((line, at) => (
            <Box key={`settings-${at}`} flexDirection="row">
              {texts(line, 'wrap')}
            </Box>
          ))}
        </Box>
      )
    }

    /** The Stats tab: the totals and a row per biome (P3-04). */
    function statsView() {
      if (!statsShown) {
        return (
          <Text key="stats" dimColor>
            Counting…
          </Text>
        )
      }
      const biomes = new Map([...(content?.biomes.values() ?? []), ...(content?.off.biomes.values() ?? [])].map(({ biome: loaded }) => [loaded.id, { name: loaded.name, ...(loaded.accentColor ? { accentColor: loaded.accentColor } : {}) }]))
      return (
        <Box key="stats" flexDirection="column">
          {statsLines(statsShown.stats, biomes).map((line, at) => (
            <Box key={`stats-${at}`} flexDirection="row">
              {texts(line, 'truncate')}
            </Box>
          ))}
        </Box>
      )
    }

    /** The Biomes tab: a summary line with k/j, the biome list, and the selected biome's odds (P3-03). */
    function biomesView(rows: number) {
      // Off biomes stay listed, dimmed, so `o` can turn them back on (0032 point 5)
      const entries = content
        ? biomeEntries([...content.biomes.values(), ...content.off.biomes.values()], content.modsters, collectionRecords, biomeId, {
            off: new Set(content.off.biomes.keys()),
            yours: content.userIds.biomes,
          })
        : []
      // A selected biome that no longer loads falls back to the session's
      const at = (id: string | undefined) => entries.findIndex((entry) => entry.id === id)
      const index = Math.max(0, at(biomesSelected) >= 0 ? at(biomesSelected) : at(biomeId))
      const selected = entries[index]
      const select = (entry: BiomeEntry | undefined) => {
        if (!entry || entry.id === selected?.id) return
        biomesSelected = entry.id
        $.ui.invalidate('ui.render')
      }
      const summary = (
        <Box key="summary" flexDirection="row" columnGap={COLLECTION.gapColumns}>
          <Text bold>{`Biomes ${entries.length}`}</Text>
          <Button key="biome-up" label="Up" hotkey="k" plain dimColor onPress={() => select(entries[index - 1])} />
          <Button key="biome-down" label="Down" hotkey="j" plain dimColor onPress={() => select(entries[index + 1])} />
          {selected ? (
            <Button
              key="biome-toggle"
              label={toggleLabel(selected)}
              hotkey={TOGGLE_HOTKEY}
              plain
              dimColor
              onPress={() => toggle($, { kind: 'biome', id: selected.id, off: !selected.isOff }, selected.name, includeBuiltins, idleTimeoutSec)}
            />
          ) : null}
        </Box>
      )
      if (!selected) {
        dropBiomesSceneSite(e.requestId)
        return <Box key="biomes" flexDirection="column">{summary}</Box>
      }
      // Raster is terminal only (0012); 0028 point 3
      const loadedBiome = content?.biomes.get(selected.id) ?? content?.off.biomes.get(selected.id)
      const scene = showIdleScene && e.surface === 'terminal' && loadedBiome ? biomeScene(loadedBiome) : undefined
      // Less the summary line
      const plan = biomesBody({ columns: e.props.bodyColumns, rows: rows - 1, ...(scene ? { sceneRows: scene.rows } : {}) })
      let sceneView = null
      if (scene && plan.showScene && e.surface === 'terminal') {
        const { Raster } = $.ui.resolve(e)
        const site = setBiomesSceneSite($, e.requestId, selected.id, scene, e.props.bodyColumns)
        sceneView = <Raster key={BIOMES_SCENE_KEY} columns={site.columns} rows={scene.rows} cells={sceneCells(scene, site.columns, site.particles, biomesSceneTick)} />
      } else {
        dropBiomesSceneSite(e.requestId)
      }
      const window = listWindow(entries.length, index, plan.listRows)
      const more = moreText(window)
      const list = (
        <Box key="biome-list" flexDirection="column" {...(plan.split === 'side' ? { width: COLLECTION.biomeListColumns } : {})}>
          {entries.slice(window.start, window.end).map((entry) => (
            <Button key={entry.id} plain onPress={() => select(entry)}>
              {texts(biomeRow(entry, entry.id === selected.id), 'truncate')}
            </Button>
          ))}
          {more ? <Text dimColor>{more}</Text> : null}
        </Box>
      )
      const odds = (
        <Box key="odds" flexDirection="column">
          {itemNotes('biome', selected.id, selected).map((line, at) => (
            <Box key={`note-${at}`} flexDirection="row">
              {texts(line, 'wrap')}
            </Box>
          ))}
          {selected.odds.length === 0 ? <Text dimColor>No Modsters loaded.</Text> : null}
          {tierSections(selected.odds).map((section, index) => (
            <Box key={`tier-${section.tier}`} flexDirection="column">
              {index > 0 ? <Text key="gap"> </Text> : null}
              <Box key="tier-header" flexDirection="row">
                {texts(tierRow(section), 'truncate')}
              </Box>
              {section.odds.map((row) => (
                <Box key={`odds-${row.id}`} flexDirection="row">
                  {texts(oddsRow(row, selected.id), 'truncate')}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )
      return (
        <Box key="biomes" flexDirection="column">
          {summary}
          {sceneView}
          {plan.split === 'side' ? (
            <Box key="split" flexDirection="row" columnGap={COLLECTION.gapColumns}>
              {list}
              {odds}
            </Box>
          ) : (
            <Box key="split" flexDirection="column">
              {list}
              <Text> </Text>
              {odds}
            </Box>
          )}
        </Box>
      )
    }

    /** The Collection tab: a summary line with k/j, the list, and the selected Modster (P3-02). */
    function collectionView(rows: number) {
      // Off Modsters stay listed, dimmed, so `o` can turn them back on (0032 point 5)
      const entries = content
        ? collectionEntries([...content.modsters.values(), ...content.off.modsters.values()], collectionRecords, {
            off: new Set(content.off.modsters.keys()),
            yours: content.userIds.modsters,
          })
        : []
      const caught = entries.filter((entry) => entry.record).length
      const index = Math.max(0, entries.findIndex((entry) => entry.id === collectionSelected))
      const selected = entries[index]
      const select = (entry: CollectionEntry | undefined) => {
        if (!entry || entry.id === selected?.id) return
        collectionSelected = entry.id
        $.ui.invalidate('ui.render')
      }
      const summary = (
        <Box key="summary" flexDirection="row" columnGap={COLLECTION.gapColumns}>
          <Text bold>{`Caught ${caught}/${entries.length}`}</Text>
          <Button key="up" label="Up" hotkey="k" plain dimColor onPress={() => select(entries[index - 1])} />
          <Button key="down" label="Down" hotkey="j" plain dimColor onPress={() => select(entries[index + 1])} />
          {selected ? (
            <Button
              key="toggle"
              label={toggleLabel(selected)}
              hotkey={TOGGLE_HOTKEY}
              plain
              dimColor
              // An uncaught Modster's name stays a secret (0032 point 4)
              onPress={() =>
                toggle($, { kind: 'modster', id: selected.id, off: !selected.isOff }, selected.record ? selected.name : 'That Modster', includeBuiltins, idleTimeoutSec)
              }
            />
          ) : null}
        </Box>
      )
      if (!selected) {
        dropCollectionSite(e.requestId)
        return (
          <Box key="collection" flexDirection="column">
            {summary}
            <Text dimColor>No Modsters loaded.</Text>
          </Box>
        )
      }
      const loaded = content?.modsters.get(selected.id) ?? content?.off.modsters.get(selected.id)
      const habitat = content
        ? [...content.biomes.values()].filter(({ biome }) => biome.modsters.some((entry) => entry.id === selected.id)).map(({ biome }) => biome.name)
        : []
      const lines = detailLines({ entry: selected, ...(loaded?.modster.dex ? { dex: loaded.modster.dex } : {}), habitat })
      // Sized from the pane and the largest sprite, never the selection, so scrolling
      // keeps one layout. Raster is terminal only (0012); elsewhere no sprite fits
      const box = e.surface === 'terminal' ? spriteBox() : undefined
      const plan = collectionBody({
        columns: e.props.bodyColumns,
        // Less the summary line
        rows: Math.max(1, rows - 1),
        spriteColumns: box ? box.columns : Number.MAX_SAFE_INTEGER,
        spriteRows: box ? box.rows : Number.MAX_SAFE_INTEGER,
        detailRows: COLLECTION.detailRows,
      })
      const window = listWindow(entries.length, index, plan.listRows)
      const more = moreText(window)
      const list = (
        <Box key="list" flexDirection="column" {...(plan.split === 'side' ? { width: COLLECTION.listColumns } : {})}>
          {entries.slice(window.start, window.end).map((entry) => (
            <Button key={entry.id} plain onPress={() => select(entry)}>
              {texts(listRow(entry, entry.id === selected.id), 'truncate')}
            </Button>
          ))}
          {more ? <Text dimColor>{more}</Text> : null}
        </Box>
      )
      // Always the same height: a short detail leaves room, a long entry is cut
      const text = (
        <Box key="detail-text" flexDirection="column" width={plan.textColumns} height={COLLECTION.detailRows} overflow="hidden">
          {lines.map((line, at) => (
            <Box key={`detail-${at}`} flexDirection="row">
              {texts(line, 'wrap')}
            </Box>
          ))}
        </Box>
      )
      let detail = text
      if (plan.sprite !== 'none' && box && loaded && e.surface === 'terminal') {
        const { Raster } = $.ui.resolve(e)
        // Only a caught Modster animates; the silhouette holds still
        setCollectionSite($, e.requestId, selected.record ? loaded : undefined)
        const beside = plan.sprite === 'beside'
        detail = (
          <Box key="detail" flexDirection={beside ? 'row' : 'column'} {...(beside ? { columnGap: COLLECTION.gapColumns } : {})}>
            <Box key="sprite-box" width={box.columns} height={box.rows} alignItems="center" justifyContent="center">
              <Raster key={COLLECTION_SPRITE_KEY} columns={loaded.sprite.width} rows={Math.ceil(loaded.sprite.height / 2)} cells={collectionCells(loaded, selected)} />
            </Box>
            {text}
          </Box>
        )
      } else {
        dropCollectionSite(e.requestId)
      }
      return (
        <Box key="collection" flexDirection="column">
          {summary}
          {plan.split === 'side' ? (
            <Box key="split" flexDirection="row" columnGap={COLLECTION.gapColumns}>
              {list}
              {detail}
            </Box>
          ) : (
            <Box key="split" flexDirection="column">
              {list}
              <Text> </Text>
              {detail}
            </Box>
          )}
        </Box>
      )
    }
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
    if (e.id === COLLECTION_PANE_ID) dropCollectionSite(COLLECTION_PANE_ID)
    if (e.id === COLLECTION_PANE_ID) dropBiomesSceneSite(COLLECTION_PANE_ID)
    if (e.id === COLLECTION_PANE_ID) dropCatcherPreview(COLLECTION_PANE_ID)
    const pref = e.id === PANE_ID ? prefAfterClose(e.origin.kind) : undefined
    if (pref) queueWrite($, (store) => store.set(HUNT_PANE_KEY, pref))
    $.ui.invalidate('ui.render')
    return result
  })

  on('command.run', { command: 'modsters' }, async ($, e) => {
    const verb = typeof e.args === 'string' ? e.args.trim() : ''
    // `/modsters hunt` and `stop` turn the game on and off through autoStart (0038 points 3–4)
    if (verb === 'hunt') {
      const denied = await startHunting($, idleTimeoutSec, { reopenPane: true })
      return { text: denied === undefined ? huntReply(sessionBiome()?.biome.name) : autoStartDeniedReply(true, denied) }
    }
    if (verb === 'stop') {
      const denied = await stopHunting($)
      return { text: denied === undefined ? STOP_REPLY : autoStartDeniedReply(false, denied) }
    }
    // `/modsters pane` opens the encounter pane, starting the game when it's off (0015, 0019, 0024; 0038 point 5)
    if (verb === 'pane') {
      if (display.encounterPane === 'off') return { text: PANE_OFF_REPLY }
      const denied = await startHunting($, idleTimeoutSec, { reopenPane: false })
      if (denied !== undefined) return { text: autoStartDeniedReply(true, denied) }
      queueWrite($, (store) => store.set(HUNT_PANE_KEY, huntPanePref(true)))
      // The person asked for it, so the pane takes the keys; granted only over an empty composer (0024)
      const opened = await $.ui.open({ id: PANE_ID, title: 'Modster Hunter', focus: true })
      // The band redraws without the encounter now that the pane shows it
      $.ui.invalidate('ui.render')
      return opened.isPlaced ? {} : { text: 'Modster Hunter: the pane is waiting for more room (widen the terminal)' }
    }
    if (verb === 'help') return { text: helpText(hunting) }
    // `/modsters settings` opens the collection on its Settings tab (0040 point 1)
    if (verb === 'settings') {
      collectionTab = 'settings'
      await keepState($, 'paneTab', 'settings')
    }
    if (verb === 'reload') {
      reloading ??= reloadContent($, includeBuiltins, idleTimeoutSec).finally(() => {
        reloading = undefined
      })
      return { text: (await reloading).reply }
    }
    // A word it doesn't know gets the help, not the collection (0038 point 7)
    if (verb !== '' && verb !== 'settings') return { text: unknownSubcommandText(verb, hunting) }
    // Catches from other sessions show up when the pane opens
    loadCollectionRecords($)
    if (collectionTab === 'stats') loadStats($)
    await pendingWrites
    // The person asked for it, so the pane takes the keys over an empty composer (0024)
    const opened = await $.ui.open({ id: COLLECTION_PANE_ID, title: 'Modster collection', focus: true, closeOnEscape: true })
    return opened.isPlaced ? {} : { text: 'Modster Hunter: the collection is waiting for more room (widen the terminal)' }
  })

}

/**
 * The Settings tab's `o` (decision 0040 points 3–5): writes the next value through
 * /config and applies it at once. A refused write keeps the value and says why.
 */
async function changeSetting($: EngineInterface, field: SettingField): Promise<void> {
  const next = nextSettingValue(field, settingValues[field])
  // The write below reloads the mod (0023): the pane must come back here, on this row (0040 point 5)
  await keepState($, 'paneTab', 'settings')
  await keepState($, 'settingsSelected', field)
  const label = SETTING_SPECS.find((spec) => spec.field === field)?.label ?? field
  if (field === 'autoStart') {
    // Exactly what /modsters hunt and stop do (0038 points 3–4)
    const denied = next === true ? await startHunting($, idleTimeoutSec, { reopenPane: true }) : await stopHunting($)
    if (denied !== undefined) $.ui.toast(settingDeniedText(label, denied))
    $.ui.invalidate('ui.render')
    return
  }
  const denied = await setOption($, field, next)
  if (denied !== undefined) {
    $.ui.toast(settingDeniedText(label, denied))
    return
  }
  settingValues = { ...settingValues, [field]: next }
  switch (field) {
    case 'showInBand':
    case 'encounterPane':
    case 'showInSpinner':
    case 'showInStatusLine':
      // Where the game shows, by 0023's rules
      display = readDisplaySettings(settingValues)
      if (field === 'encounterPane' && next === 'off') await closeHuntPane($)
      if (field === 'encounterPane' && next === 'always' && hunting) await openHuntPaneAtStart($)
      updateStatus($)
      break
    case 'showIdleLine':
      showIdleLine = next === true
      break
    case 'showIdleScene':
      showIdleScene = next === true
      updateSceneTimer($)
      break
    case 'includeBuiltins': {
      includeBuiltins = next === true
      builtinsIncluded = includeBuiltins
      // As /modsters reload does (0031)
      await reloading?.catch(() => undefined)
      reloading = reloadContent($, includeBuiltins, idleTimeoutSec).finally(() => {
        reloading = undefined
      })
      $.ui.toast((await reloading).reply)
      break
    }
    case 'encounterIdleTimeoutSec':
      idleTimeoutSec = Number(next)
      setIdleTimeout(idleTimeoutSec * 1000)
      break
  }
  $.ui.invalidate('ui.render')
}

function cellsFor(loaded: LoadedModster): string[] {
  const cached = cellsByModster.get(loaded.modster.id)
  if (cached?.sprite === loaded.sprite) return cached.cells
  const cells = spriteCells(loaded.sprite)
  cellsByModster.set(loaded.modster.id, { sprite: loaded.sprite, cells })
  return cells
}

// P5-06 spike: every frame in one SVG, looped by SMIL on the surface, since blit only repaints Raster and Image
function svgFor(loaded: LoadedModster): string {
  const cached = svgByModster.get(loaded.modster.id)
  if (cached?.sprite === loaded.sprite) return cached.svg
  const { width, height } = loaded.sprite
  const frames = spriteRgba(loaded.sprite).map((rgba) => ({ width, height, rgba }))
  const svg = pixelsToSvg(frames, { scale: DESKTOP.svgScale, fps: loaded.modster.sprite.fps ?? CONTENT.modster.defaultFps })
  svgByModster.set(loaded.modster.id, { sprite: loaded.sprite, svg })
  return svg
}

function currentModster(): LoadedModster | undefined {
  const encounter = machine?.encounter
  if (!encounter) return undefined
  return encounterModster?.modster.id === encounter.modsterId ? encounterModster : content?.modsters.get(encounter.modsterId)
}

/** The biome being played: the session's, or the one a reload dropped while its encounter finishes. */
function sessionBiome(): LoadedBiome | undefined {
  return retiredBiome ?? (biomeId === undefined ? undefined : content?.biomes.get(biomeId))
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
    ...(shownDots ? { dots: shownDots } : {}),
  }
}

/**
 * The dot count for the throw now (0035 point 7): while throwing, and for a catch
 * while its caught beat opens the result card. Returns whether it changed.
 */
function updateDots(now: number): boolean {
  const encounter = machine?.encounter
  const throwAt = encounter?.throwAt
  const rocks = encounter?.rocks
  let dots: string | undefined
  if (encounter && throwAt !== undefined && rocks !== undefined) {
    const outcome: CatchOutcome = encounter.throwLands || encounter.outcome === 'caught' ? 'caught' : 'missed'
    const end = throwAt + throwingMs(outcome, rocks) + (outcome === 'caught' ? CATCH.beatMs.caught : 0)
    if (encounter.phase === 'throwing' || now < end) dots = catchDots(outcome, rocks, now - throwAt)
  }
  if (dots === shownDots) return false
  shownDots = dots
  return true
}

/** The encounter as the band and pane draw it: with the caught mark (P5-10, P5-11); the spinner and status line go without */
function markedEncounter(): BandEncounter | undefined {
  const encounter = currentEncounter()
  return encounter && alreadyCaught ? { ...encounter, alreadyCaught: true } : encounter
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
  shownDots = undefined
  machineContext = undefined
  alreadyCaught = false
  encounterModster = undefined
  retiredBiome = undefined
  cellsByModster.clear()
  const loaded = biomeId === undefined ? undefined : content?.biomes.get(biomeId)
  setScene($, loaded)
  if (!content || !loaded) return
  machineContext = playContext(content, loaded, idleTimeoutSec)
  pendingIdleTimeoutMs = undefined
  machine = startEncounters(machineContext)
  // Timers start in session.start, never at module top level (mod-code rule)
  tickTimer = $.clock.every(BAND.tickMs, () => {
    void advanceMachine($, { type: 'tick' })
  })
}

/** Shows `loaded`'s idle scene in the band, from its first frame. */
function setScene($: EngineInterface, loaded: LoadedBiome | undefined): void {
  stopScene()
  scene = loaded && idleScene(loaded.biome, loaded.background)
  loggedSceneSkip = undefined
  if (loaded) $.ui.log(scene ? `idle scene: ${loaded.biome.id}, ${scene.rows} rows, timer ${scene.timerFps} fps` : `idle scene: ${loaded.biome.id} has none`, { to: 'debug' })
  particlesByColumns.clear()
  sceneTick = 0
}

/** What the encounter machine plays from: `loaded`'s biome and every loaded Modster. */
function playContext(registry: ContentRegistry, loaded: LoadedBiome, idleTimeoutSec: number): EncounterContext {
  return {
    biome: loaded.biome,
    modsters: new Map([...registry.modsters].map(([id, modster]) => [id, modster.modster])),
    random: Math.random,
    idleTimeoutMs: idleTimeoutSec * 1000,
  }
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
  if (step.state === machine) {
    // The dots move on while the state holds still
    if (updateDots(now)) {
      $.ui.invalidate('ui.render')
      updateStatus($)
    }
    return
  }
  machine = step.state
  if (pendingIdleTimeoutMs !== undefined && !machine.encounter) {
    machineContext = { ...machineContext, idleTimeoutMs: pendingIdleTimeoutMs }
    pendingIdleTimeoutMs = undefined
  }
  updateDots(now)
  // Before the redraw, so a throw's first frame is what the band draws
  updateCatch($, now)
  // Before the redraw, so a scene that stops is drawn still
  updateSceneTimer($)
  $.ui.invalidate('ui.render')
  updateStatus($)
  const where = { sessionId, biomeId: machineContext.biome.id }
  if (step.events.length > 0) queueWrite($, (store) => recordEncounterEvents(store, where, step.events, now))
  for (const event of step.events) if (event.type === 'caught') refreshCollectionRecord($, event.modsterId)
  const appeared = step.events.find((event) => event.type === 'appeared')
  if (appeared) {
    encounterModster = content?.modsters.get(appeared.modsterId)
    checkAlreadyCaught($, appeared.modsterId)
  }
  if (retiredBiome && !machine.encounter) {
    const loaded = moveToNewBiome($, machineContext.idleTimeoutMs / 1000)
    $.ui.toast(loaded ? `Modster Hunter: now in ${loaded.biome.name}` : `Modster Hunter: ${noBiomesMessage(builtinsIncluded, USER_FOLDER_LABEL)}`)
  }
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
function queueWrite($: EngineInterface, write: (store: StatsStorePort) => Promise<void>): void {
  const store: StatsStorePort = {
    get: (key) => $.store.get(key),
    set: (key, value) => $.store.set(key, value),
    keys: () => $.store.keys(),
    delete: (key) => $.store.delete(key),
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
    // Skip a tick while the last blits are in flight (P1-03), or during a throw: the
    // catcher plays, or with none drawn the Modster holds still (0035 point 8)
    if (!current || isBlitting || spriteSites.size === 0 || catchPlay || machine?.encounter?.phase === 'throwing') return
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

/**
 * Starts or stops the catch animation to match the machine (decision 0035): a
 * throw, and a catch's result card while its `caught` beat plays. A throw
 * already playing keeps its catcher; a new one takes the catcher in use.
 */
function updateCatch($: EngineInterface, now: number): void {
  const encounter = machine?.encounter
  const throwAt = encounter?.throwAt
  const rocks = encounter?.rocks
  const playing = encounter && throwAt !== undefined && rocks !== undefined && (encounter.phase === 'throwing' || encounter.outcome === 'caught')
  if (!playing) {
    if (catchPlay) endCatch($)
    return
  }
  if (catchPlay?.throwAt === throwAt) return
  const modster = currentModster()
  const catcher = content && catcherInUse(content.catchers, pickedCatcherId, CATCH.defaultCatcher)
  if (!modster || !catcher) return
  const art = catchArtFor(catcher, modster)
  // A catcher that doesn't fit the sprite area isn't drawn (0035 point 8; P5-33 shows the dot count)
  if (!art.fits) return
  const outcome: CatchOutcome = encounter.throwLands || encounter.outcome === 'caught' ? 'caught' : 'missed'
  const endsAt = throwAt + throwingMs(outcome, rocks) + (outcome === 'caught' ? CATCH.beatMs.caught : 0)
  catchPlay = { art, outcome, rocks, throwAt, endsAt }
  catchCells = pixelsToCells(catchFrame(art, outcome, rocks, now - throwAt))
  catchTimer?.cancel()
  catchTimer = $.clock.every(Math.round(1000 / CATCH.fps), () => {
    // Skip a tick while the last blits are in flight (P1-03)
    if (!catchPlay || isBlittingCatch) return
    isBlittingCatch = true
    void blitCatchFrame($).finally(() => {
      isBlittingCatch = false
    })
  })
}

/** Blits the frame for the clock's now to every sprite site, or ends the animation once it's over. */
async function blitCatchFrame($: EngineInterface): Promise<void> {
  const at = await $.clock.now()
  const play = catchPlay
  if (!play) return
  if (at >= play.endsAt) {
    endCatch($)
    return
  }
  const cells = pixelsToCells(catchFrame(play.art, play.outcome, play.rocks, at - play.throwAt))
  catchCells = cells
  await Promise.all([...spriteSites].map((site) => $.ui.blit({ requestId: site, key: SPRITE_KEY, cells }).catch(() => undefined)))
}

/** Ends the animation and puts the Modster's idle frame back where it played. */
function endCatch($: EngineInterface): void {
  stopCatch()
  const current = frameModster
  if (!current) return
  const cells = cellsFor(current)[frameIndex] ?? ''
  for (const site of spriteSites) void $.ui.blit({ requestId: site, key: SPRITE_KEY, cells }).catch(() => undefined)
}

function stopCatch(): void {
  catchTimer?.cancel()
  catchTimer = undefined
  catchPlay = undefined
  catchCells = undefined
}

/** The decoded art for a catcher on a Modster, made once and remade when either changed. */
function catchArtFor(catcher: LoadedCatcher, modster: LoadedModster): CatchArt {
  const key = `${catcher.catcher.id}/${modster.modster.id}`
  const cached = catchArts.get(key)
  if (cached && cached.catcher === catcher && cached.modster === modster) return cached.art
  const art = prepareCatch(catcher.catcher, catcher.sprite, modster.sprite, modster.modster.sprite.fps ?? CONTENT.modster.defaultFps)
  catchArts.set(key, { catcher, modster, art })
  return art
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
      await closeHuntPane($)
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

/** Writes a session value that must survive a reload (`types/index.d.ts`); a failure is logged, never thrown. */
async function keepState($: EngineInterface, key: 'paneTab' | 'settingsSelected' | 'biomeId', value: string): Promise<void> {
  try {
    if (key === 'paneTab') await $.state.set({ plugin: 'modster-hunter', key: 'paneTab' }, value as CollectionTab)
    else if (key === 'settingsSelected') await $.state.set({ plugin: 'modster-hunter', key: 'settingsSelected' }, value)
    else await $.state.set({ plugin: 'modster-hunter', key: 'biomeId' }, value)
  } catch (error) {
    $.ui.log(`state: ${key} not kept: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** Reads back what keepState wrote, after a reload dropped the module variables. Unknown values are ignored. */
async function restoreSessionState($: EngineInterface): Promise<void> {
  try {
    const tab = (await $.state.get({ plugin: 'modster-hunter', key: 'paneTab' })).value
    if (tab && COLLECTION_TABS.some((info) => info.id === tab)) collectionTab = tab
    const selected = (await $.state.get({ plugin: 'modster-hunter', key: 'settingsSelected' })).value
    if (selected && SETTING_SPECS.some((spec) => spec.field === selected)) settingsSelected = selected as SettingField
    const biome = (await $.state.get({ plugin: 'modster-hunter', key: 'biomeId' })).value
    if (biomeId === undefined && biome && content?.biomes.has(biome)) biomeId = biome
  } catch (error) {
    $.ui.log(`state: not restored: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** Closes the encounter pane when it's open. Our close, so prefs:huntPane is kept for when it comes back (0019 point 2). */
async function closeHuntPane($: EngineInterface): Promise<void> {
  try {
    if ((await $.ui.panes()).some((pane) => pane.id === PANE_ID)) await $.ui.close({ id: PANE_ID })
  } catch (error) {
    $.ui.log(`hunt pane: not closed: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** The welcome toast, once per player: the game is on, and how to stop it (decisions 0038 point 9, 0041). */
async function welcome($: EngineInterface): Promise<void> {
  try {
    await pendingWrites
    if (readWelcomed(await $.store.get(WELCOMED_KEY))) return
    await $.store.set(WELCOMED_KEY, welcomedPref())
    $.ui.toast(welcomeText(), { timeoutMs: WELCOME_TOAST_MS })
  } catch (error) {
    $.ui.log(`welcome: skipped: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** Writes one of our `/config` rows, `modster-hunter.<field>` (0038, 0040); returns why it was refused, or undefined once written. */
async function setOption($: EngineInterface, field: SettingField, value: SettingValue): Promise<string | undefined> {
  try {
    const result = await $.config.set({ key: `modster-hunter.${field}`, value })
    return result.deny
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

/** The idle timeout from the next encounter on (0040 point 5): now when none is up, else once it ends. */
function setIdleTimeout(ms: number): void {
  if (machineContext && !machine?.encounter) {
    machineContext = { ...machineContext, idleTimeoutMs: ms }
    pendingIdleTimeoutMs = undefined
  } else {
    pendingIdleTimeoutMs = ms
  }
}

/**
 * Turns the game on (0038 points 3 and 5): autoStart on, then the band and the
 * spawn countdown. Already on changes nothing. Returns why /config refused, if it did.
 */
async function startHunting($: EngineInterface, idleTimeoutSec: number, how: { reopenPane: boolean }): Promise<string | undefined> {
  if (hunting) return undefined
  const denied = await setOption($, 'autoStart', true)
  if (denied !== undefined) return denied
  hunting = true
  settingValues = { ...settingValues, autoStart: true }
  startMachine($, idleTimeoutSec)
  if (how.reopenPane) await openHuntPaneAtStart($)
  $.ui.invalidate('ui.render')
  return undefined
}

/**
 * Turns the game off (0038 point 4): autoStart off, an encounter dropped without a
 * result, and the band, status line, spinner and encounter pane cleared. Returns why /config refused, if it did.
 */
async function stopHunting($: EngineInterface): Promise<string | undefined> {
  const denied = await setOption($, 'autoStart', false)
  if (denied !== undefined) return denied
  hunting = false
  settingValues = { ...settingValues, autoStart: false }
  stopGame()
  updateStatus($)
  await closeHuntPane($)
  $.ui.invalidate('ui.render')
  return undefined
}

/** Stops the encounter loop and its animations; the collection pane's own timers keep going. */
function stopGame(): void {
  tickTimer?.cancel()
  tickTimer = undefined
  stopCatch()
  stopFrames()
  stopScene()
  sceneSites.clear()
  machine = undefined
  machineContext = undefined
  shownDots = undefined
  encounterModster = undefined
  retiredBiome = undefined
  alreadyCaught = false
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
  stopCatch()
  stopCatcherPreview()
  stopFrames()
  stopScene()
  sceneSites.clear()
  stopCollectionFrames()
  collectionSite = undefined
  dropBiomesSceneSite(COLLECTION_PANE_ID)
}

/** The scene's cells now, for a band `columns` wide; particles are made once per width. */
function sceneCellsFor(columns: number): string {
  if (!scene) return ''
  let particles = particlesByColumns.get(columns)
  if (!particles) {
    particles = makeParticles(scene, columns, Math.random)
    particlesByColumns.set(columns, particles)
  }
  // Held still, the background shows its first frame (0026 point 5)
  return sceneTimer ? sceneCells(scene, columns, particles, sceneTick) : sceneCells(scene, columns, particles, sceneTick, 0)
}

function addSceneSite($: EngineInterface, requestId: string, columns: number): void {
  sceneSites.set(requestId, columns)
  updateSceneTimer($)
}

function removeSceneSite(requestId: string): void {
  if (sceneSites.delete(requestId) && sceneSites.size === 0) stopScene()
}

/** Runs the scene's timer only while Claude works, no encounter is up and the band draws the scene (0026 point 5). */
function updateSceneTimer($: EngineInterface): void {
  const working = machine !== undefined && !machine.encounter && (machine.turnRunning || Object.keys(machine.agents).length > 0)
  const current = scene
  if (!working || !current || !isAnimated(current) || sceneSites.size === 0) {
    stopScene()
    return
  }
  if (sceneTimer) return
  sceneTimer = $.clock.every(Math.max(1, Math.round(1000 / current.timerFps)), () => {
    // Skip a tick while the last blits are in flight (P1-03)
    if (isBlittingScene || sceneSites.size === 0) return
    isBlittingScene = true
    sceneTick++
    const blits = [...sceneSites].map(([site, columns]) =>
      $.ui.blit({ requestId: site, key: SCENE_KEY, cells: sceneCellsFor(columns) }).catch(() => undefined),
    )
    void Promise.all(blits).finally(() => {
      isBlittingScene = false
    })
  })
}

function stopScene(): void {
  sceneTimer?.cancel()
  sceneTimer = undefined
}

/** Reads every loaded Modster's `caught:` record into memory, after the writes before it (P3-02). */
function loadCollectionRecords($: EngineInterface): void {
  // Off Modsters stay listed (0032 point 5), so their records are read too
  const ids = content ? [...content.modsters.keys(), ...content.off.modsters.keys()] : []
  queueWrite($, async (store) => {
    const records = await Promise.all(ids.map(async (id) => [id, readCaughtRecord(await store.get(caughtKey(id)))] as const))
    collectionRecords.clear()
    for (const [id, record] of records) if (record) collectionRecords.set(id, record)
    $.ui.invalidate('ui.render')
  })
}

/** Sums every session's stats, folding idle ones into `stats:total` first (0029), after the writes before it. */
function loadStats($: EngineInterface): void {
  queueWrite($, async (store) => {
    const now = await $.clock.now()
    statsShown = { stats: await compactStats(store, { sessionId, now }) }
    $.ui.invalidate('ui.render')
  })
}

/** Re-reads one record once the catch before it is written. */
function refreshCollectionRecord($: EngineInterface, modsterId: string): void {
  queueWrite($, async (store) => {
    const record = readCaughtRecord(await store.get(caughtKey(modsterId)))
    if (record) collectionRecords.set(modsterId, record)
    else collectionRecords.delete(modsterId)
    $.ui.invalidate('ui.render')
  })
}

/** The Collection tab's sprite box: the largest loaded sprite, in cells (0012: two pixel rows a cell). */
function spriteBox(): { columns: number; rows: number } {
  let columns = 0
  let rows = 0
  for (const { sprite } of [...(content?.modsters.values() ?? []), ...(content?.off.modsters.values() ?? [])]) {
    columns = Math.max(columns, sprite.width)
    rows = Math.max(rows, Math.ceil(sprite.height / 2))
  }
  return { columns, rows }
}

/** The Collection tab's sprite cells: the current frame when caught, else the still silhouette. */
function collectionCells(loaded: LoadedModster, entry: CollectionEntry): string {
  if (entry.record) {
    const cells = cellsFor(loaded)
    const frame = collectionSpriteModster?.modster.id === loaded.modster.id ? collectionFrame : 0
    return cells[frame] ?? cells[0] ?? ''
  }
  let cells = silhouettes.get(loaded.modster.id)
  if (cells === undefined) {
    cells = spriteCells(loaded.sprite, silhouettePalette(loaded.sprite))[0] ?? ''
    silhouettes.set(loaded.modster.id, cells)
  }
  return cells
}

/** Animates `loaded` in the collection pane; undefined (a silhouette) holds it still. */
function setCollectionSite($: EngineInterface, requestId: string, loaded: LoadedModster | undefined): void {
  collectionSite = requestId
  if (collectionSpriteModster?.modster.id === loaded?.modster.id) return
  stopCollectionFrames()
  collectionFrame = 0
  collectionSpriteModster = loaded
  if (!loaded || loaded.sprite.frames.length < 2) return
  collectionTimer = $.clock.every(Math.max(1, Math.round(1000 / (loaded.modster.sprite.fps ?? 6))), () => {
    const current = collectionSpriteModster
    const site = collectionSite
    // Skip a tick while the last blit is in flight (P1-03)
    if (!current || !site || isBlittingCollection) return
    isBlittingCollection = true
    collectionFrame = (collectionFrame + 1) % current.sprite.frames.length
    void $.ui
      .blit({ requestId: site, key: COLLECTION_SPRITE_KEY, cells: cellsFor(current)[collectionFrame] ?? '' })
      .catch(() => undefined)
      .finally(() => {
        isBlittingCollection = false
      })
  })
}

/** The collection pane stopped drawing a sprite: another tab, no room, or closed. */
function dropCollectionSite(requestId: string): void {
  if (collectionSite !== requestId) return
  collectionSite = undefined
  collectionSpriteModster = undefined
  stopCollectionFrames()
}

function stopCollectionFrames(): void {
  collectionTimer?.cancel()
  collectionTimer = undefined
}

/** Makes `entry` the catcher in use from the next throw, and saves it (0035 point 9); a throw in progress keeps its own. */
function useCatcher($: EngineInterface, entry: CatcherEntry): void {
  pickedCatcherId = entry.id
  queueWrite($, (store) => store.set(CATCHER_KEY, catcherPref(entry.id)))
  $.ui.toast(`Modster Hunter: catching with the ${entry.name} from the next throw`)
  $.ui.invalidate('ui.render')
}

/** A sprite in the silhouette's one gray, for a preview before anything is caught. */
function silhouetteSprite(sprite: Sprite): Sprite {
  return { ...sprite, palette: silhouettePalette(sprite) }
}

/**
 * The Catchers tab's preview cells now: a catch by `catcher` on `modster`, looped on a timer
 * at CATCH.fps with a pause after each. Another catcher or Modster starts it over.
 */
function catcherPreviewCells($: EngineInterface, requestId: string, catcher: LoadedCatcher, modster: LoadedModster, sprite: Sprite): string {
  const key = `${catcher.catcher.id}/${modster.modster.id}/${sprite === modster.sprite ? 'caught' : 'silhouette'}`
  const shown = catcherPreview
  if (shown && shown.requestId === requestId && shown.key === key && shown.catcher === catcher && shown.sprite.frames === sprite.frames) return shown.cells
  stopCatcherPreview()
  const art = prepareCatch(catcher.catcher, catcher.sprite, sprite, modster.modster.sprite.fps ?? CONTENT.modster.defaultFps)
  const cells = pixelsToCells(catchFrame(art, 'caught', CATCH.rocksToCatch, 0))
  catcherPreview = { requestId, key, catcher, sprite, art, tick: 0, cells }
  const loopMs = throwingMs('caught', CATCH.rocksToCatch) + CATCH.beatMs.caught + CATCH.previewPauseMs
  catcherPreviewTimer = $.clock.every(Math.round(1000 / CATCH.fps), () => {
    const preview = catcherPreview
    // Skip a tick while the last blit is in flight (P1-03)
    if (!preview || isBlittingPreview) return
    isBlittingPreview = true
    preview.tick += 1
    preview.cells = pixelsToCells(catchFrame(preview.art, 'caught', CATCH.rocksToCatch, ((preview.tick * 1000) / CATCH.fps) % loopMs))
    void $.ui
      .blit({ requestId: preview.requestId, key: CATCHER_PREVIEW_KEY, cells: preview.cells })
      .catch(() => undefined)
      .finally(() => {
        isBlittingPreview = false
      })
  })
  return cells
}

function dropCatcherPreview(requestId: string): void {
  if (catcherPreview?.requestId === requestId) stopCatcherPreview()
}

function stopCatcherPreview(): void {
  catcherPreviewTimer?.cancel()
  catcherPreviewTimer = undefined
  catcherPreview = undefined
}

/** A biome's idle scene, made once per content load (0028 point 1). */
function biomeScene(loaded: LoadedBiome): IdleScene | undefined {
  if (!biomeScenes.has(loaded.biome.id)) biomeScenes.set(loaded.biome.id, idleScene(loaded.biome, loaded.background))
  return biomeScenes.get(loaded.biome.id)
}

/** Draws `scene` in the Biomes tab and animates it; another biome or width starts it over (0028 point 4). */
function setBiomesSceneSite($: EngineInterface, requestId: string, biomeId: string, scene: IdleScene, columns: number) {
  const site = biomesSceneSite
  if (site && site.requestId === requestId && site.biomeId === biomeId && site.columns === columns) return site
  stopBiomesScene()
  biomesSceneTick = 0
  const next = { requestId, biomeId, scene, columns, particles: makeParticles(scene, columns, Math.random) }
  biomesSceneSite = next
  if (!isAnimated(scene)) return next
  biomesSceneTimer = $.clock.every(Math.max(1, Math.round(1000 / scene.timerFps)), () => {
    const current = biomesSceneSite
    // Skip a tick while the last blit is in flight (P1-03)
    if (!current || isBlittingBiomesScene) return
    isBlittingBiomesScene = true
    biomesSceneTick++
    void $.ui
      .blit({ requestId: current.requestId, key: BIOMES_SCENE_KEY, cells: sceneCells(current.scene, current.columns, current.particles, biomesSceneTick) })
      .catch(() => undefined)
      .finally(() => {
        isBlittingBiomesScene = false
      })
  })
  return next
}

/** The Biomes tab stopped drawing its scene: another tab, no room, or closed. */
function dropBiomesSceneSite(requestId: string): void {
  if (biomesSceneSite?.requestId !== requestId) return
  biomesSceneSite = undefined
  stopBiomesScene()
}

function stopBiomesScene(): void {
  biomesSceneTimer?.cancel()
  biomesSceneTimer = undefined
}

/**
 * `/modsters reload` (P4-02, decision 0031): loads content again without a restart.
 * An encounter in progress keeps its Modster, odds and biome; the next one plays the new content.
 */
async function reloadContent($: EngineInterface, includeBuiltins: boolean, idleTimeoutSec: number): Promise<Reloaded> {
  const played = sessionBiome()
  content = await loadGameContent($, includeBuiltins)
  // Sprites and backgrounds may have changed, and Modsters and catchers come or go
  cellsByModster.clear()
  catchArts.clear()
  stopCatcherPreview()
  silhouettes.clear()
  biomeScenes.clear()
  dropCollectionSite(COLLECTION_PANE_ID)
  dropBiomesSceneSite(COLLECTION_PANE_ID)
  loadCollectionRecords($)

  const kept = biomeId === undefined ? undefined : content.biomes.get(biomeId)
  let note = ''
  if (!hunting) {
    // The game is off (0038 point 1): only keep a biome for when it starts
    if (!kept) biomeId = pickBiome(content.biomes.keys(), Math.random)
  } else if (kept && machine) {
    retiredBiome = undefined
    machineContext = playContext(content, kept, idleTimeoutSec)
    setScene($, kept)
    updateSceneTimer($)
  } else if (kept) {
    startMachine($, idleTimeoutSec)
  } else if (machine?.encounter && played) {
    // The encounter finishes in the old biome; advanceMachine moves on after it
    retiredBiome = played
    note = ` · ${played.biome.name} is gone; a new biome after this encounter`
  } else {
    const loaded = moveToNewBiome($, idleTimeoutSec)
    note = loaded ? ` · now in ${loaded.biome.name}` : ''
  }
  $.ui.invalidate('ui.render')
  // Reply once the caught records are read, so the pane opened next shows them
  await pendingWrites

  const issues = content.issues.length
  const loaded = `${content.biomes.size} biome${content.biomes.size === 1 ? '' : 's'}, ${content.modsters.size} Modster${content.modsters.size === 1 ? '' : 's'}`
  const problems = issues === 0 ? 'no problems' : `${issues} problem${issues === 1 ? '' : 's'}, see /modsters → 5: Settings`
  if (content.biomes.size === 0) {
    const none = noBiomesMessage(includeBuiltins, USER_FOLDER_LABEL)
    return { reply: `Modster Hunter: reloaded · ${none} · ${problems}`, note: ` · ${none}` }
  }
  return { reply: `Modster Hunter: reloaded · ${loaded} · ${problems}${note}`, note }
}

/** A reload's reply to `/modsters reload`, and what changed for the game (a new biome, or none left). */
interface Reloaded {
  reply: string
  note: string
}

/** Queues turning an item off or on (decision 0032), after any toggle still running. */
function toggle($: EngineInterface, change: ToggleChange, name: string, includeBuiltins: boolean, idleTimeoutSec: number): void {
  toggling = toggling
    .then(() => toggleContent($, change, name, includeBuiltins, idleTimeoutSec))
    // A failure never blocks the next press
    .catch((error: unknown) => $.ui.log(`toggle: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' }))
}

/**
 * Turns a biome or Modster off or on in the user's `settings.json`, then
 * reloads (decision 0032). A file that isn't valid is left alone; only the user
 * folder is ever written, never `plugin/content/` (point 2).
 */
async function toggleContent($: EngineInterface, change: ToggleChange, name: string, includeBuiltins: boolean, idleTimeoutSec: number): Promise<void> {
  // The pane never stops the game by itself; settings.json by hand still can (0032 point 8)
  if (content && leavesNoBiome(content, change)) {
    $.ui.toast(`Modster Hunter: can't turn off ${name}: no biome would be left to play`)
    return
  }
  const file = `${USER_FOLDER_LABEL}settings.json`
  const home = await homeFolder($)
  if (home === undefined) {
    $.ui.toast(`Modster Hunter: no home folder, so ${file} can't be written`)
    return
  }
  const path = `${home}/${USER_CONTENT.contentFolder}/settings.json`
  try {
    const current = (await $.fs.exists(path)) ? await $.fs.read(path) : undefined
    const plan = toggleDisabled(typeof current === 'string' ? current : undefined, change, file)
    if (!plan.ok) {
      $.ui.toast(`Modster Hunter: ${plan.problem}`)
      return
    }
    await $.fs.write(path, plan.text)
  } catch (error) {
    $.ui.log(`settings: ${path}: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
    $.ui.toast(`Modster Hunter: couldn't change ${file}`)
    return
  }
  // A reload that started before the write wouldn't see it, so wait it out and start one
  await reloading?.catch(() => undefined)
  reloading = reloadContent($, includeBuiltins, idleTimeoutSec).finally(() => {
    reloading = undefined
  })
  const { note } = await reloading
  $.ui.toast(`Modster Hunter: ${name} is ${change.off ? 'off' : 'on'}${note}`)
}

/**
 * Picks a new biome after the session's stopped loading (P4-02), keeping the
 * machine's turn and agent state; with none left the game stops until a reload.
 */
function moveToNewBiome($: EngineInterface, idleTimeoutSec: number): LoadedBiome | undefined {
  retiredBiome = undefined
  biomeId = content ? pickBiome(content.biomes.keys(), Math.random) : undefined
  if (biomeId !== undefined) void keepState($, 'biomeId', biomeId)
  const loaded = biomeId === undefined ? undefined : content?.biomes.get(biomeId)
  if (!machine) {
    startMachine($, idleTimeoutSec)
    return loaded
  }
  setScene($, loaded)
  if (!content || !loaded) {
    tickTimer?.cancel()
    tickTimer = undefined
    stopFrames()
    machine = undefined
    shownDots = undefined
    machineContext = undefined
    encounterModster = undefined
    updateStatus($)
    return undefined
  }
  machineContext = playContext(content, loaded, idleTimeoutSec)
  updateSceneTimer($)
  return loaded
}

/**
 * Loads built-in and user content, merged by id (decision 0007). Problems go
 * to the debug log, not the transcript; the Settings tab lists them (P4-02).
 */
async function loadGameContent($: EngineInterface, includeBuiltins: boolean): Promise<MergedContent> {
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
  const summary = `${registry.biomes.size} biomes, ${registry.modsters.size} Modsters, ${registry.catchers.size} catchers, ${registry.issues.length} issues`
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
