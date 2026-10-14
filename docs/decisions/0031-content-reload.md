# 0031 — `/modsters reload` keeps the encounter and moves on from a dropped biome

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decided by:** @danielpg95 (chosen in the P4-02 session; details drafted by Claude)

## Context

P4-02 adds `/modsters reload`, which loads built-in and user content again
without restarting Claude Code. Two earlier decisions don't cover it:

- 0006 keeps one biome "for the whole session". A reload can remove that biome
  (its file deleted, or now invalid).
- 0005 drops an encounter when the *mod* reloads (a module reload, e.g. after a
  `/config` change). A content reload doesn't reload the module, so nothing
  forces the encounter to go.

## Options

1. **Pick a new biome** once any encounter in progress ends, at random as at
   session start. The game keeps going; the biome changes mid-session.
2. **Keep the old biome** (its copy from before the reload) until the session
   ends. Nothing changes under the player, but the Biomes tab no longer lists
   the biome being played.

## Decision

1. `/modsters reload` never touches an encounter in progress: its Modster
   (name, sprite), tier, throws and catch odds stay as they were when it
   appeared. The next encounter uses the reloaded content.
2. If the session's biome still loads, it stays (0006), with its reloaded
   settings, Modsters and scene.
3. If it no longer loads (amends 0006):
   - with an encounter in progress, that encounter finishes in the old biome;
     when it ends, a new biome is picked uniformly at random from the reloaded
     ones and a toast says `Modster Hunter: now in <biome>`;
   - with no encounter, the new biome is picked right away and the reload's
     reply says `now in <biome>`.
   Turn and agent work time carry over; the spawn countdown isn't reset.
4. If no biome loads after a reload, the game stops until a later reload brings
   one back; the reply uses the no-biomes message (0007 point 5).
5. Option 1 was chosen.

## Consequences

- 0006 is amended: the biome is kept for the session unless a reload drops it.
- 0005's "a reload drops an encounter" applies to module reloads only.
- `register.tsx` keeps the encounter's `LoadedModster` and the dropped biome
  until the encounter ends (P4-02).
