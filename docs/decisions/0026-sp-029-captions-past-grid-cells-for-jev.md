---
status: accepted
deciders: Flash Hu
date: 2026-10-15
backlog: [SP-029, C-030, C-002]
---

# 0026. SP-029 captions each cell of Flash's past grids for Jev to read

## Context and Problem Statement

SP-029 asks whether Jev picks the same image grid cell that Flash picked. Jev reads text only, so each cell needs a text description. `_vivian` writes a 1–9 staging list for each grid, but only in her report; it isn't saved. At refine (2026-10-15), 99 past grids matched their final crop to one cell clearly by pixels, 82 of them for whole-word cards.

## Considered Options

* Caption each cell of the past grids with a vision model (`claude -p`)
* Recover `_vivian`'s 1–9 lists from old session transcripts
* Make about 20 fresh grids and save their lists

## Decision Outcome

Chosen option: "Caption each cell of the past grids", because it makes all 82 whole-word grids usable, with Flash's real past picks, at no image-generation cost and without Flash picking again.

Also chosen for the run: whole-word cards only (US-030's scope), not the 17 word-part grids.

### Positive Consequences

* The sample is about 82 words, four times SP-037's 20.
* Flash's picks were made before the spike, so they can't be shaped by it.

### Negative Consequences

* Captions add a second layer of error between the picture and Jev. In US-030 Jev reads `_vivian`'s own list, so the real rate may differ from the spike's.

## Pros and Cons of the Options

### Caption each cell

* Good, because every clearly matched grid can be used.
* Bad, because the captioner isn't the text US-030 will feed Jev.

### Recover the lists from transcripts

* Good, because it's the same text US-030 would use.
* Bad, because some lists are likely missing, and the cell numbering in the text must be trusted.

### Fresh grids only

* Good, because it's the exact US-030 set-up.
* Bad, because it costs about 20 grid renders, and Flash must pick 20 cells again.
