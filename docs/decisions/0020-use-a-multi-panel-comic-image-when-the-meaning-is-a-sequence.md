---
status: accepted
deciders: Flash Hu
date: 2026-10-03
---

# 0020. Use a multi-panel comic as the card image when the word's meaning is a sequence or consequence

## Context and Problem Statement

ADR-0012 gave the reading-room card one optional mnemonic image: `_vivian` renders a 3×3
grid of nine takes on the 🎭 story's scene, Flash picks one cell, and that single cell is
cropped and attached.

`overreach` exposed a gap. Its meaning has two halves — reaching beyond your power or
ability *and then failing for it* — and the story encodes both (*"Hanging over a peach
tree, he stretches too far, falls."*). The picked cell (1) shows only the reach. The
failure half, which is what separates *overreach* from plain *reach* or *ambitious*,
was in other cells of the same grid (7 slipping, 8 mid-fall, 9 flat on the grass with
dizzy stars), and a single crop throws it away.

The grid already holds those stages as separate cells, so a sequence costs no extra
render — only a choice about when a card should carry several cells instead of one.

## Decision Drivers

* The image should carry the *meaning*, not just the sound anchor — ADR-0018's gloss
  checks meaning in words; the image should check it in pictures.
* Dual coding: a picture that reproduces the story's steps in order makes one causal
  chain to recall, rather than a still frame the reviewer has to complete.
* Review speed: Anki reviews run a few seconds per card; extra panels cost reading time.
* House style consistency: ADR-0008/0009 assume one image per card.

## Considered Options

* Always a single cell (status quo, ADR-0012)
* Always a multi-panel comic
* A multi-panel comic only when the meaning is a sequence or consequence; single cell otherwise

## Decision Outcome

Chosen option: "a multi-panel comic only when the meaning is a sequence or consequence",
because extra panels earn their reading time only when they add meaning a single frame
cannot show. Rule of thumb:

* **Comic** — the word's meaning is a process, a reversal, or an action plus its
  consequence: *overreach*, *backfire*, *relapse*.
* **Single cell** — the word names a state or quality: *ubiquitous*, *serene*.

The panels are picked by Flash from the existing `_vivian` grid (same human-picks gate as
a single cell), in story order, and composed locally — no new render. The file is
`images/mnemonic/<word>.comic.png`, named in the row's `Image` column like any other
image; `anki-sync.js` needs no change. The single-cell crop at `<word>.png` stays on disk.
Layout is ADR-0021.

### Positive Consequences

* The card's image shows the whole meaning, including the consequence half.
* The sound anchor survives — `_vivian`'s hook element appears in every cell.
* No extra render cost and no sync-script change.

### Negative Consequences

* Slower to read than one image. It sits on the `Back`, after retrieval, so the cost is
  feedback time, not recall difficulty.
* The image is no longer uniform across the deck; the sequence/state call is a judgment
  made per word.
* A comic depends on the grid happening to contain usable stages in order — `_vivian`'s
  brief stages nine variations, not a planned sequence, so some grids won't have one.

## Pros and Cons of the Options

### Always a single cell

* Good, because it is uniform, fast to review, and already supported.
* Bad, because it drops the consequence half of sequence words like *overreach*.

### Always a multi-panel comic

* Good, because it is uniform.
* Bad, because state words gain nothing from extra panels and every review gets slower.

### Comic only for sequence/consequence words

* Good, because panels are added only where they carry meaning.
* Bad, because it needs a per-word judgment call.

## Links

* Builds on ADR-0012 (optional mnemonic image via `Image` column)
* Relates to ADR-0008, ADR-0009 (house style)
* Layout: ADR-0021
* First instance: `overreach` → `images/mnemonic/overreach.comic.png` (cells 1, 7, 8, 9)
