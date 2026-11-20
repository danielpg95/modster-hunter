# 0059 — On desktop, a net's rim is a rope

- **Status:** Accepted (amends 0043 point 5 for desktop sheets)
- **Date:** 2026-11-19
- **Decided by:** @danielpg95 (drafted by Claude)

## Context

P5-80 gives the net catcher desktop art: a 40×40 tile of knotted rope. 0043
point 5 draws a `cover` catcher's dome as an ellipse filled with the tile, and
`rimIndex` (on desktop, `desktopSprite.rimColor`) as a flat ring around it, plus
a four-pixel plus for the knot on a catch. That is the terminal's look carried
over. Next to detailed desktop art, the smooth ring and the plus read as
terminal art (@danielpg95, 2026-11-19). No sheet can change them, because the
renderer draws them.

## Options

1. **Drop `rimColor` from the net.** The mesh is clipped to the dome with no
   edge. Content only, but the cut rope ends still trace a rigid arch, and the
   catch has no knot.
2. **Draw the rim as rope** in `catchSvg` when the catcher has a desktop
   sheet. No new fields: the shape and shades come from `rimColor`. Terminal
   nets keep 0043's ring.
3. **A rim strip in the sheet**, bent along the dome. SVG can't bend an image
   along a path, so this means many small pieces per throw, close to the Svg
   limit.

## Decision

Option 2. On the `desktop` surface, for a `stretch` beat of a catcher drawn
from a desktop sheet with a `rimColor`:

1. **The edge is scalloped.** Ties sit on the dome's curved edge about every
   `CATCH.ropeTiePx` (4) terminal pixels, at least 3 spans. Between ties the
   edge sags inward by `CATCH.ropeSag` (0.1) of the radius. The count is fixed
   for the throw from the full dome, so the shape animates with SMIL as the dome
   moves, rocks, shrinks and tears.
2. **The mesh fills that shape** with no ring, and the rope strokes it, across
   the bottom too: a dark outline (`CATCH.ropeOutline`, 1.6 px), the rope in
   `rimColor` (`CATCH.ropeWidth`, 1 px), and short light dashes for the twist.
   A dark knot (`CATCH.ropeKnot`, 1.7 px) sits on each tie. The dark shade is
   `rimColor` at 30%, the light one `rimColor` mixed 45% toward white.
3. **The catch's knot** is a small rope loop with two tails, drawn in the same
   three strokes at the dome's top, shown when 0043's plus would be.
4. The shape is one path in the Svg's `defs`; the mesh and every stroke `use`
   it, so a throw grows by about 10–15k characters, within 0043 point 8.
5. **Unchanged:** a terminal sprite's `rimIndex` keeps 0043's ring and plus, on
   the terminal and on desktop. A desktop sheet without `rimColor` has no edge
   (0043 as before).

## Consequences

- The net looks like a net on desktop, and any player's `cover` catcher with
  desktop art and a `rimColor` gets the same rope.
- `catch-svg.ts` gains the rope helpers and `CATCH` the rope constants;
  `catch-frame.ts` (the terminal) doesn't change.
- `CONTENT_FORMAT.md` and the mod's own format reference say what `rimColor`
  draws on desktop.
