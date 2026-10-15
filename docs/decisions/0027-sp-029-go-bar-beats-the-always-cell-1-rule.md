---
status: accepted
deciders: Flash Hu
date: 2026-10-15
backlog: [SP-029, C-030, C-002, C-004]
---

# 0027. SP-029's go bar is exact ≥ 45% and in-three ≥ 70%, so Jev must clearly beat always picking cell 1

## Context and Problem Statement

SP-029 needs a go / no-go bar for auto image pick, fixed before the run. Chance is 11% for an exact match and 33% for Flash's cell being among Jev's three row picks. But Flash picked cell 1 in 34 of 107 past grids (32%), so a rule that always picks cell 1 already gets 32% exact without any judging.

## Considered Options

* Exact ≥ 45% and in-three ≥ 70%
* SP-037's bar: exact ≥ 40% and in-three ≥ 65%
* Go if Jev's exact rate beats the always-cell-1 rule's

## Decision Outcome

Chosen option: "Exact ≥ 45% and in-three ≥ 70%", because it asks Jev to beat the always-cell-1 rule by about 13 points, so a go means Jev reads the pictures, not just a position habit.

Also chosen: on a no-go, a blind check of 20 missed words (as SP-037's follow-up) says whether Flash would accept Jev's cell anyway. No blind check on a go.

### Positive Consequences

* A go can't come from a cell-1 bias alone.
* The blind check guards against a no-go that only reflects old picks, which is what SP-037 found.

### Negative Consequences

* The bar is higher than SP-037's, so a useful but imperfect picker may get a no-go first and need the blind check.
* The tie rule (lower cell wins) can still lean toward cell 1, so the report must count ties.

## Pros and Cons of the Options

### Exact ≥ 45%, in-three ≥ 70%

* Good, because it is clearly above both chance and the cell-1 rule.
* Bad, because about 82 words make the rate's error about ±10 points.

### SP-037's 40% / 65%

* Good, because it matches the story-pick bar.
* Bad, because it is only 8 points above the cell-1 rule.

### Beat the cell-1 rule

* Good, because it is the simplest test.
* Bad, because a 1-point win would count as a go.
