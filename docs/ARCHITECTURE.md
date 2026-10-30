# Architecture

How the mod is put together. This describes the **target** shape; folders
appear as their roadmap tasks land. If code and this file disagree, fix one of
them in the same PR.

## The game in one picture

```
 turn.start ──► scheduler ──(random delay from biome)──► encounter machine
 turn.complete ─┘                                            │   ▲
                                                             │   │ throw (band button, hotkey 1)
                                     band view ◄── state ────┘   │ tick (clock)
                                     ($.ui.blit frames)          │
                                                             caught? ──► collection store ($.store)
 /modsters ──► pane (Collection · Biomes · Stats · Catchers · Settings) ◄── reads store + content registry
 session.start ──► content loader (built-in + user, validated, merged) ──► registry ──► biome pick
```

## Layers

The core rule: **game logic never touches `$`.** Everything that decides
something is a pure function or a pure state machine, tested without a session.

The engine follows `$` only into functions declared in the same file, so every
`$` call lives in `register.ts` (decision [0013](decisions/0013-host-calls-in-register.md)).
Modules that need the host take a **port**, a small interface of plain async
functions (e.g. `ContentReader`), which `register.ts` builds from `$` and tests
replace with in-memory fakes.

```
plugin/
├── .claude-plugin/plugin.json
├── hooks/
│   ├── hooks.json
│   ├── register.ts          # wiring: on(...) calls, and the only file that calls $ (builds ports)
│   ├── constants.ts         # tunables: tier table, timings, limits (one place)
│   ├── encounter-controls.tsx # surface module (a Client): the desktop encounter's Throw, Run and Modster clicks (0051); no `$`, posts to `ui.message`
│   ├── content/             # pure: schema types, validate, load through a ContentReader port, merge
│   ├── game/                # pure: random source, rarity resolver, encounter machine, scheduler
│   ├── render/              # pure: pixels → Raster cells, band and pane trees from state
│   ├── store/               # pure: collection + stats over a store port, migrations
│   └── vendor/              # our own dependency-free code kept apart: inflate, PNG and GIF decode (0016, 0025)
├── content/                 # built-in biomes and Modsters (see CONTENT_FORMAT.md)
├── skills/                  # user-facing skills shipped with the mod (P4-04); the content helper in scripts/ (0025)
├── tests/                   # *.test.ts mirroring hooks/ paths, run by `claude plugin test`
└── types/index.d.ts         # PluginState declarations for $.state
```

## Event map

| Event | Purpose |
| --- | --- |
| `session.start` | Register `/modsters` (with its subcommands as the typeahead hint), load content, pick the biome, restore `$.state`, show the welcome toast once (`prefs:welcomed`, 0038, 0041), clear the status line, and, only while `autoStart` is on, start the game and open the encounter pane as `encounterPane` says: if `prefs:huntPane` says so (0019), every session, or never (0023). While off, close an encounter pane left open |
| `classic.SessionStart` (`clear`, `resume`, `fork`) | Re-copy stored values into `$.state` (reset by those commands); while `autoStart` is on, open the encounter pane as at `session.start` (0019, 0023) and, after a `session.end` (which they fire), restart the game on the same biome under the new session id (P5-15) |
| `turn.start` / `turn.complete` | Tell the scheduler a turn is running / ended |
| `classic.SubagentStart` / `classic.SubagentStop` | Tell the scheduler a subagent is running / stopped, by `agent_id`; work time includes it (0018) |
| `ui.render` `{ component: 'AbovePrompt' }` | Draw the encounter, or the idle line with the biome's scene above it (0026); one row during encounters only with `showInBand` off (0023) |
| `ui.render` `{ component: 'Pane' }` (our id) | Draw the collection pane (P3), or the encounter pane `modster-hunt` (0015), with the biome's scene between encounters (0027) |
| `ui.message` (key `encounter-controls`) | Throw or Run from the desktop encounter's Client: its buttons or a click on the Modster (0051) |
| `ui.render` `{ component: 'Spinner' }` | Name the Modster in the main turn's spinner while an encounter is up (`showInSpinner`, 0023) |
| `ui.close` | The encounter pane closed: redraw so the band takes the encounter back (0015); a close by hand stores `prefs:huntPane` `open: false` (0019) |
| `command.run` `{ command: 'modsters' }` | Registered `immediate`, so it runs during a turn too, and never reads the turn (0039). Open the collection pane; `hunt` and `stop` turn the game on and off through `$.config.set` on `autoStart` (0038); `pane` opens the encounter pane (0015), starting the game if it's off, and stores `prefs:huntPane` `open: true` (0019), or answers that it's off with `encounterPane: off` (0023); `settings` opens the collection pane on its Settings tab (0040); `reload` reloads content; `help` and an unknown word reply with the commands (0038) |
| `session.end` | Clear running turn and subagents, stop timers, clear the status line, flush stats (≤ 1.5 s total budget) |

