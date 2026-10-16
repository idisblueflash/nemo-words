---
status: accepted
deciders: Flash Hu
date: 2026-10-16
backlog: [SP-064, C-030, C-036, C-037]
---

# 0031. SP-064 keeps SP-029's go bar: exact ≥ 45% and in-three ≥ 70%

Technical Story: SP-064 (refine, 2026-10-16)

## Context and Problem Statement

SP-064 tests a new image pick: a must-see gate, three Score axes from Jev, a weighted total, an alternative cell, and two certainty signals for sending words to Flash. The go bar has to be fixed before the run, as ADR-0027 did for SP-029. SP-064 has no row picks, so "in-three" needs a new meaning, and the new pick also offers other things to measure (the alternative cell, the words above a cut-off).

## Considered Options

* SP-029's bar: exact ≥ 45% and in-three ≥ 70%, with in-three = Flash's cell among the 3 highest totals
* Main or alternative: Flash's cell is the main or the alternative cell for ≥ 70% of words, and exact beats the always-cell-1 rule
* Confident words only: SP-029's bar on the words above the low-certainty cut-off, with at most 30% of words sent to Flash

## Decision Outcome

Chosen option: "SP-029's bar", because the result then compares directly with SP-029's no-go (exact 15.9%, in-three 46.3%), and the bar doesn't depend on anything the same run measures.

### Positive Consequences

* SP-064's rates sit next to SP-029's on the same terms, so the effect of the new method is plain.
* The bar is fixed before the run and can't drift with the tuning.

### Negative Consequences

* It ignores the alternative cell, though US-032 lets Flash swap to it; a pick that is often right as the alternative still fails the bar.
* It ignores the low-certainty route, so words that would go to Flash anyway still count against the bar.

## Pros and Cons of the Options

### SP-029's bar

* Good, because it compares directly with SP-029 and ADR-0027.
* Bad, because it measures only the main cell.

### Main or alternative

* Good, because it matches US-032, where Flash can swap to the alternative cell.
* Bad, because it isn't comparable with SP-029.

### Confident words only

* Good, because it matches how US-030 would use the certainty signal.
* Bad, because the cut-off is measured in the same run, so the bar would move with it.

## Links

* ADR-0027 (SP-029's go bar)
