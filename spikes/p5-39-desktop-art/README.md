# P5-39 spike: richer art on desktop

Throwaway. Not part of Modster Hunter, and not shipped. It answers P5-39's
first two items: can a desktop `Svg` show (and animate) an embedded PNG, and
what does high-detail art cost against the 131072-character `Svg` limit.

- `tidecrown-source.jpg`: a high-detail Tidecrown (#036) by @victor-aguilars,
  about 144×91 art pixels. Too detailed for the terminal's 48×32 (0033).
- `make-variants.py`: samples it to 144×91 and 96×64, makes a 4-frame bob, and
  writes `mod/hooks/variants.ts`, one test Svg per way of drawing it.
- `mod/`: a tiny mod. `/art-spike` opens a pane of every variant.

## Try it in the Desktop Code tab

```bash
claude plugin marketplace add ./spikes/p5-39-desktop-art
claude plugin install modster-art-spike@modster-art-spike
```

Start a new Code tab session and run `/art-spike`. Afterwards:

```bash
claude plugin uninstall modster-art-spike@modster-art-spike
claude plugin marketplace remove modster-art-spike
```

## Findings (2026-10-27, Desktop Code tab)

Round 1 (0.0.1) and round 2 (0.0.2), checked by @victor-aguilars:

- **An embedded PNG (`<image href="data:image/png;base64,…">`) is blank in an
  `isInteractive` Svg**, the script-less sandboxed frame (round 1 variants 1, 3,
  5; round 2 control H). The frame blocks `data:` images.
- **Drawn as an image (no `isInteractive`) it shows, and SMIL runs**: frames
  switched by `visibility`, a sprite sheet stepped by animating `x`, and a smooth
  `animateTransform` all move. An APNG animates by itself too.
- Crisp at 2 CSS px per art pixel, with or without `image-rendering: pixelated`.
- The 96×64 variants were blurry because the test art was resampled from
  144×91, not because of the surface.

Sizes against the 131072-character limit (4-frame idle, palette PNG):

| Tidecrown at | One sprite-sheet PNG | 4 PNG frames | APNG | Paths, 1 frame | Paths, 4 frames |
| --- | --- | --- | --- | --- | --- |
| 144×91 (~3× Geodon's 46×32) | 3,657 | 11,010 | 52,409 | 88,150 | 315,007 (over) |
| 96×64 (~2×) | 2,853 | 8,605 | 35,935 | — | — |

A sprite-sheet PNG is the cheapest by far: a 3× animated Modster costs under 4k
characters, about 3% of the limit.
