# 0002 — Encounters in the band above the prompt, collection in a pane

- **Status:** Accepted
- **Date:** 2026-10-07
- **Decided by:** @danielpg95

## Context

- The **band** (`AbovePrompt` render site) is always visible and shared with
  other mods, but short. Its height is `e.props.maxRows`.
- A **pane** has room for large art, but a pane the mod opens by itself only
  appears in terminals at least 144 columns wide (110 after the user opened it
  once).
- Keys go to the prompt unless our pane/band has focus. Exception: a digit
  `hotkey` on a band `Button` fires when the user types that digit alone into an
  empty prompt and pauses. A band taller than `maxRows` scrolls, and then bare
  digits arm no hotkey.

## Decision

- **Encounters** (appear animation, throws, result) are drawn in the band.
  The throw button uses digit hotkey `1`. The band tree must never exceed
  `maxRows`; if the sprite doesn't fit, draw a smaller variant or text.
- **Collection, biomes, stats and settings** live in a pane opened by the
  `/modsters` command (user-initiated, so it opens at any width).
- The mod never auto-opens a pane.

## Consequences

- The band layout needs a compact mode for short terminals (P2).
- If the user is typing, `1` goes into their prompt, not to the game. That is
  intended: the game must never steal input.
