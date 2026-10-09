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
 /modsters ──► pane (Collection · Biomes · Stats · Settings) ◄── reads store + content registry
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
│   ├── content/             # pure: schema types, validate, load through a ContentReader port, merge
│   ├── game/                # pure: random source, rarity resolver, encounter machine, scheduler
│   ├── render/              # pure: pixels → Raster cells, band and pane trees from state
│   └── store/               # pure: collection + stats over a store port, migrations
├── content/                 # built-in biomes and Modsters (see CONTENT_FORMAT.md)
├── skills/                  # user-facing skills shipped with the mod (P4-04)
├── tests/                   # *.test.ts mirroring hooks/ paths, run by `claude plugin test`
└── types/index.d.ts         # PluginState declarations for $.state
```

## Event map

| Event | Purpose |
| --- | --- |
| `session.start` | Register `/modsters`, load content, pick the biome, restore `$.state` |
| `classic.SessionStart` (`clear`, `resume`, `fork`) | Re-copy stored values into `$.state` (reset by those commands) |
| `turn.start` / `turn.complete` | Tell the scheduler a turn is running / ended |
| `ui.render` `{ component: 'AbovePrompt' }` | Draw the encounter or idle line |
| `ui.render` `{ component: 'Pane' }` (our id) | Draw the collection pane |
| `command.run` `{ command: 'modsters' }` | Open the pane; subcommands like `reload` |
| `session.end` | Stop timers, flush stats (≤ 1.5 s total budget) |

## Where state lives

| Data | Where | Why |
| --- | --- | --- |
| Content registry, current biome | Module variable | Rebuilt on load; cheap |
| Current encounter (machine state) | Module variable in `register.tsx` | Not persisted (decision 0005); the band redraws via `$.ui.invalidate` when a step changes it, and `/clear` (which resets `$.state`) leaves it alone |
| Collection, stats | `$.store` | Persists across sessions (decision 0009) |
| User content | Files in `~/.claude/modster-hunter/content/` | Editable by hand, by the editor and by Claude |

## Budgets to respect

- A hook's own time: 10 s per event. Content loading must stay well below it.
- Redraws: throttled to 10/s (30/s for the visible band in the terminal). Use
  `$.ui.blit` for animation frames.
- `$.store`: 4 MiB total. `$.fs.read`: 4 MiB per file.
- `session.end` hooks: 1.5 s total.
