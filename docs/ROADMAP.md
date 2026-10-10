# Roadmap

The plan, divided into phases. Each task has an ID (`P2-04`), dependencies, a
size and a "done when" list. Work on a task only after claiming it in
[`WORKBOARD.md`](WORKBOARD.md) (see [CONTRIBUTING](../CONTRIBUTING.md)).

**Format rules** (parsed by `tools/check-tracking.mjs`, keep them exact):

- A task heading is `#### [ ] PN-NN — Title`, or `#### [x] PN-NN — Title` when done.
- `- **Depends on:**` lists task IDs separated by commas, or `—` for none.
- `- **Size:**` is `S` (≤ half a day), `M` (1–2 days) or `L` (3+ days; consider splitting).
- New tasks get the next free number in their phase. Never renumber or reuse an ID.

**Phase gate:** a phase is finished when all its tasks are `[x]` and a phase
review exists in `docs/sessions/` (template: `docs/templates/phase-review.md`).
Tasks in the next phase may start earlier if their own dependencies are done.

---

## Phase 0 — Foundations

Goal: anyone can clone the repo, load the (empty) mod, and run the checks.

#### [x] P0-01 — Contributor scaffolding
- **Depends on:** —
- **Size:** M
- **Goal:** CLAUDE.md, rules, skills, roadmap, workboard, decisions, templates, GitHub templates.
- **Done when:**
  - [x] A new contributor can find what to work on and how, from `CLAUDE.md` alone.
  - [x] `node tools/check-tracking.mjs` passes.

#### [x] P0-02 — Marketplace and plugin skeleton
- **Depends on:** P0-01
- **Size:** S
- **Goal:** the repo is installable as a marketplace and the plugin loads.
- **Done when:**
  - [x] `.claude-plugin/marketplace.json` at the repo root lists the plugin at `./plugin`.
  - [x] `plugin/.claude-plugin/plugin.json` (name `modster-hunter`, `userConfig` placeholders from CONTENT_FORMAT.md), `plugin/hooks/hooks.json`, `plugin/hooks/register.ts`.
  - [x] `register.ts` registers `/modsters`, which replies "Modster Hunter is loaded".
  - [x] `claude plugin validate ./plugin --strict` passes.
  - [x] `claude --plugin-dir ./plugin` shows `1 mod active · modster-hunter` in `/plugin`.

#### [x] P0-03 — TypeScript and test setup
- **Depends on:** P0-02
- **Size:** S
- **Goal:** strict typechecking against the official mod types, and one passing test.
- **Done when:**
  - [x] `plugin/tsconfig.json` mirrors the official mods' settings (strict, `noUncheckedIndexedAccess`, `moduleResolution: bundler`).
  - [x] Types come from `/plugin-types` output, with instructions in `docs/DEVELOPMENT.md` for regenerating them.
  - [x] `plugin/tests/register.test.ts` tests the `/modsters` reply and passes with `claude plugin test ./plugin`.
  - [x] `package.json` scripts: `check` (tracking), `typecheck`, `test`, `validate`.

