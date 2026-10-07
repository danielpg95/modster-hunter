# Modster Hunter

A Claude Code **mod** (a plugin of function hooks) that runs a small idle
collecting game while Claude works: each session loads one random biome; while
a turn runs, Modsters appear in the band above the prompt and the user gets a
few throws to catch them. `/modsters` opens the collection.

Several people work on this repo, mostly through Claude Code sessions. Staying
on the same track matters more than speed. Read this file fully before acting.

## Start of every session

1. Run the **`start-session`** skill. It reads the workboard, the latest session
   logs and the roadmap, and tells you what the user is working on or can claim.
2. Don't start code for a task that isn't claimed by the current user in
   `docs/WORKBOARD.md`. If it isn't, use the **`claim-task`** skill first.
3. Before ending (or when the user says they're stopping), run the
   **`handoff`** skill. Never end a working session without a handoff file.

## Where things are

| Path | What |
| --- | --- |
| `docs/ROADMAP.md` | The plan: phases → tasks with IDs, dependencies, "done when" lists |
| `docs/WORKBOARD.md` | Who is working on which task right now, and the next step |
| `docs/sessions/` | One handoff file per work session. Read the latest for context |
| `docs/decisions/` | Settled and proposed decisions. **Read the index before designing anything** |
| `docs/CONTENT_FORMAT.md` | Schemas for biomes, Modsters, sprites, user settings |
| `docs/ARCHITECTURE.md` | Target code layout, event map, where state lives |
| `docs/DEVELOPMENT.md` | Commands, debugging, and API pitfalls |
| `docs/templates/` | Templates for handoffs, decisions, tasks, phase reviews, content |
| `plugin/` | The mod itself *(created by P0-02)* |
| `tools/` | Repo tools (`check-tracking.mjs`, later `sprite.mjs`) |
| `.claude/rules/` | Rules that load for specific paths |
| `.claude/skills/` | Contributor workflows (these skills) |

Two kinds of skills exist; don't mix them up:
- `.claude/skills/` help **contributors** build the repo.
- `plugin/skills/` ship **to users** inside the mod (phase 4).

## Golden rules

1. **Decisions are binding.** Follow accepted decisions in `docs/decisions/`.
   If a task needs something a decision doesn't cover, or contradicts one, stop
   and ask the user. Propose a new decision with the **`new-decision`** skill
   rather than silently choosing.
2. **Don't assume — ask.** When a requirement is ambiguous, ask the user one
   clear question instead of guessing. Record the answer in the session log.
3. **Stay inside your task.** Change only what the claimed task needs. Spotted
   something else? Add it to the handoff's "Found along the way" list or propose
   a roadmap task; don't fix it in passing.
4. **Pure core, thin adapters.** Game logic, validation and rendering math are
   pure and never touch `$` (see ARCHITECTURE.md).
5. **Tests with every behavior.** New logic comes with tests under
   `plugin/tests/`, using an injected random source and the fake clock.
6. **Never break input.** The game never steals keystrokes, never auto-opens a
   pane, and never exceeds the band's `maxRows`.
7. **The mod stays offline and quiet.** No network calls, no model calls, no
   telemetry, no processes, unless a decision says otherwise.
8. **Keep tracking honest.** Update the workboard and roadmap in the same PR as
   the work. Run `node tools/check-tracking.mjs` before every commit.

## Commands

```bash
node tools/check-tracking.mjs           # tracking format + consistency
node tools/check-tracking.mjs --next    # tasks that can be claimed now
claude --plugin-dir ./plugin            # run the mod from source (hot reload)
claude plugin validate ./plugin --strict
claude plugin test ./plugin
```

## Git conventions

- Branch per task: `p2-06-encounter-machine` (task ID, lowercase, short slug).
- Commit messages start with the task ID: `P2-06: add idle timeout transition`.
- One task per PR. The PR template's checklist must be complete.
- Never commit directly to `main`, except a workboard claim/update by a maintainer.

## Writing style for docs and UI text

Plain, short sentences. In-game text is playful but brief; it must fit the band.
Use the word "Modster" (capital M) for creatures, "biome" for areas.
