# Session — 2026-10-27 — @victor-aguilars — P5-39 Richer art on desktop (spike)

- **Task:** P5-39 — Richer art on desktop (spike)
- **Branch:** `p5-39-desktop-art`
- **Status at end:** done
- **Last commit:** see the P5-39 PR

## Goal for this session

Find out whether the Desktop app can show Modsters with more detail than the
terminal's 48×32 sprites, animated, and pick an approach.

## Done

- Claimed P5-39 (#170).
- `spikes/p5-39-desktop-art/`: a throwaway mod (`/art-spike`) and `make-variants.py`,
  which turns a high-detail Tidecrown (about 144×91) into test Svgs. Two rounds were
  run in the Desktop Code tab; findings are in its README.
- Decision 0045 (Proposed): an optional `desktopSprite`, a PNG sheet exactly 2× or 3×
  the terminal sprite, up to 64 colours, drawn everywhere on desktop as an image-mode
  Svg with the PNG embedded.
- Roadmap: P5-39 done; added P5-40 (format, loader, validator), P5-41 (drawing),
  P5-42 (Tidecrown's desktop sprite and the skills).

## Decisions made

- @victor-aguilars: desktop sprites are exactly 2× or 3× the terminal sprite.
- @victor-aguilars: used everywhere on desktop (band, pane, Collection, catch, preview).
- @victor-aguilars: up to 64 colours.
- 0045 waits for @danielpg95.

## Problems and findings

- An embedded `data:` PNG is blank in an `isInteractive` Svg, but shows in an Svg drawn
  as an image, where SMIL runs too: frame switching, a sprite sheet stepped by `x`, a
  smooth `animateTransform`, and an APNG all moved.
- A 144×91, 4-frame idle as one sprite-sheet PNG is 3,657 characters; as paths it's
  315,007, over the 131072 limit.
- The 96×64 test art was blurry because it was resampled from 144×91, not because of
  the surface.
- Round 1's screenshot read as off by one: the pictures under labels 2 and 4 looked
  like "3 and 5". Round 2 used letters and an end line per variant.

## Next steps

1. Settle 0045 (and 0042–0044) with @danielpg95.
2. Claim P5-40 once 0045 is accepted.
3. Remove the spike mod: `claude plugin uninstall modster-art-spike@modster-art-spike`,
   then `claude plugin marketplace remove modster-art-spike`.

## Open questions

- Decision 0045 — @danielpg95.
- Since SMIL runs in image mode, do the catch and scene Svgs (0043, 0044) need
  `isInteractive` at all? P5-41 checks the catch's filter in image mode.

## Found along the way

- `spikes/` is new. Whether spike harnesses stay in the repo after the task is
  @danielpg95's call; this one can be deleted once 0045 is settled.
