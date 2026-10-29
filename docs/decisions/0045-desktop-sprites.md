# 0045 — A Modster may have a desktop sprite: a 2× or 3× PNG sheet

- **Status:** Proposed — settled by @danielpg95 when reviewing the P5-39 PR
- **Date:** 2026-10-27
- **Proposed by:** @victor-aguilars

## Context

Terminal sprites are at most 48×32 (0033) and 24 colours (0034), because a
terminal cell holds two pixels. The desktop draws the same sprite larger
(0042), so detailed designs, such as a Tidecrown (#036) with a pearl chain,
ermine trim and a crowned head, can't be shown anywhere.

The P5-39 spike (`spikes/p5-39-desktop-art/`, checked in the Desktop Code tab on
2026-10-27) found:

- An embedded PNG (`<image href="data:image/png;base64,…">`) is blank in an
  `isInteractive` Svg (the sandboxed frame), but **shows in an Svg drawn as an
  image** (no `isInteractive`). **SMIL runs there too**: frames switched by
  `visibility`, a sprite sheet stepped by animating `x`, and `animateTransform`.
- A 144×91, 4-frame idle as one sprite-sheet PNG is 3,657 characters. As paths
  (0042) it is 315,007, over the 131072-character limit.

@victor-aguilars chose: exactly 2× or 3× the terminal sprite, used everywhere on
desktop, and up to 64 colours.

## Options

1. **An optional desktop sprite, exactly 2× or 3× the terminal one**, embedded
   as a PNG sheet. It drops into the boxes the terminal sprite already sets up.
2. **A desktop sprite of any size up to 144×96.** More freedom, but the band,
   catch and catcher geometry would need their own desktop rules.
3. **No desktop sprite.** Nothing to build, but detailed designs stay out.

## Decision

Option 1.

1. **`desktopSprite` in `modster.json`** (optional): `{ "file": "desktop.png",
   "scale": 2 }`, where `scale` is 2 or 3. The file is a PNG sheet in the
   Modster's folder with its frames side by side. It has:
   - exactly `sprite.frames` frames, played at the same `sprite.fps`, so both
     versions hold the same poses;
   - exactly `scale ×` the terminal sprite's width per frame and `scale ×` its
     height.
2. **Pixels.** At most 64 opaque colours. Every pixel is opaque or fully
   transparent (alpha cut at 128, as `.sprite.json`). At most 48 KiB, so its
   base64 stays well under the Svg limit.
3. **Validation.** A desktop sprite that breaks a rule is dropped with a content
   issue; the Modster still loads with its terminal sprite. The terminal never
   reads it.
4. **Drawing.** On the `desktop` surface, a Modster with a desktop sprite is one
   Svg **drawn as an image** (no `isInteractive`), with the PNG embedded as-is
   and stepped frame by frame by SMIL behind a frame-sized window, with
   `image-rendering: pixelated`. It takes the same box the terminal sprite
   would (`width × surface scale` CSS pixels, 0042). A Modster without one is
   drawn as today.
5. **Everywhere on desktop:**
   - the band and the encounter pane;
   - the Collection tab, where an uncaught Modster's silhouette is the same
     sheet through a filter that paints it the silhouette gray;
   - the catch animation (0043), where the Modster's frames inside `catchSvg`
     come from the sheet;
   - the catcher preview.
   An Svg that embeds a PNG is drawn as an image. That includes the catch, so
   its SMIL motion and colour filter must run in image mode; the task that builds
   it checks that in the Code tab first.
6. **Same Modster.** The terminal sprite is the desktop sheet reduced, not a
   different design: the same silhouette, colours, props and poses. A built-in
   Modster's PR shows both, side by side, every frame. A built-in desktop sprite
   is credited in `plugin/content/CREDITS.md` like any sprite.

## Consequences

- Desktop players see detailed, animated Modsters for a few thousand characters
  each.
- A Modster with a desktop sprite has two sheets to draw and keep in step.
- At the band's 2 CSS px per terminal pixel (0042), a 3× sheet gets fewer than
  one CSS pixel per art pixel. On a 1× screen some detail is lost in the band;
  the pane (4) and the Collection tab (3) show it whole.
- Shiny variants (P5-01) will need a desktop shiny sheet too; P5-01 decides how.
- Follow-up tasks: P5-40 (format, loader, validator), P5-41 (drawing on
  desktop), P5-42 (Tidecrown's desktop sprite and the contributor skills).
- `CONTENT_FORMAT.md` gains `desktopSprite` with P5-40, not before.
