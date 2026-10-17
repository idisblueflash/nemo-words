---
status: accepted
deciders: Flash Hu
date: 2026-10-17
backlog: [SP-066, C-041]
---

# 0034. SP-066 draws a new tuning set of 20 words and measures on the other 62

Technical Story: SP-066 (refine, 2026-10-17)

## Context and Problem Statement

SP-066 asked for two things: measure on the same 62 words as SP-064, and use a tuning
set that mixes hits and misses. Only 82 judged words exist. SP-064's 20 tuning words
are SP-029's blind-check words, and all of them are SP-029 misses. So both wishes can't
hold at once. Which words does SP-066 tune on, and which does it measure on?

## Decision Drivers

* Weights tuned only on hard words may fit hard cases too closely.
* The report must compare SP-066 with SP-064, SP-029, the chance rate and the always-cell-1 rule on the same words.

## Considered Options

* A seeded draw of 20 tuning words from all 82, with 4 or 5 SP-064 hits, and the other 62 measured; every baseline computed again on those 62 from saved results
* Keep SP-064's sets: tune on its 20 words and measure on the same 62

## Decision Outcome

Chosen option: "A seeded draw of 20 tuning words from all 82", because weights tuned only
on misses may fit hard cases too closely, and the saved results of SP-064 and SP-029
(`spikes/sp-064/raw/run.json`, `spikes/sp-029/raw/run.json`) let every baseline be
computed on the new 62 words.

### Positive Consequences

* The tuning set has hits and misses in about the share of the whole set.
* The comparison stays fair, because every rate in the report is over the same 62 words.

### Negative Consequences

* The measure set differs from SP-064's, so SP-064's published 21% exact and 42% in-three are not the numbers in SP-066's comparison.
* SP-064's analysis already looked at all 82 words, so the new 62 are not fully unseen.

## Pros and Cons of the Options

### A seeded draw of 20 tuning words from all 82

* Good, because the tuning words mix hits and misses.
* Good, because a fixed seed makes the same split on every re-run.
* Bad, because the measure words are not SP-064's measure words.

### Keep SP-064's sets

* Good, because the comparison with SP-064 is one to one.
* Bad, because the tuning words stay all misses, so the weights may fit hard cases too closely.

## Links

* `docs/backlog/items/SP-066-does-jev-agree-with-flash-when-vivid-scores-the-scene-not-the-camera.md`
* `docs/backlog/reports/SP-064-must-see-image-pick.md`
* ADR-0031 (SP-064 keeps SP-029's go bar)
