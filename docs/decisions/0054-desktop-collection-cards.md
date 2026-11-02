# 0054 — On desktop, the Collection tab is a page of Modster cards under the selected one

- **Status:** Proposed — settled by P5-64 / @victor-aguilars
- **Date:** 2026-11-01
- **Proposed by:** @victor-aguilars, drafted by Claude

## Context

`/modsters` opens the collection pane. It was built for a terminal: a text list
you move through with `k` and `j`, tabs on the digits `1`–`5`, and a small
detail under or beside the list (P3-01 to P3-05, `collection-layout.ts`).

In the Desktop app's Code tab it docks as a column about 300 px wide. There the
Collection tab is a 35-row text list, mostly `???`, with one small silhouette
under it that scrolls off screen. Decision 0045 makes desktop first.

The first idea was a wide pane: a card grid beside the detail. Trying it in the
Code tab (P5-64, Claude Code Desktop with its bundled 2.1.308) found:

- **The dock stays at 30 body columns.** `$.ui.open({ columns: 100 })` changed
  nothing, though the API calls it a request the dock honours.
- **The expand icon's view takes no input.** Clicks and `k`/`j` do nothing
  there, so a layout can't rely on it.
- **A drawing that's too big is refused whole.** 35 cards, each with its
  desktop sheet embedded, came to 292,225 characters of Svg; the pane showed
  "has not drawn in this pane". A page of 12 (89,389) drew. The tests don't
  catch this: their fixtures are tiny.
- **Clicks reach the pane** (a `ui.press` arrives as `pick-<id>@desktop`).
- **A Button holds only `Text`**, and the desktop draws it as a native button
  that cuts a long label. A sprite can't be pressed.
- **Scrolling the pane back up didn't work** once the list was long, so the
  selected Modster could be out of view.

## Options

1. **A wide card view.** Doesn't work today: the dock can't be widened.
2. **A paged card grid in the narrow dock, the detail above it.** Fits the room
   we get, never needs the pane to scroll, and keeps each drawing small.
3. **A scrolling card grid.** Simpler, but the whole roster is too big to draw
   at once, and the selection scrolls out of view.

## Decision

Option 2 (@victor-aguilars, 2026-11-01, after trying each in the Code tab):

1. **Desktop only, any width.** The terminal keeps its list (P3-02). The plugin
   doesn't ask the dock for a width.
2. **The selected Modster's detail is on top**: its sprite moving (P5-38), then
   its text in `COLLECTION.desktopDetailRows` (14) rows, enough for the longest
   dex entry. The height is fixed so the grid under it holds still.
3. **Under it, one page of cards**, three a row in a narrow dock, as many rows as
   fit, at most `cardsPerPageMax` (12). The page is always the one with the
   selection. `Prev`, `Page x/y` and `Next` sit under it.
4. **A card** is the sprite fitted into `cardThumbPx` (72), the number as a
   Button that selects it, and the name (or `???`), wrapping to two rows. The
   selected card has a `cardSelectedColor` background.
5. **Cards hold still.** A caught card shows its first frame in colour, an
   uncaught one a gray silhouette; only the selected Modster moves.
6. **A page whose sprites pass `cardSvgCharsMax` (150,000 characters) drops
   them**, and the cards show `?`, so the pane still draws.
7. **The keys stay:** `k` and `j` move the selection across pages, `o` turns the
   selected Modster off or on (0032).
8. **A pane at least `gridMinColumns` (70) wide** puts the grid beside the
   detail instead of under it, should the dock ever be that wide.

## Consequences

- The Collection tab no longer depends on the pane scrolling on desktop.
- The other tabs (Biomes, Stats, Catchers, Settings) still use the terminal
  layout; Stats cuts its columns in the dock. P5-64 covers Stats and Biomes next.
- The 30-column dock, the dead expand view and the size limit are worth raising
  with the Claude Code team; if the dock can be widened later, point 8 is ready.
- `docs/DEVELOPMENT.md` should note how to see local changes in the Code tab
  (bump the version, `claude plugin update`, restart) and the size limit.
