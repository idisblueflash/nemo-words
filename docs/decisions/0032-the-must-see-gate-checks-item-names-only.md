---
status: accepted
deciders: Flash Hu
date: 2026-10-16
backlog: [SP-064, C-034]
---

# 0032. The must-see gate checks item names only; the adjectives count only toward clarity

Technical Story: SP-064 (refine, 2026-10-16)

## Context and Problem Statement

SP-064's first build gated a cell out when its caption marked a must-see item, adjectives included, as hidden. A check on 3 words (`spikes/sp-064/gate-check/`) showed that the adjectives can describe the story's last step: corncob's "bare, tossed cob" put 6 of 9 cells out, Flash's cell 9 among them, while names only put none out. Names only was not better everywhere (scalpel: 3 cells out, against 1 with adjectives), so the captioner is also noisy from run to run.

## Considered Options

* Names only: the gate checks each item by its name; the adjectives count only toward the must-see clarity score
* Names only, confirmed by the grid lines: a cell is out only when its caption hides an item and the grid-differences call doesn't show it either
* Keep the adjectives in the gate, as first built

## Decision Outcome

Chosen option: "Names only", because it removed every false "hidden" on corncob, keeps the gate a plain check on the caption, and moves the adjectives to the clarity score, where a wrong state costs points instead of removing the cell.

### Positive Consequences

* A sequence story no longer loses the cells that show an earlier step.
* The report counts the words where the gate removed Flash's cell, so the cost of the gate is measured.

### Negative Consequences

* The gate stays noisy from run to run, and this spike measures it one time only.
* A cell that shows the right object in the wrong state passes the gate, and only the clarity score can push it down.

## Pros and Cons of the Options

### Names only

* Good, because the corncob check lost no cells to it.
* Bad, because scalpel lost 2 more cells than with adjectives.

### Names only, confirmed by the grid lines

* Good, because two blind calls must agree before a cell is out.
* Bad, because it matches free-text grid lines against item names, which is a new fuzzy step.

### Keep the adjectives in the gate

* Good, because the first build needs no change.
* Bad, because it removed Flash's corncob cell and 5 others.

## Links

* ADR-0031 (SP-064's go bar)
