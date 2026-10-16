# Session — 2026-10-16 — @victor-aguilars — P5-20 Fill Dustwind Expanse

- **Task:** P5-20 — Fill Dustwind Expanse
- **Branch:** `p5-20-dustwind-roster` (PR #113, from the `victor-aguilars` fork)
- **Status at end:** in-review
- **Last commit:** `01187da` (before this handoff)

## Goal for this session

Revisit the five Dustwind Modsters in PR #113 one by one and fix whatever didn't
look good enough. All "done when" items were already ticked; this was a quality pass.

## Done

- **Ranactus** (`plugin/content/modsters/ranactus/`): the croak frame shoots a
  long tongue with a sticky tip instead of a needle; text rewritten (bugs come
  for the cactus flower, "Lure Modster"). Type is now grass only.
- **Lamparito** replaces Lacuani (`plugin/content/modsters/lamparito/`, #027,
  rare, ghost / fire, 36×32, 4 fps): a smoke spirit curling out of a brass lamp.
  Converted from a new reference; the spirit and the lamp were converted
  separately and merged; face, smoke tail and flame hand-finished. Idle: float,
  beckoning hand, wish sparkles, smug closed eyes, flame flicker, lamp glint.
- **Torbellín** replaces Escarasol (`plugin/content/modsters/torbellin/`, #030,
  common, ground / normal, 38×32, 8 fps): a manic living dust devil. Arms, rock
  and pebble come from the reference; the funnel is drawn as stacked coils that
  ripple and spin; the face is hand-drawn and holds still.
- **Reyrayo** (was Stormcondor, `plugin/content/modsters/reyrayo/`, #031,
  legendary, flying / electric, 48×32): a close-up bust (crown to cloak)
  converted from the original reference, so the face is about 3× bigger. Idle:
  calm, crown sparks, a lightning strike behind the shoulder with an eye gleam,
  dying sparks. Text rewritten around lightning.
- Biome roster, `CREDITS.md`, roadmap names and `docs/previews/` follow every
  rename; old previews removed. The roster GIF
  (`docs/previews/dustwind-expanse-p5-20.gif`) is rebuilt on a 1-second timeline
  with an exact palette (every Modster at its own fps).
- The PR description is rewritten to match, with image links pinned to `01187da`.
- Verified after every change: `npm run check:content` (no errors),
  `node tools/check-tracking.mjs`, `claude plugin validate ./plugin --strict`,
  `claude plugin test ./plugin` (670 pass). Sprites checked as enlarged previews
  and GIFs on dark and light. Not tried in a live session.

## Decisions made

- Names chosen by the user: Lamparito, Torbellín (id `torbellin`, ids must be
  ASCII), Reyrayo. None of the Dustwind ids were on `main`, so renaming loses no
  collection entries (CONTENT_FORMAT "IDs are permanent").
- Types chosen by the user: Ranactus grass; Torbellín ground / normal; Reyrayo
  flying / electric; Lamparito ghost / fire.
- Large creatures can be shown as a close-up bust (Reyrayo). Only applied here;
  not a house rule. If it should apply to all large creatures, write a decision.
- Lacuani: a smiley-head / twitchy-idle redesign was tried, pushed (`42fe59e`)
  and reverted at the user's request (`fe3d137`); then replaced by Lamparito.
- An 8-frame idle was blocked by the built-in 2–4 frame rule (P2-09, enforced by
  `tools/check-content.mjs`). The user chose to stay within 4 frames.
- The roadmap item written for Lacuani ("32×32 or smaller … reads as menacing")
  now names Lamparito and decision 0033's size rule. Flagged in the PR body.

## Problems and findings

- Hand-drawn parts were often rejected (a hand-drawn condor bust, invented leg
  poses, a twitch animation). What worked: references from the user's image
  generator, converted with `ref-sprite`, then small hand fixes (eyes, mouths,
  leaks) and animation that moves whole parts.
- `ref-sprite --edges` lists the edges to flood the background *from*. Passing
  only `bottom` for a subject cut off at the bottom floods into the subject; use
  the other three edges.
- `ref-sprite` keeps only the largest connected shape and needs a dark outline:
  it dropped detached parts (Escarasol's sun, the lamp spirit, lightning, the
  boot) and failed on a reference with a light halo outline. Workarounds used
  (scripts lived in the scratchpad, not the repo): blank one part and convert
  the other; color-key the subject against the flat background and draw a dark
  ring around it before converting; add outline-less parts back by color.
- A violet outline lighter than `--dark 70` leaked; `--dark 140` worked.
- The repo tools need Node 22.18+; this machine's default `node` is 20. Use
  `~/.nvm/versions/node/v22.23.3/bin` first in `PATH`.
- The roster GIF covers one second, so 3 fps Modsters never show their 4th frame.

## Next steps

1. @danielpg95 reviews PR #113; someone runs `claude --plugin-dir ./plugin`, plays a Dustwind session, and ticks the PR's "Tried it" box.
2. Optional: revisit Fuescorpion (`plugin/content/modsters/fuescorpion/`), the only Dustwind Modster not revisited this session.
3. Start P5-21 (Saltbreeze Bay) with the same reference workflow; ask the user for generator references early.

## Open questions

- Should Fuescorpion get a pass too? — @victor-aguilars
- Should the close-up bust framing become a rule for large creatures (a decision)? — @victor-aguilars, then the maintainer

## Found along the way

- `ref-sprite` could take a `--key-bg` option (color-key the background and add a dark ring) and a `--keep-all` option (keep every shape, not only the largest). Owner of the tool: @danielpg95.
- A `tools/preview.mjs` could make the 8× preview PNGs and the roster GIF reproducible; today they come from one-off scripts.
- The `add-modster` skill could say that references with light outlines or busy backgrounds need masking first, and that `--edges` lists the edges to flood from.
- The roster GIF could loop over 4 s so every frame of every Modster shows.
