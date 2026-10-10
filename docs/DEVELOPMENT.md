# Development

How to run, test and debug the mod. Commands marked *(from P0-0x)* work once
that roadmap task is done.

## Requirements

- Claude Code **v2.1.287 or later** (`claude --version`). Package managers can
  lag (the Homebrew cask was at 2.1.285 on 2026-10-07); update with
  `claude update` or `npm i -g @anthropic-ai/claude-code@latest`. Older builds
  load mods only with `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`.
- Node.js **22.18+** for the repo tools in `tools/` (`tools/sprite.mjs` loads the mod's
  TypeScript with Node's built-in type stripping). With nvm: `nvm install 22`.
  `tools/check-tracking.mjs` alone also runs on Node 20.
- A terminal at least 100 columns wide for comfortable testing. Also test at 80×24.

## Everyday loop

```bash
# Run Claude Code with the mod loaded from source. Saving a file reloads it.
claude --plugin-dir ./plugin                  # (from P0-02)

# Check the plugin: manifest, hooks module, events used, API calls made
claude plugin validate ./plugin --strict      # (from P0-02)

# Run the mod's tests
claude plugin test ./plugin                   # (from P0-03; or npm test)

# Check the roadmap/workboard format and list claimable tasks
node tools/check-tracking.mjs
node tools/check-tracking.mjs --next
```

In a `--plugin-dir` session, a refused drawing prints a transcript line such as
`ui.render (AbovePrompt) refused: …`. That's the first place to look when
nothing shows up. The debug log has the same line.

## Types

The mod is TypeScript, typed against Claude Code's own declarations. They are
generated, not committed (the folder carries its own `.gitignore`), so a fresh
clone must write them before `npm run typecheck`:

1. Start an **interactive** session with the mod: `claude --plugin-dir ./plugin`.
   Loading it writes `plugin/.claude-plugin/types/`, including the
   `tsconfig.json` that `plugin/tsconfig.json` extends. Exit once it's up.
   A headless `claude -p` run doesn't write them, and there is no
   `/plugin-types` command in 2.1.295.
2. Run `npm install` once (for `tsc`), then `npm run typecheck`.

The declarations match the build that wrote them (first line of
`claude-code/index.d.ts`). After upgrading Claude Code, start an interactive
session with the mod again before typechecking.

`plugin/tsconfig.json` repeats the settings the official mods use (`strict`,
`noUncheckedIndexedAccess`, `moduleResolution: bundler`) so they hold even if the
generated file changes.

## npm scripts

Run from the repo root (`npm install` first):

| Script | Runs |
| --- | --- |
| `npm run check` | `node tools/check-tracking.mjs` |
| `npm run typecheck` | `tsc -p plugin --noEmit` (needs the generated types) |
| `npm test` | `claude plugin test ./plugin` |
| `npm run validate` | `claude plugin validate ./plugin --strict` |
| `npm run sprite -- <file>` | `tools/sprite.mjs`, see [Sprites](#sprites) (Node 22.18+) |
| `npm run test:tools` | The tools' tests, `tools/*.test.mjs` (Node 22.18+) |
| `npm run check:content` | Loads `plugin/content/` with the mod's loader, prints each biome's odds table, fails on any issue (Node 22.18+) |

## Tests

Tests live in `plugin/tests/*.test.ts` and import from `claude-code/testing`.
A test gets `($, on)`: `$` drives events, and `on` registers hooks that run
*after* the mod and stand in for Claude Code. Anything the mod asks of the host
must be stubbed, or the hook fails with `no implementation for …`:

```ts
on('session.start', ($, e) => ({ cwd: e.cwd }))
on('command.register', ($, e) => ({ value: { command: e.name } }))  // { value } or { deny }
```

See `plugin/tests/register.test.ts` for a full example.

## Sprites

`tools/sprite.mjs` turns art into the `.sprite.json` the mod reads (decisions 0008, 0016):

```bash
npm run sprite -- plugin/content/modsters/<id>/sprite.png --frames 4   # PNG sheet, frames side by side
npm run sprite -- path/to/idle.gif                                      # animated GIF, one frame per GIF frame
```

It writes `<name>.sprite.json` next to the input (or `--out <file>`), and fails
with a hint when frames are outside 8–48 × 8–48 (even), the sheet doesn't split
into equal frames, or the art has more than 63 colors. Any PNG works (pngjs);
alpha is snapped to transparent below 128 and opaque from 128. The conversion is
`spriteFromSheet` in `plugin/hooks/content/`, the same code the mod uses for
user PNGs (`spriteFromPng`, decision 0016). Never hand-edit the output.

`npm run test:tools` runs the tool's tests (`tools/*.test.mjs`, Node's test runner).
## Continuous integration

`.github/workflows/ci.yml` runs on every PR and on pushes to `main`:

| Job | Steps |
| --- | --- |
| Tracking and content checks | `node tools/check-tracking.mjs`; every `*.json` file parses |
| Plugin validate and tests | Installs Claude Code (pinned in `CLAUDE_CODE_VERSION`), then `claude plugin validate ./plugin --strict` and `claude plugin test ./plugin` |
| Tools tests | Node 22, `npm ci`, then `npm run test:tools` (the sprite converter) and `npm run check:content` (built-in content) |

Neither `claude plugin` command needs a login or network access, so CI runs
them as they are.

**Skipped in CI: `npm run typecheck`.** `tsc` needs the generated types in
`plugin/.claude-plugin/types/`, and only an interactive session writes them
(see [Types](#types)); CI can't start one. Run `npm run typecheck` locally
before pushing; CI won't catch type errors.

When you upgrade Claude Code for development, bump `CLAUDE_CODE_VERSION` in the
workflow in the same PR.

## Things that are easy to get wrong

- **`focus`, `closeOnEscape`, `holdToasts`, `autoFocus` accept only `true`.**
  Passing `false` throws. Omit the field instead.
- **A `ui.render` hook can read `$.state` but can't write it.** Write from
  callbacks (`onPress`) or other events' hooks.
- **`/clear`, `/resume`, `/branch` reset `$.state`** without firing
  `session.start`. Reload stored values on `classic.SessionStart`.
- **`$.store` is shared across sessions** and not atomic. Re-read before write,
  one key per item (decision 0009).
- **Never exceed the band's `maxRows`.** A taller band scrolls and bare-digit
  hotkeys stop working.
- **A pane the mod opens by itself** only appears at ≥ 144 columns (≥ 110 for
  an id the person opened before, until they close it by hand). We never
  auto-open (decision 0002), except the encounter pane: reopened for people
  who opened it (decision 0019), or every session with `encounterPane: always`
  (decision 0023).
- **`Raster` cells must be one column wide.** `▀` is; emoji are not.
- **Timers** started with `$.clock.every` stop on reload. Start them in
  `session.start`, never at module top level.

## Reference

- Mods docs: <https://code.claude.com/docs/en/plugins/mods>
- Interface guide: <https://code.claude.com/docs/en/plugins/mods/interface>
- Reference (events, API, elements, limits): <https://code.claude.com/docs/en/plugins/mods/reference>
- Official example mods: <https://github.com/anthropics/claude-code/tree/main/mods>
  — `diff` is the best model for a pane with tests.
