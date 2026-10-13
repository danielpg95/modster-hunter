import type { EngineInterface, Register, Timer } from 'claude-code'
import { BAND, COLLECTION, USER_CONTENT } from './constants'
import {
  cachedSheetLoader,
  formatIssue,
  loadAllContent,
  noBiomesMessage,
  type ContentReader,
  type ContentRegistry,
  type LoadedBiome,
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
import {
  BAND_BUTTONS,
  COLLECTION_TABS,
  bandView,
  biomeEntries,
  biomeRow,
  biomesBody,
  oddsRow,
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
  spriteCells,
  type BandEncounter,
  type BandLine,
  type BiomeEntry,
  type CollectionEntry,
  type CollectionTab,
  type DisplayPlan,
  type IdleScene,
  type Particle,
} from './render'
import {
  HUNT_PANE_KEY,
  caughtKey,
  huntPanePref,
  isCaught,
  prefAfterClose,
  readCaughtRecord,
  readHuntPaneOpen,
  recordEncounterEvents,
  recordStat,
  type CaughtRecord,
  type StorePort,
} from './store'

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
// Its sprite animates on a loop of its own: the encounter's loop follows the encounter's Modster
const COLLECTION_SPRITE_KEY = 'collection-sprite'
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
  const idleTimeoutSec = typeof options.encounterIdleTimeoutSec === 'number' ? options.encounterIdleTimeoutSec : 90
  const showIdleLine = options.showIdleLine !== false
  const showIdleScene = options.showIdleScene !== false
  const includeBuiltins = options.includeBuiltins !== false
  display = readDisplaySettings(options)

  on('session.start', async ($, e, next) => {
    content = await loadGameContent($, includeBuiltins)
    biomeScenes.clear()
    if (content.biomes.size === 0) $.ui.toast(`Modster Hunter: ${noBiomesMessage(includeBuiltins, USER_FOLDER_LABEL)}`)
    sessionId = await $.session.id().catch(() => 'unknown')
    // Keep the biome if session.start ever repeats in this process; pick only when there's none yet
    if (biomeId === undefined || !content.biomes.has(biomeId)) biomeId = pickBiome(content.biomes.keys(), Math.random)
    startMachine($, idleTimeoutSec)
    loadCollectionRecords($)
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
      removeSceneSite(e.requestId)
      return next(e)
    }
    const modster = currentModster()
    const biome = biomeId === undefined ? undefined : content?.biomes.get(biomeId)?.biome
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
    const encounter = markedEncounter()
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

  // The collection pane (P3-01): tabs on hotkeys 1–4, which fire while the pane
  // holds the keys. Inline the tabs share the header row when they fit; docked
  // they get a row, or a row each when the dock is narrow
  on('ui.render', { component: 'Pane' }, ($, e, next) => {
    if (e.requestId !== COLLECTION_PANE_ID) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const biome = biomeId === undefined ? undefined : content?.biomes.get(biomeId)?.biome
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
          collectionTab = tab.id
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
    const tab = COLLECTION_TABS.find((info) => info.id === collectionTab) ?? COLLECTION_TABS[0]
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
            : <Text key="body">{tab?.placeholder}</Text>}
      </Box>
    )

    /** The Biomes tab: a summary line with k/j, the biome list, and the selected biome's odds (P3-03). */
    function biomesView(rows: number) {
      const entries = content ? biomeEntries(content.biomes.values(), content.modsters, collectionRecords, biomeId) : []
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
        </Box>
      )
      if (!selected) {
        dropBiomesSceneSite(e.requestId)
        return <Box key="biomes" flexDirection="column">{summary}</Box>
      }
      // Raster is terminal only (0012); 0028 point 3
      const loadedBiome = content?.biomes.get(selected.id)
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
          {selected.odds.length === 0 ? <Text dimColor>No Modsters loaded.</Text> : null}
          {selected.odds.map((row) => (
            <Box key={`odds-${row.id}`} flexDirection="row">
              {texts(oddsRow(row, selected.id), 'truncate')}
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
      const entries = collectionEntries(content ? content.modsters.values() : [], collectionRecords)
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
      const loaded = content?.modsters.get(selected.id)
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
    // Catches from other sessions show up when the pane opens
    loadCollectionRecords($)
    await pendingWrites
    // The person asked for it, so the pane takes the keys over an empty composer (0024)
    const opened = await $.ui.open({ id: COLLECTION_PANE_ID, title: 'Modster collection', focus: true, closeOnEscape: true })
    return opened.isPlaced ? {} : { text: 'Modster Hunter: the collection is waiting for more room (widen the terminal)' }
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
  machineContext = undefined
  alreadyCaught = false
  cellsByModster.clear()
  const loaded = biomeId === undefined ? undefined : content?.biomes.get(biomeId)
  scene = loaded && idleScene(loaded.biome, loaded.background)
  loggedSceneSkip = undefined
  if (loaded) $.ui.log(scene ? `idle scene: ${loaded.biome.id}, ${scene.rows} rows, timer ${scene.timerFps} fps` : `idle scene: ${loaded.biome.id} has none`, { to: 'debug' })
  particlesByColumns.clear()
  sceneTick = 0
  const biome = loaded?.biome
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
  // Before the redraw, so a scene that stops is drawn still
  updateSceneTimer($)
  $.ui.invalidate('ui.render')
  updateStatus($)
  const where = { sessionId, biomeId: machineContext.biome.id }
  if (step.events.length > 0) queueWrite($, (store) => recordEncounterEvents(store, where, step.events, now))
  for (const event of step.events) if (event.type === 'caught') refreshCollectionRecord($, event.modsterId)
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
  const ids = content ? [...content.modsters.keys()] : []
  queueWrite($, async (store) => {
    const records = await Promise.all(ids.map(async (id) => [id, readCaughtRecord(await store.get(caughtKey(id)))] as const))
    collectionRecords.clear()
    for (const [id, record] of records) if (record) collectionRecords.set(id, record)
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
  for (const { sprite } of content?.modsters.values() ?? []) {
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
