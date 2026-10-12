# Workboard

Who is working on what, right now. The plan lives in [`ROADMAP.md`](ROADMAP.md);
this file lists only tasks someone has claimed.

**Rules** (checked by `tools/check-tracking.mjs`):

- One row per claimed task. One owner per task. Keep the table format exactly.
- **Claim** a task by landing a commit that adds your row on `main`. First merged wins.
- **Status** is `in-progress`, `blocked` or `in-review`.
- **Update** the `Updated` date and `Next step` at the end of every work session.
- **Done:** the PR that finishes the task removes the row and ticks the roadmap.
- Rows untouched for 7 days may be released by a maintainer after pinging the owner.
- Dates are `YYYY-MM-DD`. Owners are GitHub handles.

| Task | Owner | Status | Branch | Started | Updated | Next step |
| --- | --- | --- | --- | --- | --- | --- |
| P4-04 | @danielpg95 | in-review | p4-04-skill-fixes | 2026-10-11 | 2026-10-12 | Skill fixes merged (#78); waiting on @victor-aguilars's end-to-end run, then tick both done-when items |
| P5-12 | @danielpg95 | in-review | p5-12-crystal-grotto | 2026-10-12 | 2026-10-12 | PR open; after it merges, remove or rename the user copies in ~/.claude/modster-hunter/content/ so they don't replace the built-ins |
| P5-13 | @danielpg95 | in-progress | p5-13-idle-scene | 2026-10-12 | 2026-10-12 | Extend the biome validator for multi-frame `background`, `backgroundFps` and `particles` (0026), with tests |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P2-10** — Phase 2 playtest
- **P5-09** — Sprite miniatures (spike)
