---
paths:
  - "docs/**"
---

# Rules for planning and tracking docs

- **`docs/ROADMAP.md`**: keep the heading format `#### [ ] PN-NN — Title` and the
  `Depends on` / `Size` bullets exact; `tools/check-tracking.mjs` parses them.
  Never renumber or reuse a task ID. Adding a task: next free number in the
  phase, with "done when" items that someone else could verify.
- **`docs/WORKBOARD.md`**: only the task owner edits their row. One row per task,
  one owner per task. Keep the "Up next" list in sync (`--next` prints it).
- **`docs/sessions/`**: a new file per session, named
  `YYYY-MM-DD-<handle>-<task-id>.md` (use `general` instead of a task ID for
  sessions without one). Never edit someone else's or an old session file.
- **`docs/decisions/`**: never rewrite an accepted decision; supersede it.
  Update the index table in `docs/decisions/README.md` in the same change.
- Dates are `YYYY-MM-DD`, people are GitHub handles (`@name`).
- Run `node tools/check-tracking.mjs` after editing any of these files.
