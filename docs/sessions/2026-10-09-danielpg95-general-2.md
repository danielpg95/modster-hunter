# Session — 2026-10-09 — @danielpg95 — general: settle the rest of issue #35

- **Task:** none (decisions and roadmap tasks for issue #35)
- **Branch:** `p2-11-p2-14-issue-35-decisions`
- **Status at end:** in-review
- **Last commit:** see `git log` on the branch

## Goal for this session

Check whether issue #35 changed anything in the P1-05/P1-06 work, and record the two #35 ideas still open.

## Done

- Checked `main` against the P1-05/P1-06 work: 0012 still governs the band and the pane (`plugin/hooks/render/band-view.ts`, bounds in `constants.ts`); 0016 superseded 0008 and moved the spike decoder to `plugin/hooks/vendor/`; `spikes/` has no tracked files. Nothing needed changing.
- Decision 0018: background subagents count as work time (from the #34 draft, renumbered; 0016 and 0017 are taken).
- Decision 0019: the encounter pane reopens for people who opened it, until they close it by hand.
- Status lines and index updated for 0002, 0005, 0014, 0015. `CLAUDE.md` golden rule 6 and `docs/DEVELOPMENT.md` mention the 0019 exception.
- Roadmap: P2-11 and P2-14 added; "Up next" refreshed. `node tools/check-tracking.mjs` passes.

## Decisions made

- @danielpg95 accepted both #35 ideas ("yes to both ideas").
- Details drafted by Claude: the 30-minute cap for an agent with no stop event (`AGENT_WORK_MAX_MIN`); the `prefs:huntPane` store key; a hand close (origin `person`) as the only way to stop reopening; reopening on `classic.SessionStart` too.

## Problems and findings

- The mods API already places a mod-opened pane from 110 columns (not 144) for an id the person opened before, until they close it by hand. 0019 relies on that.

## Next steps

1. Merge this PR, then claim P2-11 or P2-14 (both S).
2. Close issue #35 once this lands.

## Open questions

- P5-08 (display settings: band, pane, spinner, status) from #35 is still not on the roadmap. Add it? — @danielpg95.

## Found along the way

- Local leftovers in the main checkout (not in git): `spikes/` (generated types, probe `node_modules/`, large fixtures) and an untracked `pnpm-lock.yaml` while the repo commits `package-lock.json`.