## Where state lives

| Data | Where | Why |
| --- | --- | --- |
| Content registry | Module variable | Rebuilt on load; cheap |
| Current biome | Module variable, kept in `$.state` (`biomeId`) | A `/config` change reloads the mod; `session.start` reads it back so the session keeps its biome (decisions 0006, 0040) |
| Current encounter (machine state) | Module variable in `register.tsx` | Not persisted (decision 0005); the band redraws via `$.ui.invalidate` when a step changes it, and `/clear` (which resets `$.state`) leaves it alone |
| Whether the game runs (`autoStart`) | `userConfig`, read once per load, kept in a module variable `hunting` | `/modsters hunt` and `stop` write it through `$.config.set` and start or stop the game at once (decision 0038) |
| Display settings (`showInBand`, `encounterPane`, `showInSpinner`, `showInStatusLine`) | `userConfig`, read once per load | A change in `/config` reloads the module (decision 0023) |
| Status line | `$.ui.status`, updated when an encounter step changes it | Shown only while an encounter is up (decision 0023) |
| Collection, stats | `$.store` | Persists across sessions (decision 0009); session `stats:` keys idle 24 hours fold into `stats:total` (0029) |
| The collection pane's shown tab | Module variable in `register.tsx`, kept in `$.state` (`paneTab`) | Set by a tab's `onPress` and `/modsters settings`, which also write `$.state` (a render hook can't); a reopened pane shows the last tab (P3-01), and so does the pane after a reload (0040) |
| The Collection tab's records and selection | Module variables in `register.tsx` | Render hooks can't wait on `$.store`, so `caught:*` records are read at session start, on `/modsters` and after a catch (P3-02) |
| The Biomes tab's selected biome | A module variable in `register.tsx` | Starts on the session's biome; kept across tabs and reopening (P3-03). Its odds and caught counts come from the same records as the Collection tab. Its scene runs on its own timer while the tab draws it (0028) |
| The Stats tab's summed stats | A module variable in `register.tsx` | Read, after folding idle session keys (0029), when the tab is pressed or `/modsters` opens on it (P3-04) |
| Whether the encounter pane reopens (`prefs:huntPane`) | `$.store` | Set by `/modsters pane`, cleared by a close by hand (decision 0019); used only while `autoStart` is on (0038) |
| Whether the welcome toast was shown (`prefs:welcomed`, `{ v: 1 }`) | `$.store` | Written once, at the first session start, before `autoStart` changes (decision 0038) |
| The catcher in use (`prefs:catcher`, `{ v: 1, id }`) | `$.store` | Set by `u` in the Catchers tab, read at session start; missing or unknown means `jar` (decision 0035 points 9–10). A throw keeps the catcher it started with |
| The options as the Settings tab shows them, and its selected row | Module variables in `register.tsx` (`settingValues`, `settingsSelected`, the row also kept in `$.state`) | Read from the load's options; the tab's `o`, `/modsters hunt` and `stop` update them after `$.config.set` succeeds. A changed idle timeout waits in `pendingIdleTimeoutMs` until no encounter is up (decision 0040) |
| The Catchers tab's selection and preview | Module variables in `register.tsx` | Starts on the catcher in use (P5-30). The preview loops a catch on the Modster caught last, or a silhouette, on its own timer while the tab shows it |
| User content | Files in `~/.claude/modster-hunter/content/` | Editable by hand, by the editor and by Claude |
| Decoded user PNG sprites | Files in `~/.claude/modster-hunter/cache/sprites/` | Keyed by the PNG's size, mtime and frame count; safe to delete (decision 0016) |

## Budgets to respect

- A hook's own time: 10 s per event. Content loading must stay well below it.
- Redraws: throttled to 10/s (30/s for the visible band in the terminal). Use
  `$.ui.blit` for animation frames. The idle scene blits only while Claude
  works, and its timer stops between turns (0026 point 5).
- `$.store`: 4 MiB total. `$.fs.read`: 4 MiB per file.
- `session.end` hooks: 1.5 s total.
