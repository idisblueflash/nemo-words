---
status: accepted
deciders: Flash Hu
date: 2026-10-03
---

# 0021. Lay out a mnemonic comic as a 2×2 grid, not a 1×4 strip

## Context and Problem Statement

ADR-0020 lets a card's image be a four-panel comic picked from `_vivian`'s 3×3 grid.
Four panels can be arranged as a horizontal strip (the newspaper-comic default) or as a
square.

The first `overreach` comic was built as a 1×4 strip: 1724×440. On a phone the Anki card
scales that to the screen width, so each panel shrinks to roughly a quarter of it — the
small details that carry the meaning (the outstretched hand, the dizzy stars, the peach)
become hard to see.

Source cells are small to begin with: the current image launcher returns a 1254×1254
grid, so each cropped cell is about 418×418.

## Decision Drivers

* Legibility on a phone, where most reviews happen.
* Reading order must stay obvious.
* Match the footprint of a single-cell image, so the card's layout doesn't jump between
  comic and non-comic words.

## Considered Options

* 1×4 horizontal strip
* 2×2 grid

## Decision Outcome

Chosen option: "2×2 grid", because at the same card width each panel renders about twice
as large as in a 1×4 strip, and the square shape matches a single-cell image's
footprint. Reading order is left-to-right, top-to-bottom (Z-order), which a four-panel
comic reader follows without help.

Composition: each cell cropped with `scripts/crop-grid-cell.sh`, shaved 4px and given a
3px black border, arranged 2×2 with ~12px white gutters (`magick` `+append`/`-append`;
`montage` fails here for lack of a default font). For `overreach` the result is 868×868.

### Positive Consequences

* Each panel stays legible on a phone.
* Comic and single-cell cards share a square footprint.

### Negative Consequences

* Fixes the comic at exactly four panels; a three- or five-step sequence doesn't fit
  cleanly and would need its own decision.
* Z-order is slightly less immediate than a single row, since the eye has to wrap once.
* The composition is a manual `magick` command, not a script — fine for the first few,
  worth a `scripts/` helper if comics become common.

## Pros and Cons of the Options

### 1×4 horizontal strip

* Good, because it is the conventional comic-strip form with a single unbroken reading
  direction.
* Bad, because each panel is ~1/4 of the card width — too small on a phone.
* Bad, because the wide aspect ratio differs from single-cell images.

### 2×2 grid

* Good, because each panel is ~1/2 of the card width.
* Good, because it is square like a single-cell image.
* Bad, because it only fits exactly four panels.

## Links

* Layout for ADR-0020 (when to use a comic)
* First instance: `images/mnemonic/overreach.comic.png`
