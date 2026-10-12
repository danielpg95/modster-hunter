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
| P4-04 | @danielpg95 | in-review | p4-04-skill-fixes | 2026-10-11 | 2026-10-12 | Skill fixes from @danielpg95's run (Crystal Grotto, 10 Modsters) in review; still needs the run by someone who didn't write it (@victor-aguilars), then tick both done-when items |
| P5-12 | @danielpg95 | in-progress | p5-12-crystal-grotto | 2026-10-12 | 2026-10-12 | Copy the user content into plugin/content/, convert the sprites, add dex #011–#020 and credits, and remove the user copies |

## Up next

Tasks whose dependencies are all done, so they can be claimed now. Update this
list when you finish a task.

- **P2-10** — Phase 2 playtest
- **P5-09** — Sprite miniatures (spike)
