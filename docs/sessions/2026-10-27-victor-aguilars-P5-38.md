# Session — 2026-10-27 — @victor-aguilars — P5-38 Desktop: catch, collection and scenes as Svg

- **Task:** P5-38 — Desktop: catch, collection and scenes as Svg
- **Branch:** `p5-38-desktop-svg`, `p5-38-desktop-collection`, `p5-38-desktop-scenes`, `p5-38-desktop-checks`
- **Status at end:** done
- **Last commit:** see the closing P5-38 PR

## Goal for this session

Finish the Desktop Code tab (decision 0042 point 4): the catch animation, the collection's sprites, the catcher preview and the biome scenes as `Svg`, then measure `rowPx`.

## Done

- **Catch animation** (#166, 0.1.6): decision 0043 and `render/catch-svg.ts`. One vector Svg per throw: the art is drawn once and moved with SMIL, sampled from `catch-frame.ts`'s own motion functions (now exported, behaviour unchanged). `register.tsx` swaps it in for a throw. Checked in the Code tab.
- **Collection and Catchers tabs** (#167, 0.1.7): the selected Modster as an Svg (its idle loop once caught, else a still silhouette), and the catcher preview as `catchSvg` looped with `loopPauseMs`. Checked in the Code tab.
- **Biome scenes** (#168, 0.1.8): decision 0044 and `render/scene-svg.ts`. The background is a tiled pattern, and particles move by SMIL from `idle-scene.ts`'s motion. The band is still between turns and moving while Claude works; the Biomes tab always moves. Checked in the Code tab.
- **Estimates:** `DESKTOP.rowPx` 20 and `columnPx` 8 checked by eye from a screenshot, noted in 0042 and 0044.
- Added **P5-39**, a spike on richer desktop art.
- Verified throughout: `claude plugin test ./plugin` (866 at the end), `validate --strict`, `check-content`, tools tests, `check-tracking`. Browser-pane filmstrips compared vector and pixel catches for every catcher on Inkspector and Geodon.

## Decisions made

- @victor-aguilars: vector catch (0043) over redrawing per frame or one Svg of pixel frames.
- @victor-aguilars: vector scenes with estimated `columnPx` and `rowPx` (0044), measuring after.
- @victor-aguilars: close P5-38 with the estimates checked by eye, and add a spike for richer desktop art.
- 0042, 0043 and 0044 are Proposed; @danielpg95 settles them.

## Problems and findings

- Every frame of a throw in one Svg is up to 413k characters; the vector catch is at most 79k, and scenes at most 20k.
- `Svg` has no `key` in the mods API, so a new throw is marked by `data-throw="<throwAt>"` in its source (0043 point 7).
- In SVG a child set `visibility="visible"` shows inside a hidden parent; the catch Svg uses `display`.
- A `key` passed through a JSX spread isn't the element's key.
- The marketplace copy on a player's machine doesn't refresh by itself: after a merge, run `claude plugin marketplace update modster-hunter`, then `claude plugin update modster-hunter@modster-hunter`, and start a new session.
- Terminal: the only behaviour change is one extra band redraw when a throw ends. Not checked live in a terminal on 0.1.8.

## Next steps

1. Settle 0042, 0043 and 0044 with @danielpg95.
2. Try a throw in a terminal session on 0.1.8 to confirm no regression.
3. P5-39, if someone wants richer desktop art.

## Open questions

- Decisions 0042, 0043, 0044 — @danielpg95.
- The desktop's real `bodyColumns`: the mod can't show it, so `columnPx` stays an estimate.

## Found along the way

- `npm run typecheck` fails in `plugin/tests/register-pane.test.tsx` (lines 119 and 137): prop literals typed as `string`, missing `scroll` and `view`.
- `/modsters pane` replies "widen the terminal" when unplaced, which reads wrong on desktop.
- `.claude/rules/mod-code.md` still says "draw text when the surface isn't terminal (until P5-06)".
- `register.tsx` computes a throw's length in two more places instead of `catchLengthMs`.
