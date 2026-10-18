---
status: accepted
deciders: Flash Hu
date: 2026-10-17
backlog: [E02, US-062, C-043, C-016, C-029]
---

# 0036. E02 compares at least 80 cards per arm, not 30

Technical Story: backlog review, 2026-10-17

## Context and Problem Statement

E02's success signal compared 30 story cards with 30 control cards on lapse rate and on reaching a 21-day interval. The Wilson interval (C-043) shows that 30 cards per arm can see only a very large difference. On 30 cards, a 20% lapse rate has a range of 10% – 37%, and a 40% lapse rate has a range of 25% – 58%. The ranges overlap, so even a difference of 20 points may not show. US-062 must know at what size it gives a verdict.

## Decision Drivers

* A verdict must be able to see a difference that matters, for example 20% against 40%.
* The control arm needs weeks of reviews, so a larger size makes the verdict come later.

## Considered Options

* 80 cards per arm, with the Wilson interval of each arm's rate
* 30 cards per arm, with the Wilson intervals shown, and a note that only a very large difference is visible
* No change

## Decision Outcome

Chosen option: "80 cards per arm", because about 80 cards per arm can see 20% against 40% (95% certainty, 80% power), and 30 cards cannot. US-062 shows the Wilson interval of each arm's rate and gives a verdict only at 80 cards per arm.

### Positive Consequences

* A verdict at 80 cards per arm can show a 20-point difference in lapse rate.
* The intervals show how sure each rate is, also before the verdict.

### Negative Consequences

* The verdict comes later, because each arm needs about 2.7 times as many cards as before.
* 80 cards per arm still cannot see small differences. 20% against 30% needs about 290 cards per arm.

## Pros and Cons of the Options

### 80 cards per arm

* Good, because it can see a 20-point difference.
* Bad, because the data takes longer to build up.

### 30 cards per arm, intervals shown

* Good, because the verdict comes early.
* Bad, because only a very large difference is visible, so a "no difference" result says little.

### No change

* Good, because nothing changes.
* Bad, because a verdict on 30 cards per arm can mislead.

## Links

* ADR-0035 (the same lesson for the image-pick go bar)
