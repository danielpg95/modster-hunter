---
paths:
  - "plugin/hooks/**"
  - "plugin/types/**"
  - "plugin/.claude-plugin/**"
---

# Rules for mod code

- **TypeScript, strict.** No `any`; prefer `unknown` plus a type guard. Import
  mod types with `import type { … } from 'claude-code'`.
- **No runtime dependencies** besides `claude-code` until decision 0008 says
  otherwise. Vendored code goes in `plugin/hooks/vendor/` with its license header.
- **Layering** (docs/ARCHITECTURE.md):
  - `content/`, `game/`, `render/` are pure: no `$`, no clock, no `Math.random`.
    Time and randomness are passed in.
  - Only `register.ts` and `adapters/` call `$`. `store/` calls `$.store` only.
- **One concept per file**, named after its main export in kebab-case
  (`encounter-machine.ts` exports `encounterMachine`/`EncounterMachine`). Folders
  get an `index.ts` re-export when they hold more than one file.
- **Tunable numbers live in `constants.ts`**, with a comment naming the decision
  they come from. No magic numbers elsewhere.
- **Hooks always end in `next(e)`** unless they deliberately answer the event.
  A `ui.render` hook for a site we don't own returns `next(e)` immediately.
- **Check the pane id** (`e.requestId`) before drawing in a `Pane`.
- **Optional `true`-only props** (`focus`, `closeOnEscape`, `holdToasts`,
  `autoFocus`): add them conditionally, never pass `false`.
- **Every control has a stable `key`**, so tests can press it.
- **Check `e.surface`.** For anything `Raster`/`Image` based, draw text when
  the surface isn't `terminal` (until P5-06).
- **Start timers in `session.start`**, never at module top level; stop them on
  `session.end` and when an encounter ends.
- **Errors never escape to the user as a crash.** Catch at the adapter
  boundary, show a short line (`$.ui.toast` or the Settings tab), log details.
- **Comment the why**, especially where a mods API limit drives the code
  (link the docs section).
- After changing hooks, run `claude plugin validate ./plugin --strict` and make
  sure the `hooks:` and `calls:` lists contain nothing unexpected. A new API
  call (network, process, model) needs a decision first.
