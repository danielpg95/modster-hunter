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
