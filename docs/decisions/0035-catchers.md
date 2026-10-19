# 0035 — Throws play a catcher animation, and players can make their own catchers

- **Status:** Accepted (amends 0003 and 0014; point 2 extended by P5-27 with `rimIndex`)
- **Date:** 2026-10-19
- **Decided by:** @danielpg95 (outside issue #129; details chosen in the 2026-10-19 session and drafted by Claude)

## Context

[0003](0003-catch-mechanic.md) asks for "a short wobble animation" before a
throw's result, but the band only shows the Modster's idle loop and the text
`wobble… wobble…` for 1.5 s ([0014](0014-encounter-timings.md) point 1). Issue
#129 compared four ways to animate a catch: a glass jar, a seed pod, a lantern
and a net. A two-tone capsule was ruled out because it reads as a Pokéball.

Facts that shape it:

- The sprite is a `Raster` repainted with `$.ui.blit` (0012), so an animation
  can draw anything inside the Modster's sprite area without extra rows.
- Each throw is rolled when it's made (0014 point 4), so the animation knows
  the result in advance.
- The band and the encounter pane share one frame loop (0015).
- The mod runs no player code and stays offline (golden rule 7), so player
  animations have to be data.

## Options

1. **One built-in animation.** Pick one of the four concepts and ship it.
   Simple, but every throw looks the same for everyone.
2. **Several built-in catchers, picked in the pane.** More variety, but
   players can't add their own.
3. **Catchers as content.** The built-ins ship as defaults; players make their
   own through the content skill and pick one in `/modsters`. It needs a format,
   a loader and a tab.

Within option 3, how a player describes the animation:

- **a. One image;** the engine does every motion. Easy, but every catcher moves
  the same way.
- **b. Optional beats:** named frames per beat, with missing beats made from the
  closed frame. The engine still handles timing and what the Modster does.
- **c. Every beat drawn by hand.** The most control, but more art per catcher.

Option 3 with b was chosen. Beats are declarative, so players can set their own
choreography without code.

## Decision

1. **A catcher is content.** It lives in `content/catchers/<id>/` beside
   `biomes/` and `modsters/`, in both the built-in and the user folder:
   `catcher.json` plus a sprite (`sprite.png` and/or `sprite.sprite.json`, with
   the same rules and PNG path as a Modster's sprite, 0016 and 0025). IDs follow
   the usual rules in their own namespace. A user catcher with a built-in's id
   replaces it (0007). Built-in catchers load even when `includeBuiltins` is
   off, so there is always one to use.
2. **`catcher.json`** has `schemaVersion`, `id`, `name` (≤ 32), `description`
   (≤ 120), `style`, `sprite`, and the optional `beats`, `glowIndex` and
   `lidRows`. P5-27 sets the exact fields and bounds in `CONTENT_FORMAT.md`.
3. **Beats.** A throw plays these beats in order: `throw`, `take`, `settle`, then
   `rock` once per rock, then `caught` or `broken`. Each beat can set:
   - `frames`: sprite frame indexes, played evenly over the beat.
   - `place`: `over` (anchored at the bottom center of the Modster's area),
     `behind`, or `stretch` (tiled over the Modster's outline).
   - `modster`: what the Modster does. One of `visible`, `hidden`, `dim`,
     `shake`, `shrink-in`, `shrink`, `hop-out` or `pop-out`.
   - `path`, for `throw` only: `arc`, `drop` or `none`.
4. **Styles are presets of beats.** `style` is `contain`, `cover` or `custom`. A
   catcher may override single beats on top of a preset.
   - `contain`: the catcher arcs in, opens, takes the Modster in (shrinks it
     toward the opening, flashing white), closes and rocks. A catch clicks shut
     with sparkles; a miss bursts open and the Modster pops out.
   - `cover`: the catcher drops over the Modster, which stays visible and shakes
     with each rock. A catch cinches it; a miss tears open and the Modster hops
     out.
   - `custom`: no preset. Every beat comes from `beats`.

   Only a closed frame is required. Missing frames are made from it: it tilts
   for the rocks, its top `lidRows` rows lift to open, and those rows fly off on
   a break. `glowIndex` is a palette index painted in the Modster's most common
   bright color, so each catch looks a little different.
5. **One timeline for every catcher,** at 12 fps:
   - `throw`: 0–0.35 s.
   - `take`: 0.35–0.75 s.
   - `settle`: 0.75–0.9 s.
   - `rock`: 0.5 s each.
   - `broken`: 0.45 s.

   Catchers can't change these lengths, so every catcher plays equally fast.
6. **The rock count hints at the result.** A catch rocks 3 times and clicks at
   2.4 s; its `caught` beat plays at the start of the result card. A miss rocks
   1 or 2 times, chosen with the injected random source, then plays `broken`:
   1.85 s or 2.35 s in all. The throwing phase is never longer than 2.4 s. This
   replaces 0014 point 1's "throw wobble 1.5 s". Throws and runs are still
   ignored until the throwing phase ends (0014 point 3, 0020).
7. **Text-only places show a dot count.** The compact band, the one-row band and
   the status line replace `wobble…` with one dot per rock: `● ○ ○`, then
   `● ● ○`, then `● ● ● click!` for a catch, or `● ✕ ○ broke free!` for a miss
   after one rock. The spinner keeps "A wild … appeared!" until the result,
   as today.
8. **Where it doesn't fit, the text plays.** If the catcher's frames don't fit
   the Modster's sprite area, the sprite holds still and the text lines show the
   dot count. The band never takes more rows than it does today (0012).
9. **The player picks one catcher in `/modsters`.** A new tab, `5: Catchers`,
   lists every catcher. The one in use is marked `✓ in use`, and the player's
   own are marked `yours`. The selected catcher plays animated on a Modster the
   player has caught, or on a silhouette when they've caught none. `Enter`
   makes it the one in use, saved in `$.store` as `prefs:catcher`. It applies
   from the next throw; a throw in progress keeps its catcher. Catchers can't be
   turned off. A player's own catcher shows the same delete hint as 0032 point 7.
10. **The default is the glass jar** (`jar`). It's used when `prefs:catcher` is
    missing or names a catcher that no longer loads.
11. **Every catcher is in the library from the start.** Unlocking catchers
    through milestones could come later (P5-03), with a new decision.
12. **Catchers only change how a throw looks.** They never change the catch
    rate, throws, timing or results.
13. **Built-in catchers:** `jar` (glass jar, `contain`, with a glow), `pod` (seed
    pod, `contain`, with a glowing seam), `lantern` (`contain`, with a flame in
    the Modster's color) and `net` (`cover`).
14. **The content skill makes catchers.** `create-modster-content` gains a
    "Make a catcher" section. Its helper (0025) can preview a catcher's
    animation on a sample Modster, and `check` validates catchers like other
    content. Deleting a player's own catcher follows 0032 point 7.

## Consequences

- 0003 (animation) and 0014 (point 1's throw length; point 4's "wobble") are
  amended; their status lines say so.
- `ENCOUNTER.throwingMs` gives way to a catch timeline in `constants.ts`, and
  the encounter machine rolls the rock count with the throw.
- The tab row grows by `5: Catchers`. P5-30 checks it still fits the narrowest
  pane, or wraps it.
- Roadmap tasks P5-27 to P5-31 build this: the format and loader, the animation
  engine, the built-in catchers, the Catchers tab, and the skill.
- Issue #129 is answered by this decision.