#### [x] P0-04 — Continuous integration
- **Depends on:** P0-03
- **Size:** S
- **Goal:** every PR is checked automatically.
- **Done when:**
  - [x] `.github/workflows/ci.yml` runs tracking check, JSON content check, `claude plugin validate --strict` and `claude plugin test` (typecheck can't run in CI; see next item).
  - [x] If the Claude Code CLI can't run in CI without auth, document which steps are skipped and why in `docs/DEVELOPMENT.md`. (No auth needed; typecheck is skipped because the types need an interactive session.)
  - [x] Branch protection on `main` requires CI (owner action; note it in the session log). (Done 2026-10-09: the `protect-main` ruleset requires both CI checks.)

---

## Phase 1 — Spike: prove the rendering and the loop feel right

Goal: answer the open technical questions with throwaway code before building
the real thing. Spike code lives in `spikes/` and is not shipped. Each spike
ends with findings written into a decision.

#### [x] P1-01 — Band encounter on turn start
- **Depends on:** P0-02
- **Size:** S
- **Goal:** a hardcoded colored square appears in the band 3 s after `turn.start`, with a `1: Throw` button.
- **Done when:**
  - [x] It appears only while a turn runs.
  - [x] Typing `1` in an empty prompt and pausing presses the button; typing `1` in a non-empty prompt doesn't.
  - [x] Findings (including `maxRows` seen at common terminal sizes) recorded in the session log.

#### [x] P1-02 — Half-block sprite renderer
- **Depends on:** P1-01
- **Size:** M
- **Goal:** draw a hand-written RGBA sprite in the band as a `Raster` with `▀` cells (decision 0001).
- **Done when:**
  - [x] Transparent pixels show the terminal background in light and dark themes.
  - [x] Largest sprite that fits the band in an 80×24 terminal and in a 120×40 terminal is measured and written into 0001 as a constraint.
  - [x] Pure function `pixelsToCells(frame) → base64` has unit tests.

#### [x] P1-03 — Animation with blit
- **Depends on:** P1-02
- **Size:** S
- **Goal:** loop a 4-frame sprite with `$.ui.blit` at 6–12 fps.
- **Done when:**
  - [x] No flicker; the transcript stays responsive while Claude streams.
  - [x] The animation timer stops when the encounter ends and on module reload.

#### [x] P1-04 — Image element check (kitty/Ghostty)
- **Depends on:** P1-02
- **Size:** S
- **Goal:** know whether the optional `Image` path is worth it.
- **Done when:**
  - [x] Same sprite drawn with `Image` (`{ rgba, width, height }`) in kitty or Ghostty, and the fallback `alt` checked in another terminal.
  - [x] Recommendation written in the session log (keep for P5 or drop).

#### [x] P1-05 — Sprite pipeline spike
- **Depends on:** P0-02
- **Size:** M
- **Goal:** settle decision 0008.
- **Done when:**
  - [x] Tested: `DecompressionStream` available in the mod runtime? A vendored inflate in a relative `.ts` import? An npm import?
  - [x] Decision 0008 is Accepted, amended, or superseded with the findings.

#### [x] P1-06 — Spike review
- **Depends on:** P1-01, P1-02, P1-03, P1-04, P1-05
- **Size:** S
- **Goal:** decide the sprite size limits and band layout for phase 2.
- **Done when:**
  - [x] Phase review written; `spikes/` code that will be reused is noted, the rest marked for deletion.

---

## Phase 2 — Core loop with built-in content

Goal: a complete, fun encounter loop with starter content. No customization yet.

#### [x] P2-01 — Content schema, types and validator
- **Depends on:** P0-03, P1-06
- **Size:** M
- **Goal:** the types and validation for `biome.json`, `modster.json` and `.sprite.json` from CONTENT_FORMAT.md.
- **Done when:**
  - [x] Validator returns a list of readable errors (file, field, problem), never throws.
  - [x] Unit tests cover every rule in CONTENT_FORMAT.md, including weight and bound checks.

#### [x] P2-02 — Sprite converter tool
- **Depends on:** P1-05, P2-01
- **Size:** M
- **Goal:** `tools/sprite.mjs <sheet.png> --frames N` writes a valid `.sprite.json` (decision 0008).
- **Done when:**
  - [x] Handles transparency, palettes > 64 colors (error with a hint), and GIF input if 0008 says so.
  - [x] Frames outside the 0012 bounds (width 8–24, height 8–12, even) fail with a hint.
  - [x] Output passes the P2-01 validator.

#### [x] P2-03 — Content loader (built-in only)
- **Depends on:** P2-01
- **Size:** M
- **Goal:** load `plugin/content/` at `session.start` via `$.fs`, validated, into an in-memory registry.
- **Done when:**
  - [x] Invalid files are skipped and listed, never crash the mod.
  - [x] Loading stays under the 10 s hook budget for 50 Modsters (measured).

#### [x] P2-04 — Biome selection per session
- **Depends on:** P2-03
- **Size:** S
- **Goal:** decision 0006.
- **Done when:**
  - [x] Random biome at `session.start`, kept across `/clear`, `/resume`, `/branch`.
  - [x] Tested with an injected random source.

#### [x] P2-05 — Rarity, attempts and catch-rate resolution
- **Depends on:** P2-01
- **Size:** S
- **Goal:** decision 0004 as one pure module plus its constants table.
- **Done when:**
  - [x] Precedence biome entry → Modster → tier default is unit tested.
  - [x] Encounter-odds table helper (`oddsTable`, `formatOddsTable`) printed and sanity-checked on the CONTENT_FORMAT example biome; the per-built-in-biome check moved to P2-09 (no built-in biomes yet).

#### [x] P2-06 — Encounter state machine
- **Depends on:** P2-05
- **Size:** L
- **Goal:** decision 0005 as a pure state machine driven by events (turn start/end, throw, tick).
- **Done when:**
  - [x] Every transition in 0005 has a test using a fake clock.
  - [x] Spawn timing uses the biome's `encounterEverySec` range; only one encounter at a time.
  - [x] Idle timeout and "new turn resets idle timer" are tested.

#### [x] P2-07 — Band encounter UI
- **Depends on:** P2-06, P1-06
- **Size:** M
- **Goal:** draw the state machine in the band: appear animation, Modster name and tier, attempts left, `1: Throw`, wobble, caught/fled card.
- **Done when:**
  - [x] Full and compact layouts per 0012; never exceeds `maxRows` (render tests at `maxRows` 0, 1, 2, 5, 6, 7).
  - [x] Idle line between encounters shows the current biome (or nothing, per a setting).
  - [x] Render tests on the terminal surface for each state.
  - [x] Starts from `spikes/p1-02-half-block/lib/pixels-to-cells.ts` (+ tests) and the timer and blit helpers in `spikes/p1-03-blit-animation/` (`lib/animation.ts`, skip-if-blit-in-flight); `spikes/` is deleted in this PR, except `spikes/p1-05-sprite-pipeline/lib/` if P4-01 hasn't moved it yet.

#### [x] P2-08 — Collection storage
- **Depends on:** P2-06
- **Size:** S
- **Goal:** decision 0009, over a store port built in `register.ts` (decision 0013).
- **Done when:**
  - [x] Catch writes `caught:<id>` with re-read-before-write; stats counters written.
  - [x] Tested with an in-memory store (`mock.store` can't be read back from a test), including a simulated second session writing in between.

#### [ ] P2-09 — Starter content
- **Depends on:** P2-02, P2-13, P2-17
- **Size:** L
- **Goal:** 3 biomes × 5 Modsters, original pixel art, using the `add-biome`/`add-modster` skills.
- **Done when:**
  - [ ] Each biome has at least one Modster per tier from common to rare, and one legendary across all biomes.
  - [ ] Every sprite has 2–4 animation frames and an entry in `plugin/content/CREDITS.md`.
  - [ ] All content passes the validator.
  - [ ] `formatOddsTable(oddsTable(…))` printed for each built-in biome and sanity-checked (moved from P2-05; @victor-aguilars, 2026-10-08).
  - [ ] Every built-in Modster has a complete `dex` with numbers 1–15 (decision 0017; added 2026-10-09).

#### [ ] P2-10 — Phase 2 playtest
- **Depends on:** P2-04, P2-07, P2-08, P2-09
- **Size:** S
- **Goal:** play it for real sessions and tune.
- **Done when:**
  - [ ] At least 2 people played ≥ 1 hour of real work each; feedback in the phase review.
  - [ ] Tier defaults in 0004 tuned (amend via a new decision if numbers change).

#### [x] P2-11 — Background agents count as work time
- **Depends on:** P2-06
- **Size:** S
- **Goal:** decision 0018: the spawn countdown runs, and new encounters can spawn, while a turn or any subagent runs.
- **Done when:**
  - [x] `classic.SubagentStart` / `classic.SubagentStop` (by `agent_id`) feed the encounter machine; overlapping turns and agents count once.
  - [x] Fake-clock tests: spawn while only an agent runs; overlap counted once; an agent with no stop event stops counting after `AGENT_WORK_MAX_MIN` (30 min); agents cleared at `session.end`.

#### [x] P2-12 — Encounter pane
- **Depends on:** P2-07
- **Size:** M
- **Goal:** decision 0015 (accepted 2026-10-09): `/modsters hunt` opens a pane with the live encounter, and the band steps aside while it shows.
- **Done when:**
  - [x] The pane draws the biome and every encounter phase at the sprite's normal size; Throw works from it.
  - [x] The band draws nothing while the pane is open, placed and shown, and takes the encounter back when it isn't.
  - [x] The mod never opens the pane by itself; render tests cover the pane and the band stepping aside.

#### [x] P2-13 — Modster dex fields
- **Depends on:** P2-01
- **Size:** S
- **Goal:** decision 0017: `modster.json` takes an optional `dex` (number, type, category, height, weight, entry), validated and merged.
- **Done when:**
  - [x] Unit tests cover every `dex` rule in CONTENT_FORMAT.md, including the 18 types, a `number` in a user file, and a user override keeping the built-in number.
  - [x] `npm run check:content` fails when a built-in Modster's `dex` is incomplete or two numbers clash.
  - [x] CONTENT_FORMAT.md, the content templates and the `add-modster` skill describe `dex`.

#### [x] P2-15 — Run from an encounter
- **Depends on:** P2-07, P2-08, P2-12
- **Size:** S
- **Goal:** decision 0020: a `2: Run` button lets the player end a waiting encounter; it ends as `ran`, with its own card and stats counter.
- **Done when:**
  - [x] The machine accepts `run` only while waiting; it ends in a `ran` result card for the usual result time, then the normal countdown; fake-clock tests, including presses during appearing and the wobble being ignored.
  - [x] A `run` stats event is counted apart from flees (tested with an in-memory store; `mock.store` hides its contents).
  - [x] Band and pane show `2: Run` per 0020's layouts; render tests at `maxRows` 1, 2 and 7, including a narrow band where Run is left out and Throw stays.

#### [x] P2-14 — Reopen the encounter pane
- **Depends on:** P2-12
- **Size:** S
- **Goal:** decision 0019: the encounter pane reopens at session start for people who opened it, until they close it by hand.
- **Done when:**
  - [x] `/modsters hunt` stores `prefs:huntPane` `{ v: 1, open: true }`; a close with origin `person` stores `open: false`; `plugin` and `unload` closes change nothing (the close rule is unit-tested; the test engine has no `$.ui.close` to raise one).
  - [x] `session.start` and `classic.SessionStart` reopen the pane when `open` is true, without focus; tested, including an unplaced pane (band keeps the encounter).


#### [ ] P2-16 — Sprites up to 48×48
- **Depends on:** P2-01, P2-02, P2-07, P4-01
- **Size:** S
- **Goal:** decision 0021 (Proposed; start only once @danielpg95 accepts it): sprites may be 8–48 wide and 8–48 tall, and the band and pane show their compact layout where a sprite doesn't fit.
- **Done when:**
  - [x] `CONTENT.sprite` bounds are 8–48 × 8–48; the validator, `tools/sprite.mjs` and user PNG sheets accept a 48×48 sprite and reject 50×48 and 48×50 (tests).
  - [x] Render tests: a 48×48 sprite shows the compact band at `maxRows` 7 and 15, full size in a pane with 26 body rows, and compact in a shorter pane.
  - [ ] A 48×48 sprite animates at 8 fps without flicker in a real terminal (checked by hand, noted in the handoff).
  - [x] CONTENT_FORMAT.md and the `add-modster` skill describe the bounds, where each size shows, and recommend ≤ 24×12 unless a Modster needs more.

#### [x] P2-17 — Up to two types
- **Depends on:** P2-13
- **Size:** S
- **Goal:** decision 0022: `dex.types` (1–2 types, first one primary) replaces `dex.type`.
- **Done when:**
  - [x] Unit tests: one and two types are valid; zero, three, a repeat, an unknown type and the old `dex.type` are errors, the last one naming `types`.
  - [x] `npm run check:content` requires `types` for built-in Modsters; the four placeholders use `types`.
  - [x] CONTENT_FORMAT.md, the `modster.json` template and the `add-modster` skill describe `types`.

---

## Phase 3 — Collection pane

Goal: `/modsters` opens a pane to browse what you've caught.

#### [ ] P3-01 — Pane shell and tabs
- **Depends on:** P2-10
- **Size:** S
- **Goal:** `/modsters` opens a focused pane with tabs Collection · Biomes · Stats · Settings, Esc closes it.
- **Done when:**
  - [ ] Tabs switch by hotkeys `1`–`4`; layout adapts to `bodyColumns` and to inline vs docked placement.

#### [ ] P3-02 — Collection grid
- **Depends on:** P3-01
- **Size:** M
- **Goal:** caught Modsters in color, uncaught as dark silhouettes ("???"), count and best tier on each.
- **Done when:**
  - [ ] Selecting one shows a detail view: animated sprite, biomes found in, first/last caught, and the dex (decision 0017; `???` until caught).
  - [ ] Scrolls correctly with many Modsters.

#### [ ] P3-03 — Biomes tab
- **Depends on:** P3-01
- **Size:** S
- **Goal:** list biomes, the current one marked, each with its Modsters and their encounter %.
- **Done when:**
  - [ ] Percentages match the P2-05 resolver.

#### [ ] P3-04 — Stats tab
- **Depends on:** P3-01
- **Size:** S
- **Goal:** totals: encounters, catches, flees, catch ratio, turns played, by biome.
- **Done when:**
  - [ ] Aggregates `stats:*` keys and compacts old ones (decision 0009).

#### [ ] P3-05 — Phase 3 review
- **Depends on:** P3-02, P3-03, P3-04
- **Size:** S
- **Goal:** phase review written.
- **Done when:**
  - [ ] Review in `docs/sessions/`.

---

## Phase 4 — User content and customization

Goal: users keep or remove built-ins and add, edit, and remove their own biomes and Modsters.

#### [x] P4-01 — User content folder and merge
- **Depends on:** P2-03
- **Size:** M
- **Goal:** decision 0007 points 2–5: load `~/.claude/modster-hunter/content/`, override by id, disable lists, `includeBuiltins`.
- **Done when:**
  - [x] Merge rules unit tested; zero-biome case shows one clear message.
  - [x] User PNG sprites decode in the mod and are cached (0016), starting from `spikes/p1-05-sprite-pipeline/lib/inflate.ts` and `lib/png.ts` moved to `plugin/` with unit tests; 1-, 2- and 4-bit palette PNGs decode too (PIL and optimizers write ≤ 16-color palettes that way).

#### [ ] P4-02 — `/modsters reload` and error reporting
- **Depends on:** P4-01, P3-01
- **Size:** S
- **Goal:** reload content without restarting; Settings tab lists every content error.
- **Done when:**
  - [ ] An in-progress encounter is unaffected by reload.

#### [ ] P4-03 — In-pane editor
- **Depends on:** P4-02
- **Size:** L
- **Goal:** edit a biome's or Modster's name, weights, catch rate, attempts; enable/disable; delete user items (with confirmation).
- **Done when:**
  - [ ] Edits write valid JSON into the user folder; editing a built-in creates a user override.
  - [ ] Every edit is validated before writing.

#### [ ] P4-04 — User-facing content skill
- **Depends on:** P4-01, P2-02
- **Size:** M
- **Goal:** `plugin/skills/create-modster-content/SKILL.md`: users ask Claude to create a biome or Modster (including pixel art), and it writes valid files into the user folder.
- **Done when:**
  - [ ] Claude converts PNG/GIF sprites through the converter (or the runtime path from 0016).
  - [ ] Tested end to end by someone who didn't write it.

#### [ ] P4-05 — Phase 4 review
- **Depends on:** P4-02, P4-03, P4-04
- **Size:** S
- **Goal:** phase review written.
- **Done when:**
  - [ ] Review in `docs/sessions/`.

---

## Phase 5 — Extras, polish and release

#### [ ] P5-01 — Shiny variants
- **Depends on:** P2-10
- **Size:** M
- **Goal:** a small chance (default 1/256, per-Modster override) of a recolored shiny, via an alternate palette in `.sprite.json`.
- **Done when:**
  - [ ] Shiny counted separately in the collection; sparkle effect on appear.

#### [ ] P5-02 — Sounds
- **Depends on:** P2-10
- **Size:** S
- **Goal:** short sounds via `$.audio.play` on appear, catch and flee, off by default.
- **Done when:**
  - [ ] `userConfig` toggle; every sound licensed and credited.

#### [ ] P5-03 — Extended stats and milestones
- **Depends on:** P3-04
- **Size:** S
- **Goal:** fun stats ("caught during 42 turns", longest streak, first legendary) shown as toasts on milestones.
- **Done when:**
  - [ ] Milestones never interrupt typing (toasts only).

#### [ ] P5-05 — Light skill catch experiment
- **Depends on:** P2-10
- **Size:** M
- **Goal:** prototype the moving-marker mechanic (decision 0003), behind a setting.
- **Done when:**
  - [ ] Playtested; a decision accepts or rejects it.

#### [ ] P5-06 — Desktop app support
- **Depends on:** P2-07, P3-02
- **Size:** L
- **Goal:** draw sprites as `Svg` when `e.surface` is `desktop`.
- **Done when:**
  - [ ] Band and pane work in the Desktop app's Code tab.

#### [ ] P5-07 — Release v1.0
- **Depends on:** P4-05
- **Size:** S
- **Goal:** public release.
- **Done when:**
  - [ ] README with install instructions and a recording; CHANGELOG; version tag; marketplace entry tested from a clean machine.

#### [x] P5-08 — Display settings
- **Depends on:** P2-12, P2-14
- **Size:** M
- **Goal:** the person picks where the game shows: band, encounter pane, spinner teaser, status line, in any combination (issue #35, accepted by @danielpg95).
- **Done when:**
  - [x] A decision settles the `userConfig` option: its name, the places, the default (band, spinner and status line on; pane as today), and how it relates to 0019's pane reopening (0023).
  - [x] Every place draws from the same encounter machine; one Throw per encounter, and turning the band off never leaves Throw unreachable.
  - [x] Option documented in CONTENT_FORMAT.md's `userConfig` table; tested with each place on and off.

#### [ ] P5-09 — Sprite miniatures (spike)
- **Depends on:** P2-16
- **Size:** S
- **Goal:** when a sprite doesn't fit the band or pane, show a miniature instead of the text-only layout (issue #54, accepted by @danielpg95). Only matters once decision 0021 is accepted.
- **Done when:**
  - [ ] A spike checks whether `Raster` takes quadrant characters (`▘▝▖▗▚▞▙▛▜▟▌▐`), how they render in Ghostty, iTerm2, kitty and Windows Terminal, and whether a 2× downscale still reads as the Modster; screenshots of a 2× downscale and quadrant blocks for Sunmane in an 80×24 band.
  - [ ] A decision picks an approach (2× downscale, quadrants, a hand-drawn mini sprite, a mix, or none).
  - [ ] If one is picked, a roadmap task implements it, with render tests at `maxRows` 7 for a sprite taller than 14 px and the miniature never taller than `maxRows`.
