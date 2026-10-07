---
name: start-session
description: Orient at the start of a Modster Hunter work session. Reads the workboard, latest handoffs and roadmap, then tells the user what they're on or what they can claim. Use at the beginning of every session, or when the user asks "where are we", "what's next" or "what should I work on".
---

# Start a session

Goal: in under a minute, the user knows where the project stands and what
they'll do this session, and nothing has been assumed.

## Steps

1. **Identify the user.** Get their GitHub handle:
   `gh api user --jq .login` if `gh` is signed in, otherwise
   `git config user.name`, otherwise ask. Don't guess.
2. **Sync.** Run `git fetch` and `git status`. If the current branch is behind
   `origin/main` or has uncommitted changes, tell the user before anything else.
3. **Read the state**, in this order:
   - `docs/WORKBOARD.md`: the user's rows, and anything `blocked`.
   - The 3 most recent files in `docs/sessions/` (by filename date), plus the
     latest one for each task the user owns. Note their "Next steps" and "Open questions".
   - `docs/decisions/README.md` index: any `Proposed` decision touching the
     user's task.
   - In `docs/ROADMAP.md`, the full entry for each task the user owns.
4. **Check consistency.** Run `node tools/check-tracking.mjs`. Report failures.
5. **Report** to the user, short:
   - Current phase and overall progress (tasks done / total per phase).
   - Their claimed task(s): status, last session's next step, open questions.
   - If they own nothing: the output of `node tools/check-tracking.mjs --next`,
     with a one-line suggestion that fits the current phase.
   - Anything blocked, stale (> 7 days) or a Proposed decision that affects them.
6. **Agree on the session goal.** Ask which "done when" items they want to
   finish this session. If they want to start an unclaimed task, run
   `claim-task` first.

## Don't

- Don't start editing code in this skill.
- Don't summarize every file; report only what affects this user's next move.
