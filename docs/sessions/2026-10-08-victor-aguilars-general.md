# Session — 2026-10-08 — @victor-aguilars — general: display places and spawning after the first play

- **Task:** none (planning after playing P2-07)
- **Branch:** `plan-display-and-spawning`
- **Status at end:** in-review
- **Last commit:** see `git log` on the branch

## Goal for this session

Decide where else the game can show, and why no Modster appeared while waiting on subagents or answering a question.

## Done

- Checked the mods API for display places: `AbovePrompt` (band), `Pane` (docks beside the transcript in fullscreen from 110 columns, inline otherwise; no dragging or free positioning), `Spinner` line, `$.ui.status`, toasts.
- Proposed decision 0015 (opt-in side pane; places configurable later) and 0016 (background subagents count as work time). Both need @danielpg95 (game design).
- Roadmap: added P2-11 (background agents), P2-12 (encounter pane), P5-08 (display settings).

## Decisions made

- @victor-aguilars: opt-in side pane, and "I want to have multiple option configurable eventually"; spawn during turns **and** background agents. Recorded as Proposed decisions, since game design is the maintainer's to accept.

## Problems and findings

- No Modster during background subagents: the main turn had ended, so the 0014 countdown was paused.
- No Modster while answering a question: the question dialog replaces the band.
- The play test so far "is looking good" (@victor-aguilars).

## Next steps

1. @danielpg95: accept, amend or reject 0015 and 0016.
2. Merge #32 and #33 (P2-07), then P2-11 and P2-12 become claimable.

## Open questions

- Command name for the encounter pane (`/modsters hunt`?) vs a tab in P3-01's `/modsters` pane. — @danielpg95

## Found along the way

- None.
