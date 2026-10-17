---
status: superseded
deciders: Flash Hu
date: 2026-10-17
backlog: [SP-066, C-044]
---

# 0036. SP-066 lowers plausible for a drawing error

Technical Story: SP-066 (staged run, after stage 2, 2026-10-17)

## Context and Problem Statement

In stage 1 of SP-066's staged run, Jev's main cell for anomaly was cell 7. In cells 3 and 7, the orange tile is turned and sits on top of the wall's grout lines, so it doesn't fit the grid of tiles. Flash called this a hard issue. The captioner read the tile as "tilted, shaking, irregular". The story says "irregular" and "rattles", so this read as a story detail and helped cell 7 win.

No caption field reports a drawing error, and Jev only sees the captions. So the pick can't tell a drawing error from a story detail.

## Considered Options

* The caption lists drawing errors, and code caps plausible
* The caption lists drawing errors, and the gate takes the cell out
* A 4th "well drawn" axis with its own weight

## Decision Outcome

Chosen option: "The caption lists drawing errors, and code caps plausible", because a drawing error makes the scene make less sense, which is what plausible scores. A cap lowers the cell without removing it when one caption is wrong, and it adds no weight to the search.

The caption lists each object that doesn't fit the picture: it floats, looks pasted on, or breaks the lines of the wall or floor. It says whether that object is a must-see item. An object that the scene shows as broken or crooked on purpose is not a drawing error. Code caps plausible at 1 for a drawing error on a must-see item, and at 2 for a drawing error on another object.

### Positive Consequences

* A drawing error such as anomaly cell 7's tile now lowers the cell's total.
* The cap is applied in code, so it is easy to test.
* The weight search stays at 3 weights, so the 20 tuning words are enough for it.

### Negative Consequences

* The caption prompt changes, so the 27 captions of stages 1–2 are made again.
* The captioner may miss a drawing error, or call a crooked story object an error. The spike measures this once.
* If drawing errors are marked in most cells, the cap is noise. The staged run stops for design in that case.

## Pros and Cons of the Options

### The caption lists drawing errors, and code caps plausible

* Good, because it fits what plausible already scores, and it adds no weight.
* Bad, because a missed error still lets a badly drawn cell win.

### The caption lists drawing errors, and the gate takes the cell out

* Good, because a badly drawn cell can never be picked.
* Bad, because it is too strict: one wrong caption removes a good cell.

### A 4th "well drawn" axis with its own weight

* Good, because the weight search can learn how much a drawing error matters.
* Bad, because 20 tuning words give little data for 4 weights.

## Links

* ADR-0035: the other decision made after stage 2
* Superseded by ADR-0037
