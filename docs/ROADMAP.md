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

#### [x] P2-09 — Starter content
- **Depends on:** P2-02, P2-13, P2-17
- **Size:** L
- **Goal:** 3 biomes × 5 Modsters, original pixel art, using the `add-biome`/`add-modster` skills. Closed by @danielpg95 on 2026-10-12 with the roster as it is: 3 biomes, 10 Modsters (#001–#010); more can be added on top later.
- **Done when:**
  - [x] Each biome has at least one Modster per tier from common to rare, and one legendary across all biomes.
  - [x] Every sprite has 2–4 animation frames and an entry in `plugin/content/CREDITS.md`.
  - [x] All content passes the validator.
  - [x] `formatOddsTable(oddsTable(…))` printed for each built-in biome and sanity-checked (moved from P2-05; @victor-aguilars, 2026-10-08).
  - [x] Every built-in Modster has a complete `dex` with numbers 1–10 (decision 0017; added 2026-10-09; the dex is closed at #010 for these biomes, 2026-10-12).

#### [x] P2-10 — Phase 2 playtest
- **Depends on:** P2-04, P2-07, P2-08, P2-09
- **Size:** S
- **Goal:** play it for real sessions and tune.
- **Done when:**
  - [x] At least 2 people played ≥ 1 hour of real work each; feedback in the phase review.
  - [x] Tier defaults in 0004 tuned (amend via a new decision if numbers change).

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


#### [x] P2-16 — Sprites up to 48×48
- **Depends on:** P2-01, P2-02, P2-07, P4-01
- **Size:** S
- **Goal:** decision 0021 (accepted by @danielpg95 on 2026-10-12): sprites may be 8–48 wide and 8–48 tall, and the band and pane show their compact layout where a sprite doesn't fit.
- **Done when:**
  - [x] `CONTENT.sprite` bounds are 8–48 × 8–48; the validator, `tools/sprite.mjs` and user PNG sheets accept a 48×48 sprite and reject 50×48 and 48×50 (tests).
  - [x] Render tests: a 48×48 sprite shows the compact band at `maxRows` 7 and 15, full size in a pane with 26 body rows, and compact in a shorter pane.
  - [x] A 48×48 sprite animates at 8 fps without flicker in a real terminal (checked by hand, noted in the handoff). Waived by @danielpg95 on 2026-10-12: not checked by hand; no built-in sprite is that big yet (the largest is 33×30).
  - [x] CONTENT_FORMAT.md and the `add-modster` skill describe the bounds, where each size shows, and recommend ≤ 24×14 unless a Modster needs more.

#### [x] P2-17 — Up to two types
- **Depends on:** P2-13
- **Size:** S
- **Goal:** decision 0022: `dex.types` (1–2 types, first one primary) replaces `dex.type`.
- **Done when:**
  - [x] Unit tests: one and two types are valid; zero, three, a repeat, an unknown type and the old `dex.type` are errors, the last one naming `types`.
  - [x] `npm run check:content` requires `types` for built-in Modsters; the four placeholders use `types`.
  - [x] CONTENT_FORMAT.md, the `modster.json` template and the `add-modster` skill describe `types`.

#### [x] P2-18 — Encounter pane focus and hints
- **Depends on:** P2-12, P2-14
- **Size:** S
- **Goal:** decision 0024 (accepted 2026-10-10): `/modsters hunt` gives the encounter pane the keys, and the pane shows `1: Throw` and how to move the keys between it and the prompt.
- **Done when:**
  - [x] `/modsters hunt` calls `$.ui.open` with `focus: true`; the reopen at session start (0019, `always`) still doesn't (tests).
  - [x] The pane's Throw and Run Buttons are `plain`; render tests show `1: Throw` and `2: Run` in the pane.
  - [x] Render tests cover the header hint for focused and not focused, docked and inline, per 0024 point 4; the hint is cut first in a narrow pane.
  - [x] `docs/DEVELOPMENT.md` notes that pane hotkeys need the pane focused and clicks need the fullscreen layout; 0015's status line names 0024.
  - [x] Checked by hand, inline and docked (`/tui fullscreen`): `/modsters hunt`, `1`, `Esc`, `ctrl+x tab`, `ctrl+x x` (noted in the handoff).

---

## Phase 3 — Collection pane

Goal: `/modsters` opens a pane to browse what you've caught.

#### [x] P3-01 — Pane shell and tabs
- **Depends on:** P2-10
- **Size:** S
- **Goal:** `/modsters` opens a focused pane with tabs Collection · Biomes · Stats · Settings, Esc closes it.
- **Done when:**
  - [x] Tabs switch by hotkeys `1`–`4`; layout adapts to `bodyColumns` and to inline vs docked placement. Checked by hand by @danielpg95 on 2026-10-12, inline and docked.

#### [x] P3-02 — Collection grid
- **Depends on:** P3-01
- **Size:** M
- **Goal:** caught Modsters in color, uncaught as dark silhouettes ("???"), count and best tier on each.
- **Done when:**
  - [x] Selecting one shows a detail view: animated sprite, biomes found in, first/last caught, and the dex (decision 0017; `???` until caught). Built as a list beside the selected Modster's detail (agreed with @danielpg95); checked by hand on 2026-10-13.
  - [x] Scrolls correctly with many Modsters. Render test with 31 Modsters; one layout per pane whatever is selected, checked by hand on 2026-10-13.

#### [x] P3-03 — Biomes tab
- **Depends on:** P3-01
- **Size:** S
- **Goal:** list biomes, the current one marked, each with its Modsters and their encounter %.
- **Done when:**
  - [x] Percentages match the P2-05 resolver.
  - [x] The selected biome's idle scene shows above the list, animated, and is left out when it doesn't fit (decision 0028).

#### [x] P3-04 — Stats tab
- **Depends on:** P3-01
- **Size:** S
- **Goal:** totals: encounters, catches, flees, catch ratio, turns played, by biome.
- **Done when:**
  - [x] Aggregates `stats:*` keys and compacts old ones (decisions 0009, 0029).

#### [x] P3-05 — Phase 3 review
- **Depends on:** P3-02, P3-03, P3-04
- **Size:** S
- **Goal:** phase review written.
- **Done when:**
  - [x] Review in `docs/sessions/`.

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

#### [x] P4-02 — `/modsters reload` and error reporting
- **Depends on:** P4-01, P3-01
- **Size:** S
- **Goal:** reload content without restarting; Settings tab lists every content error.
- **Done when:**
  - [x] An in-progress encounter is unaffected by reload.
  - [x] The Settings tab lists every content error, each formatted with `formatIssue`, with a test.
  - [x] After a reload, the collection pane re-reads caught records (`loadCollectionRecords`) and drops the cached `silhouettes`, `cellsByModster` and `biomeScenes`, and the Biomes scene site, with a test (from the phase 3 review).
  - [x] The unused tab `placeholder` entries in `plugin/hooks/render/collection-tabs.ts` are removed.

#### [x] P4-03 — In-pane enable, disable and delete
- **Depends on:** P4-02
- **Size:** S
- **Goal:** enable or disable a biome or Modster, and delete user items (with confirmation), from the collection pane. Field editing moved to P4-07 (phase 3 review). The mods API can't delete files, so delete goes through the content skill (decision 0032).
- **Done when:**
  - [x] Enable and disable write the user folder's disable lists (0007); disabling a built-in never touches `plugin/content/`.
  - [x] Delete asks for confirmation, removes only user files, and is offered only for user items: the pane shows the hint for user items, and `create-modster-content` does the delete (0032 point 7).
  - [x] The result is validated before writing, with tests.

#### [x] P4-04 — User-facing content skill
- **Depends on:** P4-01, P2-02, P4-06
- **Size:** M
- **Goal:** `plugin/skills/create-modster-content/SKILL.md`: users ask Claude to create a biome or Modster (including pixel art), and it writes valid files into the user folder.
- **Done when:**
  - [x] Claude converts PNG/GIF sprites through the converter (or the runtime path from 0016). The helper's `convert` (P4-06, 0025) for GIFs and PNGs, the runtime path for PNG sheets.
  - [x] Tested end to end by someone who didn't write it. Waived by @danielpg95 on 2026-10-12: tested end to end by @danielpg95 (Crystal Grotto, 10 Modsters, now built-in as P5-12), not by someone else.

#### [x] P4-06 — Content helper for users
- **Depends on:** P4-01, P2-02
- **Size:** M
- **Goal:** a dependency-free helper shipped with the P4-04 skill, run with `node`, that converts, draws, previews and checks user content (decision 0025).
- **Done when:**
  - [x] Decision 0025 accepted: a user-side helper, amending 0016 points 3 and 5.
  - [x] `plugin/hooks/vendor/png.ts` reads every PNG: grayscale, 16-bit and interlaced too, with unit tests; `docs/CONTENT_FORMAT.md` "User PNG sheets" updated (0025 point 7).
  - [x] `convert` turns a GIF, or a PNG sheet with `--frames`, into a `.sprite.json` through the mod's `spriteFromSheet`; the GIF decoder lives in `plugin/hooks/vendor/` with its license header.
  - [x] `draw` turns a palette and text pixel rows into a PNG sheet the mod decodes (0016).
  - [x] `preview` writes the sprite enlarged, every frame, on a dark and a light background.
  - [x] `check` runs the mod's validator and merge over the user folder and prints every issue with `formatIssue`.
  - [x] Writes only the files it's asked to; a Node too old to run it gets one clear message.
  - [x] Unit tests under `plugin/tests/` for the GIF decoder, `draw` and `check`.

#### [ ] P4-07 — In-pane field editor
- **Depends on:** P4-03, P5-17
- **Size:** M
- **Goal:** edit a biome's or Modster's name, tier, throws and catch rate from the collection pane, using the tier model P5-17 settles (0030 or its successor).
- **Done when:**
  - [ ] Edits write valid JSON into the user folder; editing a built-in creates a user override (0007).
  - [ ] Every edit is validated before writing, with tests.
- **Why:** split from P4-03 in the phase 3 review. Tier-first encounters (0030) replaced weights, and P5-17 may change which tier fields a player can set.

#### [ ] P4-05 — Phase 4 review
- **Depends on:** P4-02, P4-03, P4-04, P4-06, P4-07
- **Size:** S
- **Goal:** phase review written.
- **Done when:**
  - [ ] Review in `docs/sessions/`.

---

## Phase 5 — Extras, polish and release

#### [ ] P5-01 — Shiny variants
- **Depends on:** P2-10, P5-43
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

#### [x] P5-06 — Desktop app support
- **Depends on:** P2-07, P3-02
- **Size:** L
- **Goal:** draw sprites as `Svg` when `e.surface` is `desktop` (decision 0042).
- **Done when:**
  - [x] Band and pane work in the Desktop app's Code tab.

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
- **Goal:** when a sprite doesn't fit the band or pane, show a miniature instead of the text-only layout (issue #54, accepted by @danielpg95). Decision 0033 makes this the way small terminals get a picture: sprites are up to 32 px tall, so almost none fit an 80×24 band.
- **Done when:**
  - [ ] A spike checks whether `Raster` takes quadrant characters (`▘▝▖▗▚▞▙▛▜▟▌▐`), how they render in Ghostty, iTerm2, kitty and Windows Terminal, and whether a 2× downscale still reads as the Modster; screenshots of a 2× downscale and quadrant blocks for Sunmane in an 80×24 band.
  - [ ] A decision picks an approach (2× downscale, quadrants, a hand-drawn mini sprite, a mix, or none).
  - [ ] If one is picked, a roadmap task implements it, with render tests at `maxRows` 7 for a sprite taller than 14 px and the miniature never taller than `maxRows`.

#### [x] P5-10 — Mark caught Modsters in the band
- **Depends on:** P2-07, P2-08
- **Size:** S
- **Goal:** when a Modster you already caught appears, the band shows a small mark (`●`) next to its name, so you can tell new Modsters from repeats at a glance.
- **Done when:**
  - [x] The mark shows only when the collection has `caught:<id>`; never for a first encounter.
  - [x] Fits the full and compact layouts per 0012; never exceeds `maxRows` (render tests with the mark at `maxRows` 0, 1, 2, 5, 6, 7).
  - [x] Render tests for a caught and an uncaught Modster, using an in-memory store.

#### [x] P5-11 — Caught mark in the encounter pane
- **Depends on:** P5-10
- **Size:** S
- **Goal:** the encounter pane shows the same `●` mark as the band, so a Modster you already caught is marked wherever the encounter is drawn (while the pane is shown, the band steps aside and showed no mark at all).
- **Done when:**
  - [x] The pane marks a Modster whose `caught:<id>` is in the collection, and never a first encounter.
  - [x] Pane render tests for a caught and an uncaught Modster, using an in-memory store.

#### [x] P5-12 — Crystal Grotto biome
- **Depends on:** P2-09, P2-16
- **Size:** M
- **Goal:** bring @danielpg95's Crystal Grotto (made with the user content skill, 2026-10-12) into the built-in content: the biome and its 10 Modsters, with dex numbers #011–#020.
- **Done when:**
  - [x] `plugin/content/biomes/crystal-grotto/` and the 10 Modster folders, each with `sprite.png` and a `sprite.sprite.json` converted with `npm run sprite`.
  - [x] Every Modster has a complete dex with numbers #011–#020 (decision 0017).
  - [x] A credits row in `plugin/content/CREDITS.md` for every sprite.
  - [x] `npm run check:content` passes, and the odds table (3 common, 3 uncommon, 3 rare, 1 legendary) is checked; a second legendary across biomes is intended.
  - [x] A preview of every Modster in the PR description (enlarged, every frame, dark and light).
  - [x] The user copies in `~/.claude/modster-hunter/content/` are removed or renamed, so they don't replace the built-ins by id.

#### [x] P5-13 — Biome idle scene
- **Depends on:** P2-07, P5-08
- **Size:** M
- **Goal:** between encounters the band shows the biome as an animated scene with drifting particles instead of only its name (decision 0026).
- **Done when:**
  - [x] The validator accepts a `background` of 1–4 frames, `backgroundFps` (1–12) and `particles` (`style`, `color`, `density`) per 0026, with tests for each bound; `docs/CONTENT_FORMAT.md` documents them.
  - [x] A pure scene compositor in `plugin/hooks/render/` tiles the scene to the band's width and adds particles for every style, tested with an injected random source and the fake clock.
  - [x] `bandView` draws the scene above the idle line when it fits, the 3-row particle strip for a biome without art, and today's line otherwise; never exceeds `maxRows` (render tests at `maxRows` 0, 1, 2, 5, 7, 15).
  - [x] The scene animates only while a turn runs (subagents count, 0018) and holds still between turns; the timer stops when an encounter starts and on module reload (tested).
  - [x] A `showIdleScene` option (default `true`) in `plugin.json` and the `userConfig` table; `false` gives today's idle line.
  - [x] Between encounters the encounter pane shows the scene above its idle text when it fits, and its text otherwise (decision 0027); pane render tests for both, for motion with turns and for `showIdleScene: false`.
  - [x] Checked by hand in a real terminal at 80×24 and 140×40 with a test scene, in the band and in the encounter pane: no flicker, typing unaffected (noted in the handoff).

#### [x] P5-14 — Scenes for the built-in biomes
- **Depends on:** P5-13
- **Size:** M
- **Goal:** every built-in biome gets an idle scene and particles (decision 0026).
- **Done when:**
  - [x] Whispering Forest, Saltbreeze Bay, Dustwind Expanse and Crystal Grotto each have a `background` (about 12 px tall, edges that tile) and a `particles` style.
  - [x] A credits row in `plugin/content/CREDITS.md` for every scene.
  - [x] `npm run check:content` passes.
  - [x] A preview of every scene in the PR description (enlarged, every frame, dark and light).

#### [x] P5-15 — Keep the game running after `/clear`
- **Depends on:** P2-06
- **Size:** S
- **Goal:** after `/clear` (or a resume), encounters tick, throws settle and stats go to the new session, as after a fresh start.
- **Done when:**
  - [x] `classic.SessionStart` for `clear`, `resume` and `fork` restarts the game: the tick and sprite timers, `sessionId`, and a fresh encounter machine on the same biome. An encounter that was up is dropped, uncounted (0005).
  - [x] Regression test in `plugin/tests/`: after `session.end` (reason `clear`) and `classic.SessionStart` (source `clear`), a throw after the turn ends settles, a miss offers Throw again, and a new Modster still appears during a turn.
  - [x] Checked by hand: `/clear`, then throw more than once after Claude stops.
- **Why:** found during P3-04 (2026-10-13). `/clear` fires `session.end`, whose hook calls `stopTimers()`, but no `session.start` follows, so the 250 ms tick never restarts. After one throw the band stays on "wobble…" until the next prompt, and stats keep going to the ended session's key.

#### [x] P5-16 — Tier-first encounters
- **Depends on:** P2-06
- **Size:** M
- **Goal:** an encounter draws a tier, then a Modster of that tier, each equally likely (decision 0030).
- **Done when:**
  - [x] The pick follows 0030 points 1–3: tier weights in `constants.ts`, empty tiers left out, `rarity` required on the Modster and overridable on the biome entry. Unit tests with scripted random, including a biome with an empty tier.
  - [x] Biome entries have no `weight`; every built-in Modster has the `rarity` it computed to before; `npm run check:content` passes.
  - [x] The content check warns when a Modster appears less often than one in a rarer tier of the same biome (0030 point 6), with a test.
  - [x] The Biomes tab and `formatOddsTable` show the tier share and each Modster's share (0030 point 7).
  - [x] `docs/CONTENT_FORMAT.md`, the `add-biome` and `add-modster` skills, and `plugin/skills/create-modster-content/` (with `reference/format.md`) describe tiers instead of weights.

#### [ ] P5-17 — Player-defined tiers (spike)
- **Depends on:** P5-16
- **Size:** S
- **Goal:** decide whether players may define their own rarity tiers in user content, and how (asked by @danielpg95 after P5-16).
- **Done when:**
  - [ ] A spike looks at three options for user content: new named tiers (e.g. `mythic`) with their own weight, throws and catch rate; tier weights set per user biome; and retuning the four built-in tiers for all of a player's content. For each: the file shape, how it merges with built-in content (0007), what the stored `bestTier`, the Biomes tab and the lopsided-tier warning (0030 point 6) do with it, and whether band text still fits (0012).
  - [ ] The findings go in a Proposed decision in `docs/decisions/` that picks one or more options, or none, for @danielpg95 to settle.
  - [ ] If an option is picked, roadmap tasks implement it, each with validator and pick tests.

#### [ ] P5-18 — Live Stats tab
- **Depends on:** P3-04
- **Size:** S
- **Goal:** the Stats tab refreshes while it's open, after each encounter ends, instead of only when `3` is pressed.
- **Done when:**
  - [ ] An encounter that ends while the Stats tab is shown updates its totals and biome table, with a register test.
  - [ ] No extra `$.store` reads while another tab is shown or the pane is closed.
- **Why:** found during P3-04 (2026-10-13), recorded in the phase 3 review.

#### [x] P5-19 — Fill Whispering Forest
- **Depends on:** P2-09, P2-16, P5-16
- **Size:** M
- **Goal:** give Whispering Forest a full roster of 3 common, 3 uncommon, 3 rare and its legendary Elderbark (asked by @danielpg95, 2026-10-14). The unused placeholders Sproutling, Mossbeast and Acornsprite are redesigned and join it, and 3 new Modsters fill the rest.
- **Done when:**
  - [x] Sproutling (common), Mossbeast (uncommon) and Acornsprite (rare) have new sprites and complete dex entries, with official numbers #021–#023 in place of #901–#903 (decision 0017).
  - [x] One new common, one new uncommon and one new rare, with dex numbers #024–#026, each with `sprite.png` and a `sprite.sprite.json` converted with `npm run sprite`.
  - [x] `whispering-forest/biome.json` lists all 10, and the odds table (3 common, 3 uncommon, 3 rare, 1 legendary) is checked.
  - [x] A credits row in `plugin/content/CREDITS.md` for every new or redrawn sprite.
  - [x] `npm run check:content` passes.
  - [x] A preview of every new or redrawn Modster in the PR description (enlarged, every frame, dark and light).
  - [x] Elderbark (#010, legendary) is redrawn to match the upgraded roster (up to 32 px tall, decision 0033), keeping its dex entry; its credits row notes it replaces @victor-aguilars' design (asked by @danielpg95, 2026-10-15).
  - [x] Fernox (#009, uncommon) is redrawn to match the upgraded roster, keeping its dex entry; credited to @danielpg95 and @victor-aguilars, since it keeps his design (asked by @danielpg95, 2026-10-16).
  - [x] Sporrow (#008, rare) is redrawn to match the upgraded roster, keeping its dex entry; co-credited to @danielpg95 and @victor-aguilars (asked by @danielpg95, 2026-10-16).

#### [x] P5-20 — Fill Dustwind Expanse
- **Depends on:** P2-09, P2-16, P5-16
- **Size:** M
- **Goal:** give Dustwind Expanse a fuller roster, with one creepy Modster (asked by @victor-aguilars, 2026-10-14). Dunebun, Twiggle and Sunmane stay; 5 new Modsters join them.
- **Done when:**
  - [x] Ranactus (common, grass, was Cactoad), Torbellín (common, ground / normal, was Sunhorn), Fuescorpion (uncommon, bug / fire, was Cinderstinger), Lamparito (rare, ghost / fire, was Thirstwalker) and Reyrayo (legendary, flying / electric, was Stormcondor), with dex numbers #027–#031, each with `sprite.png` and a `sprite.sprite.json` converted with `npm run sprite`.
  - [x] Lamparito's sprite is at most 32 px tall (decision 0033) and reads clearly on a dark and a light background.
  - [x] `dustwind-expanse/biome.json` lists all 8, and the odds table (3 common, 2 uncommon, 2 rare, 1 legendary) is checked.
  - [x] A credits row in `plugin/content/CREDITS.md` for every new sprite.
  - [x] `npm run check:content` passes.
  - [x] A preview of every new Modster in the PR description (enlarged, every frame, dark and light).

#### [ ] P5-21 — Fill Saltbreeze Bay
- **Depends on:** P2-09, P2-16, P5-16
- **Size:** M
- **Goal:** give Saltbreeze Bay a fuller roster (asked by @victor-aguilars, 2026-10-14). Crabbit, Flopple and Serpentide stay; 5 new Modsters join them.
- **Done when:**
  - [ ] Peekashell (common, replaces Toastle), Flexton (common, replaces Gullet; 2026-10-22), Inkspector (uncommon, replaces Puffloaf; 2026-10-27), Sir Kelpsie (rare, replaces Lanternmaw; @victor-aguilars dropped both on 2026-10-16) and Tidecrown (legendary), with dex numbers #032–#036, each with `sprite.png` and a `sprite.sprite.json` converted with `npm run sprite`.
  - [ ] `saltbreeze-bay/biome.json` lists all 8, and the odds table is checked.
  - [ ] A credits row in `plugin/content/CREDITS.md` for every new sprite.
  - [ ] `npm run check:content` passes.
  - [ ] A preview of every new Modster in the PR description (enlarged, every frame, dark and light).

#### [x] P5-22 — Reference-image sprite workflow
- **Depends on:** P2-02
- **Size:** M
- **Goal:** a repeatable way to make built-in sprites from a contributor's own reference image (asked by @danielpg95, 2026-10-15), so quality and art style stay consistent across biomes. In P5-19 this lifted every Modster: the contributor makes a detailed reference, the tool shrinks it to sprite size, and faces and thin parts are finished by hand.
- **Done when:**
  - [x] `tools/ref-sprite.mjs` (`npm run ref-sprite`) cuts the background out of a reference along its dark outline, shrinks it to a target size by majority colour per cell (keeps thin lines), caps the palette (≤ 24, decision 0034), keeps the largest shape, and writes a PNG plus an optional letter-grid dump for hand edits; with tests in `tools/ref-sprite.test.mjs`.
  - [x] The `add-modster` skill has a "From a reference image" path: a prompt template with the house style (dark outline, flat shading, plain space around the creature, nothing touching the edges), the conversion command, and a finishing checklist (faces, eyes, thin parts, strays, ≤ 32 px tall per 0033, ≤ 24 colours, 2–4 frames, previews on dark and light).
  - [x] Reference images stay out of the repo; credits name the contributor as the artist.
  - [x] `docs/DEVELOPMENT.md` lists the new command.

#### [x] P5-23 — Redraw Hootlet
- **Depends on:** P5-22
- **Size:** S
- **Goal:** bring the forest starter Hootlet (#002, common) up to the upgraded Whispering Forest roster (asked by @danielpg95, 2026-10-16). Redrawn from @danielpg95's reference with `npm run ref-sprite`, keeping its design (leafy owlet, cream face and belly, head sprout) and its dex entry. Both eyes are now half open, and the description changes to match (asked by @danielpg95, 2026-10-16).
- **Done when:**
  - [x] A new `sprite.png` and `sprite.sprite.json` (converted with `npm run sprite`): up to 32 px tall (decision 0033), ≤ 24 colours (decision 0034), 2–4 frames, with a slow blink and a swaying sprout.
  - [x] `description` in `modster.json` matches the half-open eyes.
  - [x] The credits row in `plugin/content/CREDITS.md` names @danielpg95 and @victor-aguilars, since it keeps his design.
  - [x] `npm run check:content` passes.
  - [x] A preview in the PR description (enlarged, every frame, dark and light).

#### [x] P5-24 — Redraw the first five Modsters
- **Depends on:** P5-22
- **Size:** M
- **Goal:** bring Crabbit (#003), Sunmane (#004), Twiggle (#005), Flopple (#006) and Serpentide (#007) up to the upgraded art style, with more detail and better idle animations (asked by @victor-aguilars, 2026-10-16). Each is redrawn from @victor-aguilars' reference with `npm run ref-sprite`, keeping its design, colours, types and dex entry. Sunmane and Serpentide are shown as close-ups so their faces read, keeping Sunmane's flame tail and Serpentide's water ring (asked by @victor-aguilars, 2026-10-16).
- **Done when:**
  - [x] Each of the five has a new `sprite.png` and `sprite.sprite.json` (converted with `npm run sprite`): up to 32 px tall and 48 px wide (decision 0033), ≤ 24 colours (decision 0034), 2–4 frames.
  - [x] Each has a calm idle (2–3 fps, mostly rest frames, asked by @victor-aguilars, 2026-10-16): Crabbit waves its claw and blinks, Sunmane's mane flickers and it blinks, Twiggle glances and blinks from its hollow, Flopple breathes in its sleep with a rising Z, Serpentide blinks above a shimmering foam ring.
  - [x] The credits rows in `plugin/content/CREDITS.md` for the five sprites are updated.
  - [x] `npm run check:content` passes.
  - [x] `docs/previews/` is regenerated for the five, and the PR description shows each one (enlarged, every frame, dark and light).

#### [x] P5-25 — README refresh
- **Depends on:** —
- **Size:** S
- **Goal:** a README that makes someone who finds the repo want to try it: what Modster Hunter is, pictures of some Modsters, how to install it from source, and how to contribute (asked by @victor-aguilars, 2026-10-16). The release-only parts (recording, marketplace install, CHANGELOG) stay in P5-07.
- **Done when:**
  - [x] The README explains the game in a short pitch and shows several Modster previews from `docs/previews/`.
  - [x] Install explains running from source (`claude --plugin-dir ./plugin`) until v1.0, and the old "in planning" status note is gone.
  - [x] A Contributing section points to `CONTRIBUTING.md`, the roadmap and the contributor skills.
  - [x] `node tools/check-tracking.mjs` passes.

#### [x] P5-26 — Redraw the Crystal Grotto Modsters
- **Depends on:** P5-22
- **Size:** M
- **Goal:** bring all 10 Crystal Grotto Modsters (#011–#020) up to the upgraded art style (asked by @danielpg95, 2026-10-18). Each is redrawn from @danielpg95's reference, keeping its design, colours, types and dex entry; Gemsnake keeps its close-up pose (asked by @danielpg95, 2026-10-18). The idle scene stays as it is.
- **Done when:**
  - [x] Shardling, Glowcap, Mossmole, Echobat, Prismite, Quartzclaw, Geodon, Gemsnake, Amethowl and Geolem each have a new `sprite.png` and `sprite.sprite.json` (converted with `npm run sprite`): up to 32 px tall and 48 px wide (decision 0033), ≤ 24 colours (decision 0034), 2–4 frames with a calm idle.
  - [x] The credits rows in `plugin/content/CREDITS.md` for the ten sprites are updated.
  - [x] `npm run check:content` passes.
  - [x] `docs/previews/` is regenerated for the ten, and the PR description shows each one (enlarged, every frame, dark and light).
  - [x] The `add-modster` skill's reference prompt ends with the spec lines that made references convert cleanly: chunky blocks with minimum sizes in blocks, ≤ 24 colours, a flat background (asked by @danielpg95, 2026-10-18).

#### [x] P5-27 — Catcher format and loader
- **Depends on:** P2-01, P4-03
- **Size:** M
- **Goal:** catchers load as content from `content/catchers/<id>/` in the built-in and the user folder (decision 0035 points 1–4).
- **Done when:**
  - [x] `CONTENT_FORMAT.md` has a `catcher.json` section: every field from 0035 point 2 with exact bounds (sprite size, frame indexes, `lidRows`, `glowIndex`), the beat fields of point 3 and the presets of point 4. The folder layout shows `catchers/`.
  - [x] The validator checks `catcher.json` and its sprite, never throws, and reports issues like other content (file, field, problem). Unknown fields are errors. Tests cover each rule.
  - [x] Loading and merging include catchers: a user catcher with a built-in's id replaces it (0007), and built-in catchers load even when `includeBuiltins` is off. Tests use the injected loader ports.
  - [x] The helper's `check` (0025) reports catcher issues.

#### [x] P5-28 — Catch animation frames
- **Depends on:** P5-27
- **Size:** M
- **Goal:** a pure function draws any frame of a catcher's throw animation (decision 0035 points 3–6). Split from the first P5-28 with P5-32 and P5-33 (asked by @danielpg95, 2026-10-19).
- **Done when:**
  - [x] A pure frame function under `plugin/hooks/render/` takes the catcher, the Modster's sprite, the outcome, the rock count and the time, and returns the frame's cells for the Modster's sprite area. It applies the `contain` and `cover` presets from CONTENT_FORMAT.md.
  - [x] It covers every beat, `place`, `modster` and `path` value, the frames made from frame 0 (tilted for `rock`, the `lidRows` lid lifting and flying off), `glowIndex` and `rimIndex`. Tests use the fake clock and check pixels at chosen times.
  - [x] It says whether the catcher fits the sprite area, so callers can fall back to the dot count (0035 point 8).
  - [x] The beat lengths of 0035 point 5 live in `constants.ts`.

#### [x] P5-29 — Built-in catchers
- **Depends on:** P5-28
- **Size:** M
- **Goal:** the four built-in catchers from issue #129 ship in `plugin/content/catchers/`: `jar`, `pod`, `lantern` and `net` (decision 0035 point 13).
- **Done when:**
  - [x] Each has `catcher.json` and pixel art drawn as a proper sprite, not code: the jar's glow, the pod's seam and the lantern's flame use `glowIndex`, and the net is a `cover` tile with a rim. Each fits the smallest built-in Modster's sprite area (Dunebun, 22×20).
  - [x] `plugin/content/CREDITS.md` lists each catcher.
  - [x] `npm run check:content` passes.
  - [x] Checked by hand by @danielpg95 in a real terminal with the default jar, which they judged enough (2026-10-19). The other three were checked in the preview GIFs (moved from P5-32).
  - [x] A preview GIF of each catcher (a catch and both kinds of miss, dark and light) is in `docs/previews/catchers/`, and the PR description shows them.

#### [x] P5-30 — Catchers tab
- **Depends on:** P5-29, P3-01
- **Size:** M
- **Goal:** `/modsters` has a `5: Catchers` tab where the player picks the catcher in use (decision 0035 point 9).
- **Done when:**
  - [x] The tab lists every catcher, marking the one in use `✓ in use` and the player's own `yours`. The selected one plays animated on a Modster the player has caught, or on a silhouette when they've caught none.
  - [x] `u` (in place of `Enter`, since a hotkey is one digit or letter; asked by @danielpg95) saves the selected catcher as `prefs:catcher` in `$.store`. The next throw uses it, and a throw in progress keeps its catcher. Register tests cover this.
  - [x] A player's own catcher shows the delete hint from 0032 point 7.
  - [x] The tab row with `4: Catchers` (Settings moves to `5`, asked by @danielpg95) fits the narrowest pane, or wraps without breaking the tab hotkeys. A render test covers the narrowest width.
  - [x] `docs/ARCHITECTURE.md` lists `prefs:catcher` in its state table.

#### [x] P5-31 — Catchers in the content skill
- **Depends on:** P5-28
- **Size:** M
- **Goal:** players make, preview and delete their own catchers through `create-modster-content` (decision 0035 point 14).
- **Done when:**
  - [x] SKILL.md has a "Make a catcher" section. It asks for the style (`contain`, `cover` or `custom`) and the beats one question at a time, draws the closed frame first, and adds other frames only when the player wants them.
  - [x] The helper renders a catcher's animation on a sample Modster (a catch and both kinds of miss, dark and light) into a GIF or HTML page the player can open. It reuses P5-28's frame function, with a test.
  - [x] For a `custom` catcher, the skill steers the player to one of the two ways a catcher can hold a Modster: stretched over it (`place: stretch`, like the net) or with the Modster shrinking in (`shrink-in`, like the jar, or the seed pod, whose husk opens, takes the Modster completely inside and snaps shut). An anchored catcher that keeps a full-size Modster visible is smaller than the Modster, so it overflows (noted by @danielpg95, 2026-10-19, on a test bubble). Before saving, the skill shows the preview on a large Modster, such as Elderbark.
  - [x] `reference/format.md` documents `catcher.json`, and "Delete your own" covers catchers.
  - [x] Checked by hand: a new catcher made through the skill appears in the Catchers tab after `/modsters reload` and plays on a throw. @danielpg95 checked it with the Puzzle Cube (`contain`, with its own rock and catch frames) and approved it (2026-10-22); `custom` catchers are covered by the validator and frame-function tests.
  - [x] The Puzzle Cube, made through the skill, ships as a fifth built-in catcher (decision 0036, asked by @danielpg95, 2026-10-22): `plugin/content/catchers/puzzle-cube/`, a `CREDITS.md` row and `docs/previews/catchers/puzzle-cube.gif`.

#### [x] P5-32 — Catch timeline and blits
- **Depends on:** P5-28
- **Size:** M
- **Goal:** a throw plays the catcher in use in the band and the encounter pane, timed by decision 0035 points 5–6 (split from P5-28).
- **Done when:**
  - [x] The encounter machine rolls the rock count with the throw (3 for a catch; 1 or 2 for a miss, from the injected random source) and times the throwing phase by 0035 points 5–6, replacing `ENCOUNTER.throwingMs`. The existing throw, run and `/clear` tests are updated, and new ones cover the timings.
  - [x] `register.tsx` blits P5-28's frames during the throw to every sprite site (band and pane), skipping a tick while blits are in flight, then goes back to the idle loop. The `caught` beat plays at the start of the result card. A register test drives it with the fake clock.
  - [x] `prefs:catcher` in `$.store` picks the catcher; a missing or unknown id falls back to `jar` (0035 point 10).
  - [x] The hand check moved to P5-29, so it happens with the real catchers (agreed with @danielpg95, 2026-10-19).

#### [x] P5-33 — Catch dot count
- **Depends on:** P5-32
- **Size:** S
- **Goal:** text-only places show the dot count during a throw instead of `wobble…`, and so does the band where the catcher doesn't fit (decision 0035 points 7–8, split from P5-28).
- **Done when:**
  - [x] The compact band, the one-row band and the status line show `● ○ ○`, `● ● ○`, `● ● ● click!` or `● ✕ ○ broke free!` as the throw goes. The spinner is unchanged. Render tests run at `maxRows` 1, 2 and 7.
  - [x] Where the catcher doesn't fit the sprite area, the sprite holds still and the text lines show the dot count. The band never takes more rows than it does today.
  - [x] No `wobble` text is left in `plugin/hooks/`.

#### [ ] P5-34 — README: marketplace install and Modsters first
- **Depends on:** —
- **Size:** S
- **Goal:** the README leads with Modsters and says plainly how to install from the marketplace and keep the mod updated (asked by @victor-aguilars, 2026-10-22). This moves the marketplace install ahead of P5-07. The recording, CHANGELOG and version tag stay in P5-07.
- **Done when:**
  - [ ] The Musketail and Lamparito previews sit right under the title, and the four-biome scene GIF and biome table are gone. A short Biomes section shows two biomes, each with an animated GIF of its idle scene drawn by the mod's own compositor, and leaves the rest to find. A Catchers section shows three catchers (Seed pod, Lantern, Puzzle Cube) each catching one of three more Modsters (Hootlet, Echobat, Glowcap), drawn by the mod's own `catchFrame` (asked by @victor-aguilars, 2026-10-22).
  - [ ] An Install section gives the marketplace commands (shell and in-session) and the Claude Code version they need. Update steps stay out of the README (asked by @victor-aguilars, 2026-10-22). Contributing keeps the from-source path.
  - [ ] `plugin/.claude-plugin/plugin.json` says `"version": "0.1.0"`, so players who installed `0.0.1` get this update. From now on the version goes up whenever players should get changes (asked by @victor-aguilars, 2026-10-22; P5-07 writes down the rule). `claude plugin validate ./plugin --strict` passes.
  - [ ] Checked by hand: the README's install commands work on a second computer, and an update reaches it.
  - [ ] The README stays lean: a short pitch, Biomes, Catchers, Install, a How to play table of the keys and main commands (`1`/`2`, `/modsters`, `hunt`, `reload`, `/config`), Contributing with run-from-source, and License (asked by @victor-aguilars, 2026-10-22).
  - [ ] `node tools/check-tracking.mjs` passes.

#### [x] P5-35 — Opt-in hunting, commands and a welcome toast
- **Depends on:** —
- **Size:** M
- **Goal:** the game runs only while the `autoStart` setting is on (the default, decision 0041). `/modsters hunt` and `/modsters stop` flip it, the encounter pane moves to `/modsters pane`, `/modsters help` and the typeahead list the commands, and a one-time welcome toast explains it (decision 0038, asked by @victor-aguilars, 2026-10-22).
- **Done when:**
  - [x] `plugin.json` has `autoStart` (boolean, default `true` by decision 0041, Proposed: this task relies on it) and CONTENT_FORMAT.md documents it. `prefs:welcomed` is a pure store helper under `plugin/hooks/store/` with tests.
  - [x] While `autoStart` is off: no band, spinner text, status line, encounter, spawn countdown, encounter pane or `turn` stat. Register tests cover each.
  - [x] `/modsters hunt`, `stop` and `pane` set `autoStart` through `$.config.set` and reply as 0038 points 3–5 say, including when it's refused. `/modsters help` and an unknown word reply as points 6–7 say. `/modsters` registers with the `argumentHint` from point 8. Register tests cover each.
  - [x] The welcome toast shows once per player, for 15 s, with 0041's text (0038 point 2 is dropped by 0041). Register tests cover a first and a second session, a player who already played, and a player who turned it off.
  - [x] Docs follow 0038's consequences: decision status lines and index rows, CLAUDE.md rule 6, CONTENT_FORMAT.md, ARCHITECTURE.md, and the README's How to play table.
  - [x] `/modsters` registers as `immediate`, so it runs during a turn (decision 0039, asked by @victor-aguilars, 2026-10-22). A register test checks the flag.
  - [x] `claude plugin test ./plugin` and `claude plugin validate ./plugin --strict` pass. Checked by hand on a fresh install (passed, @victor-aguilars, 2026-10-22): the toast shows and the game plays, `/modsters stop` clears everything and `/config` shows Auto start off, and `/modsters hunt` brings it back. `/modsters pane` and `/modsters stop` typed while Claude works act at once without disturbing the turn (0039).

#### [ ] P5-36 — In-game settings
- **Depends on:** P5-35
- **Size:** M
- **Goal:** `/modsters settings` opens the collection pane's Settings tab, where players see and change every option with `k`, `j` and `o`, written through `$.config.set` (decision 0040, asked by @victor-aguilars, 2026-10-22).
- **Done when:**
  - [x] A pure module under `plugin/hooks/render/` lists the setting rows in 0040's order, with labels, values and the next value for `o` (wrapping, and the idle timeout's next listed value). It has tests.
  - [x] The Settings tab shows the rows above the content problems. `k`, `j` and `o` select and change them. A refused write shows a toast and keeps the value. Register tests cover a flip, a cycle and a refusal, with a stubbed `config.set`.
  - [x] Each change takes effect at once, as 0040 point 5 says (Auto start like hunt and stop, display rows redraw, built-in content reloads, idle timeout from the next encounter). Register tests cover each kind.
  - [x] `/modsters settings` opens the pane on the Settings tab with focus. The typeahead hint and `/modsters help` list it, and the help and the pane-off reply point to `/modsters settings` (0040 points 1 and 6).
  - [x] Docs follow 0040's consequences: decision status lines and index rows, CONTENT_FORMAT.md, ARCHITECTURE.md, and the README.
  - [x] `claude plugin test ./plugin` and `claude plugin validate ./plugin --strict` pass. Checked by hand: changing each kind of row in the tab updates `/config`, and the pane stays on the Settings tab after a change (passed after the `$.state` fix, @victor-aguilars, 2026-10-22).

#### [x] P5-37 — English names for the Dustwind roster
- **Depends on:** —
- **Size:** S
- **Goal:** the built-in Modsters have English-like names while the language is English; Spanish names can come later with localization (asked by @victor-aguilars, 2026-10-22).
- **Done when:**
  - [x] Ranactus is Cactoad, Torbellín is Twirlwind, Fuescorpion is Scorchion and Reyrayo is Kingbolt. Lamparito keeps its name. Ids stay the same, so players' catches are kept.
  - [x] No old name is left in the Modsters' text or in player-facing docs (session logs stay as written).
  - [x] `plugin.json`'s version goes up so players get the new names. `claude plugin test ./plugin` and `claude plugin validate ./plugin --strict` pass.
  - [x] `node tools/check-tracking.mjs` passes.

#### [x] P5-38 — Desktop: catch, collection and scenes as Svg
- **Depends on:** P5-06
- **Size:** M
- **Goal:** finish the Desktop Code tab (decision 0042 point 4): what P5-06 leaves as text.
- **Done when:**
  - [x] The catch animation plays as an `Svg` on desktop (decision 0043).
  - [x] The collection's Modster and catcher previews draw as an `Svg` on desktop.
  - [x] The biome idle scene draws as an `Svg` on desktop, within the band's `maxRows` (decision 0044).
  - [x] `DESKTOP.rowPx` and `DESKTOP.columnPx` are measured in the Code tab, and the values are noted in 0042 and 0044 (checked by eye, 2026-10-27).


#### [x] P5-39 — Richer art on desktop (spike)
- **Depends on:** P5-38
- **Size:** S
- **Goal:** know whether, and how, the Desktop app can show Modsters with more detail than the terminal's 48×32 sprites (decision 0033) allow, before anyone draws for it.
- **Done when:**
  - [x] A spike checks in the Code tab whether an `Svg` can show an embedded PNG (`<image href="data:image/png;base64,…">`) and animate it, and notes what the sandboxed frame allows; a screenshot of a 96×64, 4-frame test sheet.
  - [x] Sizes are measured against the 131072-character `Svg` limit: a high-detail sprite as paths (0042) and as an embedded PNG, for the largest built-in Modster's size at 2× and 3×.
  - [x] A decision picks an approach (for example an optional desktop-only sprite in `modster.json`, vector art, or staying with today's sprites), covering how the terminal and desktop versions stay recognisably the same Modster, and the `CONTENT_FORMAT.md` change if any (decision 0045, Proposed).
  - [x] If one is picked, roadmap tasks implement it and add the art (P5-40, P5-41, P5-42; replaced by P5-43..P5-51 on 2026-10-28, when the project went desktop-first).

#### [x] P5-43 — Desktop-first decision
- **Depends on:** P5-39
- **Size:** S
- **Goal:** state the cut to desktop-first art and set the desktop quality bar from scratch, by reworking decision 0045 (asked by @danielpg95, 2026-10-28). Only the P5-39 spike's technical findings carry over: an image-mode Svg, SMIL and the 131072-character limit.
- **Done when:**
  - [x] 0045 is rewritten and Accepted. It states the cut: after P5-21, built-in Modsters, biomes and catchers are desktop art. Terminal art is optional and welcome from the community, and 0033 and 0034 apply only to terminal sprites.
  - [x] It sets the Modster bar: hi-res pixel art drawn pixelated, up to 128×128 per frame, a sheet of 2–8 frames at its own `fps`, at most 48 KiB.
  - [x] It settles the colour cap and alpha (default: 64 colours, each pixel opaque or clear), backgrounds (default: up to 48 px tall, edges that tile, 1–4 frames, at most 24 KiB), catchers (default: up to 96×96, at most 24 KiB, with `lidRows`, `glowIndex` and `rimIndex` restated for a PNG) and the display scales for the band, pane and Collection.
  - [x] It says each piece of content has desktop art, terminal art or both. With both, they're the same design. A terminal player sees the compact text layout for a desktop-only Modster, the idle line alone for a desktop-only biome, and the default catcher for a desktop-only catcher.
  - [x] The README and the plugin's description no longer say the game lives in your terminal.

#### [x] P5-44 — Desktop art: format, loader and validator
- **Depends on:** P5-43
- **Size:** M
- **Goal:** content can carry desktop art (decision 0045), loaded and checked, and nothing draws it yet.
- **Done when:**
  - [x] `CONTENT_FORMAT.md` documents `desktopSprite` for Modsters and catchers and `desktopBackground` for biomes. (Making the terminal `sprite` optional moved to P5-45 on 2026-10-28, with the fallbacks that need it.)
  - [x] The loader keeps the PNG bytes. Art that breaks a rule is dropped with a content issue; tests cover every rule.
  - [x] `tools/check-content.mjs` and `tools/sprite.mjs` check desktop sheets.
  - [x] The terminal output is unchanged: the existing tests pass as they are.

#### [x] P5-45 — Terminal fallbacks for desktop-only content
- **Depends on:** P5-44
- **Size:** M
- **Goal:** content with only desktop art still plays on the terminal (decision 0045).
- **Done when:**
  - [x] The terminal `sprite` is optional for a Modster or catcher with a `desktopSprite` (decision 0045 point 2): the validator, `CONTENT_FORMAT.md` and the loaded types allow it, and every place that reads a loaded sprite handles its absence (moved from P5-44).
  - [x] A desktop-only Modster shows the compact text layout in the band, pane and collection.
  - [x] A desktop-only biome shows the idle line alone, and a desktop-only catcher falls back to the default catcher.
  - [x] Tests cover each case.

#### [x] P5-46 — Draw desktop Modster sheets
- **Depends on:** P5-44
- **Size:** M
- **Goal:** on the desktop surface, a Modster with a desktop sheet shows it in the band, the encounter pane and the Collection tab. (The Catchers tab preview, a looping catch, moved to P5-47 on 2026-10-28.)
- **Done when:**
  - [x] A pure renderer makes the image-mode Svg: the sheet stepped by SMIL at its `fps`, pixelated, at 0045's scales. Render tests check its frames, timing and size.
  - [x] The Collection tab's silhouette is the same sheet through a gray filter.
  - [x] One built-in Modster ships a desktop sheet, ahead of P5-51 (asked by @danielpg95, 2026-10-28): original art, approved by @danielpg95, credited, passing `node tools/check-content.mjs`.
  - [x] Checked in the Code tab with that Modster and one without a desktop sheet.

#### [x] P5-47 — Catch animation with desktop art
- **Depends on:** P5-46
- **Size:** M
- **Goal:** a throw on desktop, and the Catchers tab's looping preview, draw the Modster's and the catcher's desktop sheets (decision 0043).
- **Done when:**
  - [x] Checked in the Code tab first: `catchSvg`'s SMIL motion and filters run in an image-mode Svg.
  - [x] The throw uses both desktop sheets, and falls back to today's art for content without them. Render tests cover it.
  - [x] The Catchers tab's preview uses them too (moved from P5-46).
  - [x] A throw with the largest allowed Modster and catcher stays under the 131072-character limit.
  - [x] The puzzle cube catcher (decision 0036) ships a desktop sheet, ahead of P5-51 (asked by @danielpg95, 2026-10-28): original art, approved by @danielpg95, credited, passing `node tools/check-content.mjs`.
  - [x] Checked in the Code tab: a throw and the Catchers tab preview with Shellsprout and the puzzle cube, and with content that has no desktop sheet.

#### [x] P5-48 — Desktop biome backgrounds
- **Depends on:** P5-44
- **Size:** M
- **Goal:** the idle scene tiles a biome's `desktopBackground` on desktop (decision 0044).
- **Done when:**
  - [x] `sceneSvg` tiles it within the band's `maxRows`, and the Biomes tab shows it. Tests cover it.
  - [x] Whispering Forest ships a `desktopBackground`, ahead of P5-51 (asked by @danielpg95, 2026-10-28): original art from a reference, approved by @danielpg95, credited, passing `node tools/check-content.mjs`.
  - [x] Checked in the Code tab with Whispering Forest and a biome without a desktop background.
  - [x] Added on the way (asked by @danielpg95): per-biome particle art on desktop (decision 0046, `desktopParticles`), with Whispering Forest's falling leaf; the scene fills the band's width (drawn wider, cropped at the slot); `add-biome` covers the background prompt, animating a background and particle art; a resumed desktop throw starts a tick ahead, so the Modster never flashes back in.

#### [x] P5-49 — Contributor skills: desktop, terminal or both
- **Depends on:** P5-44
- **Size:** L
- **Goal:** contributors can make built-in desktop art, terminal art or both for Modsters, biomes and catchers.
- **Done when:**
  - [x] `add-modster` and `add-biome` ask for desktop, terminal or both, and a new `add-catcher` contributor skill exists.
  - [x] The desktop path aims for detail: hi-res pixel art up to 128×128 with full shading, worked from a reference image, previewed at pane and band scale before approval.
  - [x] For "both", the terminal sprite is reduced from the desktop design, not the other way round.
  - [x] The tooling the desktop path needs (added by @danielpg95, 2026-10-28): `tools/ref-sprite.mjs --desktop` with `--clear` and `--trim-edges` and fully compressed PNGs; `tools/sprite.mjs --desktop … --preview` writing a browser page (the mod's own Svg at every size, tiled backgrounds, real throws for catchers); tools tests for both.
  - [x] `.claude/rules/content.md` covers desktop sheets, and its 24-colour and size rules apply to terminal sprites only.

#### [x] P5-50 — Player skill: desktop, terminal or both
- **Depends on:** P5-44, P5-45
- **Size:** M
- **Goal:** players' own Modsters, biomes and catchers can be desktop art, terminal art or both.
- **Done when:**
  - [x] `create-modster-content` offers the three, recommends desktop for detailed art and terminal for terminal players, and explains the terminal fallback.
  - [x] Its helper `modster-content.mjs`, which ships with the mod, gets desktop modes, so players can follow the desktop path without the repo's tools (asked by @danielpg95, 2026-10-28): reduce a reference image, check a desktop sheet against 0045 and 0046, and write the preview page (Modsters, backgrounds, particles, catcher throws). It stays offline, with no installs. Tests cover them.
  - [x] `plugin.json`'s version goes up.

#### [ ] P5-51 — First desktop art set
- **Depends on:** P5-21, P5-47, P5-48, P5-49
- **Size:** M
- **Goal:** the first built-in desktop art, made with the new skills: Tidecrown (#036), Saltbreeze Bay's background and one catcher (not the puzzle cube, which got its sheet in P5-47).
- **Done when:**
  - [ ] Tidecrown's desktop sheet (from @victor-aguilars's detailed design), Saltbreeze Bay's `desktopBackground` and one catcher's `desktopSprite` are original, credited and pass the validator.
  - [ ] A preview of each in the PR description, every frame, dark and light.
  - [ ] Checked in the Code tab: band, pane, Collection, Biomes tab and a throw.


#### [x] P5-52 — Desktop interaction (spike)
- **Depends on:** P5-38
- **Size:** S
- **Goal:** know what input and layout the Desktop Code tab allows, so the game can feel made for desktop and not only drawn for it (asked by @danielpg95, 2026-10-28). Ideas to test: click a Modster to throw, one encounter scene with the Modster in front of its biome, a dex grid with a detail card in the Collection tab, and a catch card.
- **Done when:**
  - [x] A throwaway spike checks in the Code tab, inline and not fullscreen, whether a click reaches a band `Button`, a pane `Button` and an `Svg` (image mode and `isInteractive`). The findings and screenshots are in its README.
  - [x] It checks whether a pane can lay out a grid of animated Svg thumbnails and switch to a detail view on a press, within the Svg limit.
  - [x] Digit hotkeys and the terminal layout still work the same with the spike mod loaded.
  - [x] A decision picks which ideas to build on desktop, keeps the terminal as the simple path (keys and text), and keeps rules 6 and 7. If any are picked, roadmap tasks build them. (decision 0048: the encounter scene, P5-57)

#### [x] P5-53 — Desktop reference prompts for Modsters and catchers
- **Depends on:** P5-49
- **Size:** M
- **Goal:** the `add-modster` and `add-catcher` skills give a dedicated reference prompt for desktop art, so image generators produce the detail desktop sheets keep, instead of the terminal prompt's chunky blocks (asked by @danielpg95, 2026-10-28; P5-48 does the biome background prompt).
- **Done when:**
  - [x] `add-modster`'s desktop path has a prompt template: detailed pixel art about 120 px tall, 2–3 shading tones per colour, a clear dark outline, big readable eyes, a plain background with margin, filled from every design field. It can ask for 2–3 poses for a livelier idle.
  - [x] `add-catcher` has one: the object alone on a plain background, three-quarter view, opening or moving parts clearly separated.
  - [x] Each template is tried once with a generator, and what worked or failed is noted in the skill, as the terminal prompt's P5-19 examples are.
  - [x] Added on the way (asked by @danielpg95): Mossmaul and the glass jar ship their desktop sheets, from the two tries; a catcher's desktop glow is painted from exact shapes found when the sheet loads, since the colour-match filter from P5-47 lit nothing in a real browser.

#### [x] P5-54 — Desktop idle label in the scene
- **Depends on:** P5-48
- **Size:** S
- **Goal:** on desktop, the band's idle line ("Whispering Forest · listening for Modsters") becomes part of the scene, which reads less like a terminal (asked by @danielpg95, 2026-10-28).
- **Done when:**
  - [x] A decision amends 0026's idle line for desktop: the biome's name in a small tag in the strip's corner, in its accent colour on a translucent backing, with a dot that pulses while Claude works; whether the tag fades after a while; and what stays for `showIdleLine` and the terminal.
  - [x] `sceneSvg` draws the tag (SVG text in the image), and the text row under the scene goes away on desktop, so the band is a row shorter. Render and register tests cover it.
  - [x] Checked in the Code tab, light and dark.

#### [x] P5-55 — Desktop art for the Whispering Forest roster
- **Depends on:** P5-53
- **Size:** M
- **Goal:** every Whispering Forest Modster has a desktop sheet, so the forest is the first biome fully migrated to desktop art (asked by @danielpg95, 2026-10-29). Shellsprout and Mossmaul already have theirs; the other 8 keep their designs and dex entries.
- **Done when:**
  - [x] Hootlet, Pinekin, Fernox, Hollowmask, Sporrow, Acornsprite, Musketail and Elderbark each ship a `desktopSprite` made from a reference with `add-modster`'s desktop prompt: the same design as the terminal sprite, at least 76×80 so every built-in catcher fits, with an idle animation, approved by @danielpg95 one at a time.
  - [x] Shellsprout's and Mossmaul's idles get smooth in-between motion, following the skill's bending guidance (asked by @danielpg95), approved one at a time.
  - [x] A credits row for every new sheet in `plugin/content/CREDITS.md`, keeping co-credits where a design is someone else's.
  - [x] `node tools/check-content.mjs` passes, and the PR shows a desktop preview of every new sheet.
  - [x] Checked in the Code tab: the band, the encounter pane and the Collection tab.

#### [x] P5-56 — The idle tag waits until the band shows it
- **Depends on:** P5-54
- **Size:** S
- **Goal:** on desktop the idle tag is sometimes missing on a session's first load (reported by @danielpg95, 2026-10-29). Its 5 s show starts when the session starts, so when the Code tab draws the band later, or the encounter pane holds the band aside, the tag fades unseen. Decision 0047 says it shows "when the biome comes into view"; time it from the band's first desktop draw instead.
- **Done when:**
  - [x] The tag's show and fade start the first time the band draws the desktop scene (or the tag alone) after the biome comes into view: at session start, and when an encounter ends.
  - [x] Register tests cover a band first drawn after `IDLE_TAG.showMs`, a band held aside by the encounter pane, and the existing timing.
  - [x] Checked in the Code tab: the tag shows on a session's first load.

#### [x] P5-57 — Desktop encounter scene
- **Depends on:** P5-52, P5-38
- **Size:** M
- **Goal:** on desktop the encounter pane and the band show the Modster in front of its biome as one scene `Svg` (decisions 0048 and 0049, asked by @danielpg95, 2026-10-29).
- **Done when:**
  - [x] A pure function builds the scene: the biome's desktop idle scene behind, the Modster's desktop sheet (or terminal sprite) in front, as one image-mode `Svg` under `DESKTOP.svgMaxChars`; tests cover a desktop sheet, a terminal sprite, a biome with and without desktop art, and the over-limit fallback.
  - [x] The encounter pane draws it on desktop, with Throw and Run as `Button`s below it and their digit hotkeys unchanged; the terminal is unchanged.
  - [x] The desktop band draws it too (0049): the encounter's lines on the left, the strip filling the rest with the Modster in front, inside `maxRows`; the Modster alone with the scene off or over the limit; the one-row band and the terminal are unchanged.
  - [x] Added on the way (asked by @danielpg95, for parity with the band): between encounters the desktop pane draws the band's vector scene (0027, 0044), still between turns and moving while Claude works, with the biome's name tag in it that fades as in the band, and no header or idle text (0047). In the encounter the scene takes the header's place too. In the encounter the strip grows to the Modster's height.
  - [x] Checked in the Code tab, in the band and the pane: the idle and encounter scenes animate, the Modster stands in front, and Throw and Run work.
  - [x] `spikes/p5-52-desktop-interaction/` is deleted.

#### [x] P5-58 — Desktop encounter inside the scene
- **Depends on:** P5-57
- **Size:** L
- **Goal:** on desktop the encounter plays inside the biome's scene, in the band and the pane: the scene keeps its size, flashes and slides aside for Throw and Run, the Modster appears as a silhouette then its sprite, a click on the Modster throws, the details are tags in the scene, and a cue plays as it leaves (decisions 0050 to 0053; asked by @danielpg95, 2026-10-30).
- **Done when:**
  - [x] Checked first in the Code tab with a throwaway spike: a `Client` laid over the scene `Svg` leaves it visible and hears clicks with their cell; it doesn't hear the 1 and 2 keys (decision 0050).
  - [x] A decision records the layout and the press path from those findings (0050, superseding 0049).
  - [x] The spike checks the motion in the Code tab: the arrival and the departure as one stamped `Svg` each, the buttons drawn by the `Client` after the slide, no blink or replay (decision 0051, superseding 0050). The hotkeys inside the `Client` are assumed (0051 point 3).
  - [x] Pure functions, with tests: the encounter scene at the idle scene's size, the Modster (or its throw) scaled to the strip's height; the arrival (flash, slide, silhouette, sprite, tag) and the departure (caught or fled cue, slide back) as stamped `Svg`s with the timings in `constants.ts`; the still scene; the Modster's hit box in cells.
  - [x] A surface module draws Throw, Run and the tries left after the slide, and hears a click on the Modster; the desktop band and pane draw the scene with it laid over. Tests press Throw, Run and the Modster. The terminal, the one-row band and `showIdleScene` off are unchanged.
  - [x] Checked in the Code tab, in the band and the pane: the scene doesn't change size, the arrival and departure play once with no blink, clicks and the 1 and 2 keys work. (The keys inside the `Client` stay assumed, 0051 point 3.)
  - [x] `spikes/p5-58-encounter-overlay/` is deleted.
---

#### [ ] P5-59 — Desktop encounter panel spacing
- **Depends on:** P5-58
- **Size:** S
- **Goal:** on desktop the encounter panel's stack (Throw, the gap, Run, the pips) sits one row lower, clear of the panel's top edge, with its spacing unchanged (asked by @danielpg95, 2026-10-30).
- **Done when:**
  - [x] The `Client` draws the stack one row lower in the band and the pane; the gap between Throw and Run stays; short of room the pips give way first, never the gap; a test covers it.
  - [ ] Checked in the Code tab, in the band and the pane.
---

## Phase 6 — Beyond the terminal

Decision 0037 (Proposed): the mod ships first, then the game core moves out so other hosts can use it. Start these only once 0037 is accepted.


#### [ ] P6-01 — Extract the host-neutral core
- **Depends on:** P5-07
- **Size:** L
- **Goal:** the pure game, content, store and frame-level render modules live in a core package that has no `$`, DOM or Node APIs, and the mod imports it (decision 0037 point 2).
- **Done when:**
  - [ ] No file in the core package mentions `$`, `document`, `window` or a `node:` import. A check in `tools/` enforces it and runs in CI.
  - [ ] `claude plugin test ./plugin` and `node --test tools/*.test.mjs` pass with no test expectations changed.
  - [ ] `claude plugin validate ./plugin --strict` passes, and the mod installed from the marketplace plays an encounter as before.
  - [ ] `docs/ARCHITECTURE.md` shows the new layout.

#### [ ] P6-02 — Collection export format
- **Depends on:** P6-01
- **Size:** M
- **Goal:** the player can export their collection and stats as a versioned JSON file that other hosts read (decision 0037 point 3).
- **Done when:**
  - [ ] A decision or a `docs/CONTENT_FORMAT.md` section defines the format (`v: 1`), with no paths, session ids or user content files in it.
  - [ ] A pure function in the core builds the export from store records, and a parser reads it back, rejecting bad input. Both have tests.
  - [ ] `/modsters export` writes the file and says where. A register test covers it.

#### [ ] P6-03 — Web Modster-dex
- **Depends on:** P6-01, P6-02
- **Size:** L
- **Goal:** a static web page anyone can open from a link shows the built-in biomes and Modsters with animated sprites, and an imported collection (decision 0037 point 4).
- **Done when:**
  - [ ] The page uses the core package and `plugin/content/` as is. Sprites draw on a canvas from the same RGBA frames as the terminal.
  - [ ] It makes no network calls past loading its own files, and works offline once loaded.
  - [ ] Importing a P6-02 export marks caught Modsters. A bad file shows an error and changes nothing.
  - [ ] It builds with one documented command and is published (GitHub Pages or a Claude artifact), with the link in the README.

#### [ ] P6-04 — MCP App feasibility (spike)
- **Depends on:** P6-01
- **Size:** M
- **Goal:** find out whether an MCP App (an MCP server with a `ui://` view) can show Modster Hunter in Claude chat, so a decision can accept or reject it (decision 0037 point 5).
- **Done when:**
  - [ ] A throwaway prototype shows one encounter from the core in Claude Desktop chat. Screenshots and findings are in the session log.
  - [ ] Findings cover packaging (connector or `.mcpb`), what triggers an encounter without turn events, where the collection is stored, and what rule 7 would need to allow.
  - [ ] A decision accepts or rejects an MCP App host.
