---
name: add-catcher
description: Add a new built-in catcher (the throw animation that catches a Modster) to the Modster Hunter repo's plugin/content/ — design, style and beats, desktop art, a terminal sprite or both, catcher.json, credits, previews and validation. Use when a contributor wants to create, draw or add a catcher to the built-in content, or give one desktop art. Not for a player's own catchers in ~/.claude/modster-hunter/content/ (that's the mod's create-modster-content skill).
---

# Add a built-in catcher

A catcher is what a throw plays: it flies in, takes the Modster, rocks, and
clicks shut or breaks (decision 0035). It lives in
`plugin/content/catchers/<id>/` with a `catcher.json` and its art. Follow
`docs/CONTENT_FORMAT.md` ("`catcher.json`" and "Desktop art") and
`.claude/rules/content.md`. Show the user every pass and wait for approval
before anything goes in; never move on to the next part on your own.

## Desktop, terminal or both

Ask which, before the design (decision 0045):

- **Desktop** (the default for new built-ins): `desktopSprite`, hi-res pixel
  art up to 96×96 per frame, 1–16 frames, up to 64 colours, at most 24 KiB.
  `glowColor` and `rimColor` name colours from the sheet; `lidRows` counts the
  sheet's rows. On the terminal, a desktop-only catcher plays as the default
  catcher.
- **Terminal:** `sprite`, at most 32×32, 1–16 frames; `glowIndex`, `rimIndex`
  and `lidRows` are palette indexes and sprite rows.
- **Both:** the same design. The beats are shared, so every frame a beat names
  must exist in both, but each version may have more frames of its own.

A desktop catcher draws at a quarter of its pixels in a throw, so a 76×80
sheet takes the room of a 19×20 terminal one. Built-in catchers must fit every
built-in Modster's sprite area (`check:content`, P5-29): keep the desktop sheet
at most 4× the smallest built-in Modster's terminal size.

## Steps

1. **Ask for the design, one field at a time:** what it is, its name (≤ 32)
   and `description` (≤ 120), then how it plays. For each, 2–3 suggestions and
   room for the user's own answer:
   - `style`: `contain` (arcs in, opens, takes the Modster in, closes and
     rocks), `cover` (drops over it and shakes with it) or `custom` (every
     beat from `beats`). See CONTENT_FORMAT "Styles".
   - Which beats get their own frames (`beats.<beat>.frames`, played evenly
     over the beat), and what each frame shows. A frame for the rocks and one
     for a catch are the usual extras. Only a closed frame (frame 0) is
     required; the preset makes the rest from it.
   - Glow (`glowColor` / `glowIndex`): a part that lights up in the caught
     Modster's colour while it's inside. Optional.
2. **Make the art.**
   - **Geometric or mechanical catchers** (a box, a cube, a cage) come out best
     drawn in code: a small model projected and filled pixel by pixel, no
     anti-aliasing, a few light levels per face, a 1-px dark outline. The
     puzzle cube (P5-47) was drawn this way, with layers caught mid-turn so
     its rock frames read as fast solving. Write the script in the
     scratchpad, never the repo.
   - **Organic ones** (a net, a pod, a jar with a creature-like lid) are better
     from a reference, as in the `add-modster` skill: `ref-sprite --desktop`
     for desktop art, without it for terminal art.
   - Movement reads better as mid-motion poses than as colour swaps.
   - Desktop sheets: frames side by side, every pixel fully opaque or clear,
     saved with pngjs at `{ deflateLevel: 9, deflateStrategy: 1 }`.
3. **Write `catcher.json`** in `plugin/content/catchers/<id>/`: `schemaVersion`,
   `id`, `name`, `description`, `style`, `beats` if any, and
   `"sprite": { "file": "sprite.sprite.json" }` and/or
   `"desktopSprite": { "file": "desktop.png", "frames": N, "lidRows": …, "glowColor": … }`.
   Convert a terminal sprite with `npm run sprite -- sprite.png --frames N`
   (never hand-edit the output).
4. **Preview the throws:**
   - Desktop:

     ```bash
     node tools/sprite.mjs desktop.png --frames N --desktop catcher --catcher catcher.json --preview preview.html
     ```

     It checks every 0045 rule and plays real throws (a catch and a miss) on
     Shellsprout, which has desktop art, and on Mossmaul, which has terminal
     art, drawn as images the way the Code tab draws them. A throw over the
     Svg limit or that doesn't fit says so.
   - Terminal: `node plugin/skills/create-modster-content/scripts/modster-content.mjs preview-catcher plugin/content/catchers/<id> --out preview.html`.

   Open the page for the user, unasked, and wait for approval.
5. **Credit it** in `plugin/content/CREDITS.md`, one row per file
   (`sprite.png`, `desktop.png`); `check:content` fails without them.
6. **Validate:** `npm run check:content` and `claude plugin test ./plugin`.
7. **Try it in the game:** pick it in `/modsters` → Catchers (`u`), then
   throw. For desktop art that's the Desktop app's Code tab: offer to point
   the user's install at this checkout (`claude plugin marketplace add
   <repo>`, then `/reload-plugins`) and switch it back after.
8. **Show it in the PR:** commit a preview image to
   `docs/previews/<id>.png` (every frame, enlarged, on dark and light) and
   embed it with a raw GitHub link pinned to the commit.
