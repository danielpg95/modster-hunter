# Session — 2026-10-28 — @danielpg95 — General: desktop-first art plan

- **Task:** General (roadmap): desktop-first art tasks P5-43..P5-51
- **Branch:** `roadmap-desktop-first`
- **Status at end:** in-review
- **Last commit:** see the PR

## Goal for this session

Turn the move to desktop-first art into roadmap tasks with dependencies.

## Done

- Found why the desktop app showed no sprites: the installed mod was 0.0.1, from
  before desktop support. Moved the local install to the GitHub marketplace
  (`danielpg95/modster-hunter`, 0.1.8). The collection in `$.store` survived.
- Added P5-43..P5-51 to `docs/ROADMAP.md`: the desktop-first decision, format and
  loader, terminal fallbacks, drawing Modster sheets, the catch, backgrounds,
  contributor and player skills, and a first desktop art set.
- P5-01 (shiny variants) now depends on P5-43, so shiny covers desktop sheets.
- Commented on PR #171 about the new direction. It merged with its P5-40..42, so
  this PR removes them (the IDs stay unused) and P5-39's last item points to
  P5-43..P5-51. 0045 stays Proposed for P5-43 to rework.
- `node tools/check-tracking.mjs` passes.

## Decisions made

- Desktop-first: after P5-21, new built-in art is desktop art. Terminal art is
  optional, for the community.
- Rework 0045 rather than accept it. The desktop bar is set from scratch; only
  the spike's technical findings carry over.
- Desktop Modsters: hi-res pixel art, up to 128×128 per frame, 2–8 frames, at
  most 48 KiB. Catchers at most 24 KiB.
  - The budget: a throw embeds the Modster and the catcher in one Svg of at most
    131072 characters, and base64 adds a third.
- Content without terminal art shows the compact text layout on the terminal.
- Inkspector and Tidecrown still get terminal sprites in P5-21.

## Problems and findings

- Removing a marketplace uninstalls its plugins and resets their options, but
  `$.store` data stays.

## Next steps

1. Merge this roadmap PR, then claim P5-43.
2. Release the stale P5-19 row (PR #112 merged on 2026-10-16).

## Open questions

- Colour cap, alpha, background and catcher bounds, and the display scales: P5-43
  settles them. Defaults are in its entry.

## Found along the way

- P5-19's workboard row is stale; its PR #112 merged on 2026-10-16.
- P5-09 (terminal miniatures) loses priority under desktop-first.
