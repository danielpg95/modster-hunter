# 0015 — Encounters can also be shown in an opt-in side pane; where the game shows becomes configurable

- **Status:** Proposed — settled by @danielpg95 (game design; supersedes the first point of 0002 once accepted)
- **Date:** 2026-10-08
- **Proposed by:** @victor-aguilars, after playing the P2-07 band

## Context

The band above the prompt (0002, P2-07) works and "looks good so far", but it
is small (7 rows at 80×24) and a question dialog or survey hides it. The user
asked for something like a panel at the top right. The mods API has no
draggable or freely positioned windows; a mod draws only in the places Claude
Code offers:

- `AbovePrompt`: the band (today).
- `Pane` via `$.ui.open`: a framed panel the surface places. In fullscreen from
  110 columns it **docks beside the transcript**; otherwise it sits inline above
  the prompt. Opened by the person, it's placed at any width.
- `Spinner`: the "Sauteing…" line can be rewritten while a turn runs.
- `$.ui.status`: one pinned text line under the prompt.
- `$.ui.toast` / `$.ui.notify`.

## Options

1. **Band only** (0002 as is).
2. **Band plus an opt-in side pane** that shows the live encounter with a
   larger area, opened by a command; never opened by the mod itself.
3. **Configurable places**: the person picks any of band, pane, spinner
   teaser and status line.

## Decision

1. Encounters keep showing in the **band** by default.
2. The person can open a **pane** with a command that shows the live encounter
   (sprite, name and tier, throws left, Throw button, result) and the current
   biome. It docks on the right in wide fullscreen terminals. The mod still
   **never opens a pane by itself** (0002 point 3 stands).
3. **Eventually configurable** (@victor-aguilars: "I want to have multiple
   option configurable eventually"): a `userConfig` option chooses where the
   game shows: band, pane, spinner teaser, status line, in any combination.
   Until that task lands, only point 1 and 2 apply.
4. The same encounter machine drives every place; places only differ in how
   they draw it. Never more than one Throw per encounter, whichever place it's
   pressed in.

## Consequences

- New roadmap tasks: P2-12 (encounter pane) and P5-08 (display settings).
- P3-01's `/modsters` pane may host the encounter as a tab instead of a second
  pane; P2-12 picks the command name and coordinates with P3-01.
- CONTENT_FORMAT.md's `userConfig` table gets the new option in P5-08.
- If accepted, 0002's status becomes "Superseded by 0015" for its first point.
