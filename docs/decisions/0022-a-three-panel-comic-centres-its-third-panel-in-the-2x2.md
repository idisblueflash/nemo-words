---
status: accepted
deciders: Flash Hu
date: 2026-10-03
---

# 0022. A three-panel comic keeps the 2×2 frame, with its third panel centred on the bottom row

## Context and Problem Statement

ADR-0021 fixed the comic layout at 2×2 and listed, as a negative consequence, that a
three-step sequence "doesn't fit cleanly and would need its own decision". Flash then set
the pick rule: a pick of several cells is normally 3–4, and either count should become a
2×2-style comic and be attached to the card. So a three-cell pick needs a placement
inside the 2×2 frame.

## Considered Options

* 2×2 with the fourth cell left blank (third panel bottom-left)
* 2×2 frame with the third panel centred on the bottom row
* A 1×3 strip

## Decision Outcome

Chosen option: "2×2 frame with the third panel centred on the bottom row", because it
keeps the square footprint and panel size from ADR-0021 and reads as a finished layout,
where a blank bottom-right cell looks like a missing panel. Reading order is still
unambiguous: two across the top, then the one below.

The rule is implemented in `scripts/compose-comic.sh`, which takes 3 or 4 cells in story
order and refuses any other count; it is covered by `test/compose-comic.test.js`. A
four-cell result is pixel-identical to the hand-built `overreach` comic.

### Positive Consequences

* Three- and four-step sequences share one size and shape on the card.
* One scripted command replaces the manual `magick` composition ADR-0021 described.

### Negative Consequences

* A three-panel comic has white space either side of its bottom panel.
* Two cells, or five or more, still has no layout — the pick flow asks the user which
  they mean instead.

## Pros and Cons of the Options

### 2×2 with a blank fourth cell

* Good, because the panel grid stays perfectly regular.
* Bad, because an empty cell reads as a missing panel.

### Centred third panel

* Good, because it looks deliberate and keeps the square footprint.
* Bad, because it leaves white space either side of the bottom panel.

### 1×3 strip

* Good, because it is a single reading direction.
* Bad, because it brings back ADR-0021's phone-legibility problem and a non-square shape.

## Links

* Extends ADR-0021 (2×2 layout); applies ADR-0020 (when to use a comic)
