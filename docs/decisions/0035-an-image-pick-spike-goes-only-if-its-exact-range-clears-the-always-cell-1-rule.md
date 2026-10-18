---
status: accepted
deciders: Flash Hu
date: 2026-10-17
backlog: [SP-066, C-043, C-040]
---

# 0035. An image-pick spike goes only if its exact range is above the always-cell-1 rule, too

Technical Story: explanation of C-043 (Wilson interval), 2026-10-17

## Context and Problem Statement

ADR-0031 decides go on the rates alone: exact ≥ 45% and in-three ≥ 70%. A spike measures these rates on a small set of words (62 in SP-066), and on 62 words one word moves a rate by 1.6 points. A spike report now shows the 95% Wilson interval (C-043) next to each rate. A rate that is just on the bar can come from luck: 28 of 62 (45%) meets the exact bar, but its range is 33% – 57%. That range includes the always-cell-1 rule (39% on SP-066's 62 words), so the pick could be no better than always picking cell 1. The go bar must say whether the range counts.

## Decision Drivers

* A go must mean that the pick is better than the simplest baseline, not only that one run was lucky.
* The bar must stay reachable on about 62 words, the size of the current measure set.
* SP-066 is being built in another session, and its bar must not change during the build.

## Considered Options

* Rate + lower end: the rates of ADR-0031, and the lower end of the exact rate's 95% Wilson interval above the always-cell-1 rule
* Rate only, range shown: ADR-0031 as it is; the report shows the range, but only the rates decide go
* Lower end on the bar: the lower end of each range must be on the bar (exact ≥ 45%, in-three ≥ 70%)

## Decision Outcome

Chosen option: "Rate + lower end", because it stops a lucky run on the bar from giving go, and it stays reachable on 62 words. On 62 words, exact needs 32 hits (52%), not 28. "Lower end on the bar" needs 36 of 62 exact and 51 of 62 in-three, which no pick so far comes near.

The rule starts with the next image-pick spike after SP-066. SP-064 and SP-066 keep ADR-0031's bar, so this record does not supersede ADR-0031.

### Positive Consequences

* A go shows that the pick beats the always-cell-1 rule with 95% certainty, not only that its rate is higher.
* The rates stay the same as in ADR-0027 and ADR-0031, so results still compare with SP-029, SP-064 and SP-066.

### Negative Consequences

* A pick whose exact rate is between 45% and about 52% on 62 words is a no-go, although it can be truly good. More words make this gap smaller.
* The in-three rate gets no range check, so a lucky in-three rate can still pass.
* The always-cell-1 rate depends on the measure set, so each spike must measure it on its own words before the run.

## Pros and Cons of the Options

### Rate + lower end

* Good, because a lucky rate on the bar does not give go.
* Good, because it stays reachable on 62 words (32 of 62 exact).
* Bad, because it adds a second check to the bar.

### Rate only, range shown

* Good, because it changes nothing and stays simple.
* Bad, because 28 of 62 gives go although its range includes the always-cell-1 rule.

### Lower end on the bar

* Good, because a go is then very sure.
* Bad, because it needs 36 of 62 exact and 51 of 62 in-three, so it is almost out of reach on 62 words.

## Links

* ADR-0031 (SP-064's go bar, kept by SP-066)
* ADR-0027 (SP-029's go bar)
