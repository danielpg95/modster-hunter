# 0046 — On desktop, a biome may draw its particles with its own art

- **Status:** Accepted
- **Date:** 2026-10-28
- **Decided by:** @danielpg95 (P5-48)
- **Amends:** 0044 point 4, on the desktop surface only

## Context

Idle scene particles (0026 point 3) are single pixels in one colour, and the
desktop draws them as 1-pixel squares (0044 point 4). Next to a detailed
desktop background (0045, P5-48) they read as specks: Whispering Forest's
"leaves" are green dots. @danielpg95 asked for real falling leaves, and for
biomes to plan their particles along with their art.

## Options

1. **Built-in shapes per style.** A small sprite for each of the five styles,
   tinted by `particles.color`. Every biome gets better particles at once,
   but every leaf biome has the same leaf.
2. **Per-biome particle art.** A biome may ship its own particle sheet
   (pine needles here, petals there). Most expressive; a format change.
3. **Both.**

## Decision

Option 2.

1. **`desktopParticles` in `biome.json`** (optional): `{ "file":
   "particles.png", "frames": N }`, a PNG sheet in the biome folder with its
   frames side by side. It's desktop art (0045): every pixel fully opaque or
   clear, at most 64 colours, saved compressed.
   - Each frame is at most 16×16 sheet pixels: a quarter of that, at most
     4×4, in strip pixels.
   - 1–8 frames, at most 4 KiB.
   - It needs `particles`: the style still sets the motion, and `density`
     the count. Its own colours replace `particles.color` on desktop.
   - A sheet that breaks a rule is left out with a content issue; the
     particles fall back to squares.
2. **Drawing.** On desktop, each particle is the sheet, embedded once and
   shown through a one-frame window. It moves as the style does today (drift,
   sway, twinkle), centred where the square would be. The frames step at
   `SCENE.particleFps`, so a leaf tumbles as it falls. Each particle starts at
   its own frame, from its `phase`, so they don't flip in step.
3. **Biomes without it,** and the terminal, are unchanged: squares on desktop,
   pixels on the terminal.
4. **Where the art comes from.** Particle art is small and simple: it's
   drawn in code or by hand, not reduced from a reference. The `add-biome`
   skill asks about particles together with the background.

## Consequences

- Each biome can say what falls, drifts or rises in it, in its own style.
- An embedded image makes the scene an image-mode Svg (0045 point 9) even
  without a desktop background.
- `CONTENT_FORMAT.md` gains `desktopParticles` with P5-48.
