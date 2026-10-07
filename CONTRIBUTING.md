# Contributing to Modster Hunter

Thanks for helping! This project is built by several people, often with
Claude Code, so we keep a simple, strict routine to stay on the same track.

## The routine

```
start-session ─► claim-task ─► work on a branch ─► handoff ─► PR ─► merge
     ▲                                                                │
     └──────────────────────── next session ◄─────────────────────────┘
```

1. **Orient.** Read [`docs/WORKBOARD.md`](docs/WORKBOARD.md) and the latest files in
   [`docs/sessions/`](docs/sessions/). With Claude Code: run the `start-session` skill.
2. **Claim before you work.** Pick a task from [`docs/ROADMAP.md`](docs/ROADMAP.md)
   whose dependencies are done (`node tools/check-tracking.mjs --next`). Add your
   row to the workboard and get that onto `main` (a tiny `PN-NN: claim` PR).
   First merged claim wins. Skill: `claim-task`.
3. **Work** on branch `pn-nn-short-slug`, inside the task's scope, following the
   [decisions](docs/decisions/). If you need a new decision, propose one
   (skill: `new-decision`) instead of choosing silently.
4. **Hand off** at the end of every session: add a file to `docs/sessions/`,
   update your workboard row. Skill: `handoff`. Template:
   [`docs/templates/handoff.md`](docs/templates/handoff.md).
5. **Open a PR** titled `PN-NN: what it does`, one task per PR, and complete the
   checklist. When the task is finished, the PR ticks the roadmap and removes the
   workboard row.

## Without Claude Code

Everything above is plain Markdown; the skills in `.claude/skills/` double as
step-by-step guides you can follow by hand.

## Other ways to help

- **Pitch a Modster or biome** with the "New Modster or biome idea" issue.
- **Report a bug** with the bug template.
- **Playtest** once phase 2 lands, and leave notes in an issue.

## Ground rules

- Be kind in reviews and issues.
- Original art only; credit every asset.
- Stale claims (no update in 7 days) may be released after a ping.
