# P5-52 spike: desktop interaction

Throwaway. Not part of Modster Hunter, and not shipped. It answers P5-52's
first three items: in the Desktop Code tab (inline, not fullscreen), which
presses reach a mod, and can a pane show a dex grid of animated `Svg`
thumbnails that opens a detail view on a press.

- `make-dex.mjs`: loads the built-in content with the mod's own loader and
  writes `mod/hooks/dex.ts`, one animated `Svg` per Modster (its desktop sheet
  when it has one, else its terminal sprite as paths).
- `mod/`: a tiny mod. `/interaction-spike` opens a pane of tests. It draws
  nothing in the terminal and takes no hotkeys.

## What the pane tests

| Letter | Test | What the API docs say |
| --- | --- | --- |
| A | A pane `Button` | A click raises `ui.press`, then `onPress` |
| B | An `Svg` drawn as an image | No `onPress`; nothing reaches the mod |
| C | An `isInteractive` `Svg` with a SMIL `begin="m.click"` throw, CSS `:hover` and a `<title>` | Hover, SMIL and tooltips run in the frame; no script |
| D | A `Button` laid over an `Svg` (`position: absolute`) | Untested |
| E | An `Svg` beside a `Button` in a row | Should work |
| F | A `Markdown` link with `onLinkPress` | Documented for "surfaces that report clicks" (the fullscreen terminal) |
| G | A `Client` (surface module) counting `onPointer` events | Desktop has `Client`; pointer events untested there |
| H | A band `Button` ("Poke"), shown above the game's band | A click raises `ui.press` |
| Grid | 12 or all 35 Modsters as thumbnails; a name opens a detail, Back returns | Each `Svg` up to 131072 characters; no stated total |

## Try it in the Desktop Code tab

```bash
node spikes/p5-52-desktop-interaction/make-dex.mjs
claude plugin marketplace add ./spikes/p5-52-desktop-interaction
claude plugin install modster-interaction-spike@modster-interaction-spike
```

Start a new Code tab session and run `/interaction-spike`. Then check the
terminal: run `claude` with the spike installed and confirm the game's band,
its digit hotkeys and its layout are unchanged. Afterwards:

```bash
claude plugin uninstall modster-interaction-spike@modster-interaction-spike
claude plugin marketplace remove modster-interaction-spike
```

## Found while building it

- **A hooks module file is read only up to 1 MiB.** All 35 Modsters with a
  thumbnail and a separate detail `Svg` came to over 1 MiB, so the spike keeps
  one `Svg` per Modster and draws the detail by passing a larger `width` and
  `height` to the same `Svg`.
- **35 thumbnails are 678,175 characters of `Svg`.** Terminal sprites drawn as
  paths cost the most (Geodon alone is about 40k); a desktop sheet is a few
  thousand. "Show all" tests whether one pane takes that much.
- **A `Box` has no `onPress`.** Only `Button` (strings and `Text` children),
  `Markdown` links and a `Client` can take a click, so "click a Modster" means
  D, F or G working, or a Button beside the picture (E).

## Findings (Desktop Code tab)

_Not checked yet._
