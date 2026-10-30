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

## Findings (Desktop Code tab, 2026-10-29)

Rounds 1–4 (0.0.1–0.0.4), checked by @danielpg95. Presses that don't reach
the mod show in the app's log (`~/Library/Logs/Claude/claude.ai-web.log`) as
`engine surface: ui_press not handled`, with the Button's key.

- **A pane Button (A), a Button over an Svg (D) and one beside it (E) all
  reach the mod.** A Button laid over the picture with `position: absolute`
  works, so "click a Modster" can be a Button drawn on top of it.
- **An isInteractive Svg runs a SMIL `begin="click"` animation, CSS `:hover`
  and a `<title>` tooltip (C)**, but the mod never hears the click.
- **A Markdown link with `onLinkPress` (F) reaches the mod, but every Button
  drawn after it in the same tree loses its handler** (rounds 1–3: H, the G
  toggle and the whole dex grid). With F moved last (round 4) they all work.
  Keep a pressable Markdown last in a tree, or don't use one.
- **A Client (G) gets pointer events on desktop.** It isn't what broke the
  Buttons (round 3 had it off and they still failed).
- **The dex grid works with 12 thumbnails** (desktop sheets and terminal-sprite
  paths, 209,750 characters of Svg in one pane): a name opens the detail, Back returns.
- **All 35 thumbnails (678,175 characters of Svg) break the pane.** The
  first press is handled, then every Button in the pane is dead: the redraw is
  refused, the old drawing stays on screen, and its handlers are gone. Nothing
  says so in the log beyond the dead presses. The limit is somewhere between
  209,750 and 678,175 characters; a grid must page.
- **`/reload-plugins` with the pane open leaves it blank** ("nothing to show
  yet"), even after running the command again. A new session draws it. Test
  each round in a new session.
- **A band row with an Svg and a Button draws on desktop (H)**, once the game
  isn't hunting. While it hunts, the game's own band hook answers without
  `next(e)`, so a band hook beneath it never runs: two mods can't share the
  band unless the upper one passes it on. A press on the band's Poke reaches
  the mod (its count went up).
