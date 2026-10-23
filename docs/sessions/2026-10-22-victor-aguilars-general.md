# Session — 2026-10-22 — @victor-aguilars — general: sharing and portability

- **Task:** none (brainstorm; produced decision 0037 and phase 6 tasks)
- **Branch:** `portability-decision`
- **Status at end:** in-review
- **Last commit:** see the PR

## Goal for this session

Look at ways to share Modster Hunter widely. Can the game also run outside the
mod (standalone, or in the Claude desktop app) and still run inside it?

## Done

- Researched the targets: the mod in the terminal and in the Desktop Code tab
  (same plugin, `Svg` there), a static web page, an MCP App (`ui://` view in
  Claude chat), and an `npx` CLI.
- `docs/decisions/0037-portable-core-and-hosts.md` (Proposed) and its index row.
- `docs/ROADMAP.md`: new phase 6 "Beyond the terminal" with P6-01 (extract the
  core), P6-02 (collection export), P6-03 (web Modster-dex) and P6-04 (MCP App
  spike).
- Verified with `node tools/check-tracking.mjs` (0 errors).

## Decisions made

- @victor-aguilars: share with **Claude Code users first** (terminal and
  Desktop Code tab), and only then add other hosts.
- @victor-aguilars: this session's deliverable is a proposed decision plus
  roadmap tasks in one PR. No code.

## Problems and findings

- The desktop app's chat doesn't run mods. Only the Code tab does. Getting into
  Claude chat means an MCP App, which needs a process (rule 7).
- The idle loop depends on turn and subagent events, which only the mod gets.
  Other hosts need another trigger.
- The code is already mostly portable: `game/`, `content/`, `store/` and most of
  `render/` are pure (0013). Only `pixelsToCells` and `register.tsx` are
  terminal or host specific.

## Next steps

1. @danielpg95 reviews the PR and accepts, changes or rejects decision 0037 (its status line and the index row).
2. Keep going with P5-06 (Desktop app support) and P5-07 (release v1.0). Phase 6 starts after P5-07.

## Open questions

- Should phase 6 wait for v1.0 (as P6-01 depends on P5-07), or start sooner? — @danielpg95.
- Publish the web Modster-dex on GitHub Pages or as a Claude artifact? — settle in P6-03.

## Found along the way

- The workboard rows for P5-19 and P5-21 haven't been updated in more than 7 days (`check-tracking` warns).
