# SP-064 — Does Jev agree with Flash's image pick once it checks the must-see objects and the shot?

Run 2026-10-16. Per word: a must-see list (Claude, text only), a caption per cell and one difference line per cell (Claude, blind to the word, the story and Flash's cell), a gate on hidden must-see items, then one Jev request scoring each remaining cell on plausible, vivid and must-see clarity (`image-rubric.json`). Code adds the weighted scores; the highest total is the main cell (ties: higher plausible, then lower cell).
Tuned on 20 blind-check words (20 judged); measured on 62 other words (62 judged). Rates are over the judged words only.

## Results (measured words)

| | SP-064 | SP-029 (same words) | Chance | Always cell 1 |
|---|---|---|---|---|
| Exact (the main cell is Flash's cell) | 13 / 62 (21.0%) | 13 / 62 (21.0%) | 11% | 24 / 62 (38.7%) |
| In three (Flash's cell is among the 3 highest totals) | 26 / 62 (41.9%) | 31 / 62 (50.0%) | 33% | 32 / 62 (51.6%) |

SP-029 over all its judged words: exact 13 / 82 (15.9%), in three 38 / 82 (46.3%). SP-029's "in three" is Flash's cell among its three row picks.
Chance is 1/9 (exact) and 3/9 (in three). The always-cell-1 rule picks cell 1, and its 3 highest are cells 1, 2 and 3. With fewer than 3 scored cells, in three is over the scored cells only.

## Weights

Weights (tuned on the 20 blind-check words): 3 × plausible + 1 × vivid + 3 × must-see clarity. Start guess: 2 × plausible + 1 × vivid + 1 × must-see clarity. Searched: each weight 0–3; most exact, then most in three, then nearest the start guess.
Tuning: exact 5 / 20 (25.0%), in three 8 / 20 (40.0%).

## Ties

A tie on the total goes to the higher plausible score, then to the lower cell (SP-029's lower-cell tie-break favoured cell 1).

- Picks decided by a tie: 0 of 62 (tuning words: 0 of 20)
- Exact matches whose pick was a tie: 0 of 13

## Main or alternative cell

- Flash's cell is the main cell: 13 of 62 (21.0%)
- Flash's cell is the alternative cell: 5 of 62 (8.1%)
- Main or alternative: 18 of 62 (29.0%)

## Certainty signals

Bands are thirds of the measured words, per signal.

### Margin

The best total minus the second-best (C-036).

| Band | Words | Range | Exact | In three |
|---|---|---|---|---|
| High | 21 | 1.09 – ∞ (one scored cell) | 6 / 21 (28.6%) | 10 / 21 (47.6%) |
| Middle | 20 | 0.35 – 0.93 | 3 / 20 (15.0%) | 8 / 20 (40.0%) |
| Low | 21 | 0.01 – 0.31 | 4 / 21 (19.0%) | 8 / 21 (38.1%) |

### Weakest confidence

The lowest of the main cell's three Jev confidences (C-037).

| Band | Words | Range | Exact | In three |
|---|---|---|---|---|
| High | 21 | 0.35 – 0.78 | 4 / 21 (19.0%) | 9 / 21 (42.9%) |
| Middle | 20 | 0.04 – 0.34 | 5 / 20 (25.0%) | 8 / 20 (40.0%) |
| Low | 21 | 0 – 0.04 | 4 / 21 (19.0%) | 9 / 21 (42.9%) |

Better signal: **margin** (exact rate high band − low band: margin +9.5 points, weakest confidence +0.0 points).

Each cut-off is the top edge of that signal's low band, over the measured words:

- Margin cut-off: ≤ 0.31: 21 of 62 words (33.9%) at or below it
- Weakest-confidence cut-off: ≤ 0.04: 22 of 62 words (35.5%) at or below it

### Words at or below the margin cut-off (21), for Flash to check

- aisle (Flash's cell 7, main 7, alternative 4, margin 0.08)
- apparatus (Flash's cell 3, main 3, alternative 2, margin 0.07)
- biases (Flash's cell 4, main 6, alternative 4, margin 0.05)
- corpus (Flash's cell 6, main 1, alternative 7, margin 0.27)
- defect (Flash's cell 1, main 4, alternative 3, margin 0.3)
- elastic (Flash's cell 7, main 1, alternative 2, margin 0.28)
- evicted (Flash's cell 1, main 2, alternative 4, margin 0.21)
- fidelity (Flash's cell 1, main 3, alternative 7, margin 0.28)
- flux (Flash's cell 7, main 9, alternative 8, margin 0.24)
- herd (Flash's cell 4, main 6, alternative 3, margin 0.09)
- jerk (Flash's cell 4, main 3, alternative 5, margin 0.01)
- lass (Flash's cell 4, main 4, alternative 6, margin 0.28)
- ornament (Flash's cell 3, main 5, alternative 4, margin 0.13)
- period (Flash's cell 9, main 7, alternative 3, margin 0.05)
- prevalence (Flash's cell 6, main 9, alternative 3, margin 0.18)
- rung (Flash's cell 1, main 5, alternative 7, margin 0.14)
- scalpel (Flash's cell 6, main 4, alternative 8, margin 0.31)
- simmers (Flash's cell 1, main 3, alternative 4, margin 0.22)
- stampede (Flash's cell 1, main 5, alternative 9, margin 0.17)
- steroid (Flash's cell 1, main 1, alternative 7, margin 0.14)
- trait (Flash's cell 1, main 7, alternative 8, margin 0.14)

## Words where the gate removed Flash's cell (6 of 62 measured, 3 of 20 tuning)

The gate (ADR-0032) put Flash's cell out because its caption marked a must-see item hidden.

- literature (Flash's cell 5, gated out 2, 3, 5, 6, 7, 8, 9)
- obtained (Flash's cell 3, gated out 1, 2, 3, 4, 5)
- odd (Flash's cell 1, gated out 1, 2, 3, 4, 5, 6, 8, 9)
- parchment (Flash's cell 1, gated out 1, 2, 3, 4, 5, 6, 8, 9)
- sweep (Flash's cell 2, gated out 1, 2, 3, 5, 6, 7, 8, 9)
- worn (Flash's cell 1, gated out 1, 4, 7, 8)
- inward (tuning) (Flash's cell 2, gated out 2, 3, 6)
- pajamas (tuning) (Flash's cell 5, gated out 1, 2, 3, 4, 5, 6, 8, 9)
- spontaneous (tuning) (Flash's cell 7, gated out 2, 3, 4, 5, 6, 7, 8, 9)

## Partly cut must-see items

Cells with a partly cut must-see item: 297 of 558 (53.2%), over all 9 cells of the 62 judged measured words. A partly cut item doesn't put a cell out; it gets the lowest must-see clarity.

## Words where every cell hid a must-see item (31)

All 9 cells were scored without the gate.

- hypernym (tuning)
- malignancy (tuning)
- pale (tuning)
- polysemy (tuning)
- regional (tuning)
- surgeon (tuning)
- unwinding (tuning)
- wore (tuning)
- bulge
- defect
- devious
- essence
- evicted
- fidelity
- flux
- idiosyncratic
- jerk
- lass
- latch
- legitimate
- merely
- ominous
- period
- pound
- prevalence
- regulation
- simmers
- stampede
- toss
- trait
- trivial

## Per word (measured)

| Word | Flash's cell | Main | Alternative | 3 highest | Gated out | Margin | Weakest confidence | Exact | In three |
|---|---|---|---|---|---|---|---|---|---|
| aisle | 7 | 7 | 4 | 7, 4, 1 | — | 0.08 | 0.34 | yes | yes |
| anomaly | 1 | 1 | 9 | 1, 9, 2 | 4, 6, 8 | 0.44 | 0 | yes | yes |
| apparatus | 3 | 3 | 2 | 3, 2, 7 | 1, 6, 8, 9 | 0.07 | 0.35 | yes | yes |
| biases | 4 | 6 | 4 | 6, 4, 5 | 1, 2, 8, 9 | 0.05 | 0 | no | yes |
| bulge | 1 | 3 | 7 | 3, 5, 9 | all (gate skipped) | 0.35 | 0.67 | no | no |
| concocted | 6 | 1 | 4 | 1, 4, 3 | — | 1.62 | 0 | no | no |
| confound | 1 | 3 | 4 | 3, 4, 1 | — | 1.14 | 0.17 | no | yes |
| contest | 7 | 3 | 8 | 3, 2, 9 | — | 0.58 | 0.71 | no | no |
| corpus | 6 | 1 | 7 | 1, 7, 4 | — | 0.27 | 0 | no | no |
| cottage | 3 | 3 | 6 | 3, 6, 4 | 2, 5, 7, 9 | 1.99 | 0.4 | yes | yes |
| cramped | 1 | 9 | 3 | 9, 3, 8 | — | 1.49 | 0 | no | no |
| defect | 1 | 4 | 3 | 4, 3, 9 | all (gate skipped) | 0.3 | 0.35 | no | no |
| devious | 9 | 6 | 7 | 6, 7, 5 | all (gate skipped) | 0.79 | 0.5 | no | no |
| dose | 1 | 5 | 4 | 5, 4, 1 | 8 | 0.77 | 0.73 | no | yes |
| elastic | 7 | 1 | 2 | 1, 7, 2 | 9 | 0.28 | 0.41 | no | yes |
| engine | 6 | 6 | 5 | 6, 2, 3 | — | 0.56 | 0.08 | yes | yes |
| essence | 1 | 4 | 3 | 4, 3, 8 | all (gate skipped) | 0.37 | 0.34 | no | no |
| evicted | 1 | 2 | 4 | 2, 4, 7 | all (gate skipped) | 0.21 | 0.46 | no | no |
| exotic | 1 | 4 | 1 | 4, 1, 3 | — | 1.25 | 0.37 | no | yes |
| fidelity | 1 | 3 | 7 | 3, 7, 5 | all (gate skipped) | 0.28 | 0 | no | no |
| flustered | 6 | 6 | 9 | 6, 9, 2 | 5 | 1.7 | 0 | yes | yes |
| flux | 7 | 9 | 8 | 9, 8, 2 | all (gate skipped) | 0.24 | 0.16 | no | no |
| herd | 4 | 6 | 3 | 6, 3, 2 | — | 0.09 | 0.78 | no | no |
| idiosyncratic | 5 | 2 | 4 | 2, 4, 7 | all (gate skipped) | 0.93 | 0 | no | no |
| inflate | 1 | 6 | 5 | 6, 5, 4 | 2, 3, 8 | 3 | 0.22 | no | no |
| jerk | 4 | 3 | 5 | 3, 5, 2 | all (gate skipped) | 0.01 | 0 | no | no |
| lass | 4 | 4 | 6 | 4, 2, 7 | all (gate skipped) | 0.28 | 0.34 | yes | yes |
| latch | 5 | 8 | 3 | 8, 3, 1 | all (gate skipped) | 0.53 | 0.43 | no | no |
| legitimate | 7 | 4 | 5 | 4, 5, 7 | all (gate skipped) | 1.63 | 0.04 | no | yes |
| literature | 5 | 4 | 1 | 4, 1 | 2, 3, 5, 6, 7, 8, 9 | 1.34 | 0.19 | no | no |
| merely | 5 | 4 | 5 | 4, 5, 7 | all (gate skipped) | 0.39 | 0.58 | no | yes |
| obtained | 3 | 8 | 7 | 8, 7, 6 | 1, 2, 3, 4, 5 | 3.35 | 0.17 | no | no |
| odd | 1 | 7 | — | 7 | 1, 2, 3, 4, 5, 6, 8, 9 | ∞ (one scored cell) | 0 | no | no |
| ominous | 8 | 2 | 4 | 2, 4, 5 | all (gate skipped) | 0.4 | 0.61 | no | no |
| optimal | 9 | 8 | 2 | 8, 2, 9 | 4, 5, 6, 7 | 0.69 | 0.05 | no | yes |
| ornament | 3 | 5 | 4 | 5, 4, 9 | — | 0.13 | 0.5 | no | no |
| parchment | 1 | 7 | — | 7 | 1, 2, 3, 4, 5, 6, 8, 9 | ∞ (one scored cell) | 0.33 | no | no |
| period | 9 | 7 | 3 | 7, 2, 9 | all (gate skipped) | 0.05 | 0.74 | no | yes |
| plumbing | 5 | 8 | 7 | 8, 7, 5 | — | 2.77 | 0.07 | no | yes |
| pound | 2 | 2 | 3 | 2, 3, 6 | all (gate skipped) | 3.58 | 0.02 | yes | yes |
| prevalence | 6 | 9 | 3 | 9, 3, 6 | all (gate skipped) | 0.18 | 0 | no | yes |
| rationing | 1 | 4 | 1 | 4, 1, 7 | — | 0.41 | 0.03 | no | yes |
| regulation | 1 | 6 | 5 | 6, 5, 8 | all (gate skipped) | 0.51 | 0 | no | no |
| rev | 2 | 2 | 8 | 2, 8, 4 | 5 | 1.47 | 0.13 | yes | yes |
| ridge | 5 | 5 | 1 | 5, 1, 7 | 3 | 3.37 | 0.43 | yes | yes |
| rigged | 7 | 7 | 4 | 7, 4, 9 | — | 3 | 0.61 | yes | yes |
| rung | 1 | 5 | 7 | 5, 7, 2 | 3, 4, 8 | 0.14 | 0.41 | no | no |
| saturation | 7 | 3 | 8 | 3, 8, 6 | — | 1.2 | 0.13 | no | no |
| scalpel | 6 | 4 | 8 | 4, 8, 2 | 3, 7, 9 | 0.31 | 0.31 | no | no |
| simmers | 1 | 3 | 4 | 3, 4, 2 | all (gate skipped) | 0.22 | 0.5 | no | no |
| spilled | 1 | 3 | 1 | 3, 1, 6 | 4, 9 | 0.42 | 0 | no | yes |
| stampede | 1 | 5 | 9 | 5, 4, 6 | all (gate skipped) | 0.17 | 0.35 | no | no |
| steroid | 1 | 1 | 7 | 1, 7, 4 | — | 0.14 | 0.25 | yes | yes |
| strutted | 1 | 1 | 5 | 1, 5, 3 | 2, 4 | 0.49 | 0 | yes | yes |
| sweep | 2 | 4 | — | 4 | 1, 2, 3, 5, 6, 7, 8, 9 | ∞ (one scored cell) | 0.32 | no | no |
| synonym | 2 | 4 | 7 | 4, 7, 8 | 5 | 1.09 | 0.04 | no | no |
| tacit | 8 | 4 | 7 | 4, 2, 7 | 6 | 0.72 | 0.25 | no | no |
| toss | 1 | 6 | 8 | 6, 4, 2 | all (gate skipped) | 0.46 | 0.01 | no | no |
| trait | 1 | 7 | 8 | 7, 8, 2 | all (gate skipped) | 0.14 | 0 | no | no |
| trivial | 7 | 2 | 8 | 2, 8, 6 | all (gate skipped) | 0.6 | 0 | no | no |
| ultimately | 6 | 1 | 8 | 1, 8, 3 | 4, 7, 9 | 0.61 | 0.3 | no | no |
| worn | 1 | 3 | 2 | 3, 2, 5 | 1, 4, 7, 8 | 1.49 | 0 | no | no |

## Unjudged words (0)

None.

## Go / no-go

**No-go** for the must-see image pick. The bar, fixed before the run (ADR-0031): exact ≥ 45% and in-three ≥ 70%, on the measured words.
Measured: exact 21.0%, in three 41.9%, over 62 judged word(s).
