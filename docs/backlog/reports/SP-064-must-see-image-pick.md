# SP-064 — Does Jev agree with Flash's image pick once it checks the must-see objects and the shot?

Run 2026-10-16. Per word: a must-see list (Claude, text only), a caption per cell and one difference line per cell (Claude, blind to the word, the story and Flash's cell), a gate on hidden must-see items, then one Jev request scoring each remaining cell on plausible, vivid and must-see clarity (`image-rubric.json`). Code adds the weighted scores; the highest total is the main cell (ties: higher plausible, then lower cell).
Tuned on 20 blind-check words (17 judged); measured on 62 other words (53 judged). Rates are over the judged words only.

## Results (measured words)

| | SP-064 | SP-029 (same words) | Chance | Always cell 1 |
|---|---|---|---|---|
| Exact (the main cell is Flash's cell) | 7 / 53 (13.2%) | 11 / 53 (20.8%) | 11% | 20 / 53 (37.7%) |
| In three (Flash's cell is among the 3 highest totals) | 17 / 53 (32.1%) | 27 / 53 (50.9%) | 33% | 26 / 53 (49.1%) |

SP-029 over all its judged words: exact 13 / 82 (15.9%), in three 38 / 82 (46.3%). SP-029's "in three" is Flash's cell among its three row picks.
Chance is 1/9 (exact) and 3/9 (in three). The always-cell-1 rule picks cell 1, and its 3 highest are cells 1, 2 and 3. With fewer than 3 scored cells, in three is over the scored cells only.

## Weights

Weights (tuned on the 20 blind-check words): 3 × plausible + 1 × vivid + 0 × must-see clarity. Start guess: 2 × plausible + 1 × vivid + 1 × must-see clarity. Searched: each weight 0–3; most exact, then most in three, then nearest the start guess.
Tuning: exact 5 / 17 (29.4%), in three 8 / 17 (47.1%).

## Ties

A tie on the total goes to the higher plausible score, then to the lower cell (SP-029's lower-cell tie-break favoured cell 1).

- Picks decided by a tie: 0 of 53 (tuning words: 0 of 17)
- Exact matches whose pick was a tie: 0 of 7

## Main or alternative cell

- Flash's cell is the main cell: 7 of 53 (13.2%)
- Flash's cell is the alternative cell: 2 of 53 (3.8%)
- Main or alternative: 9 of 53 (17.0%)

## Certainty signals

Bands are thirds of the measured words, per signal.

### Margin

The best total minus the second-best (C-036).

| Band | Words | Range | Exact | In three |
|---|---|---|---|---|
| High | 18 | 0.48 – ∞ (one scored cell) | 3 / 18 (16.7%) | 5 / 18 (27.8%) |
| Middle | 17 | 0.24 – 0.48 | 2 / 17 (11.8%) | 4 / 17 (23.5%) |
| Low | 18 | 0.02 – 0.23 | 2 / 18 (11.1%) | 8 / 18 (44.4%) |

### Weakest confidence

The lowest of the main cell's three Jev confidences (C-037).

| Band | Words | Range | Exact | In three |
|---|---|---|---|---|
| High | 18 | 0.59 – 0.9 | 1 / 18 (5.6%) | 4 / 18 (22.2%) |
| Middle | 17 | 0.32 – 0.59 | 3 / 17 (17.6%) | 8 / 17 (47.1%) |
| Low | 18 | 0 – 0.31 | 3 / 18 (16.7%) | 5 / 18 (27.8%) |

Better signal: **margin** (exact rate high band − low band: margin +5.6 points, weakest confidence −11.1 points).

Each cut-off is the top edge of that signal's low band, over the measured words:

- Margin cut-off: ≤ 0.23: 18 of 53 words (34.0%) at or below it
- Weakest-confidence cut-off: ≤ 0.31: 18 of 53 words (34.0%) at or below it

### Words at or below the margin cut-off (18), for Flash to check

- anomaly (Flash's cell 1, main 2, alternative 5, margin 0.21)
- biases (Flash's cell 4, main 4, alternative 5, margin 0.16)
- confound (Flash's cell 1, main 4, alternative 3, margin 0.07)
- contest (Flash's cell 7, main 3, alternative 5, margin 0.05)
- defect (Flash's cell 1, main 4, alternative 1, margin 0.2)
- exotic (Flash's cell 1, main 4, alternative 2, margin 0.23)
- fidelity (Flash's cell 1, main 7, alternative 3, margin 0.15)
- flustered (Flash's cell 6, main 6, alternative 9, margin 0.23)
- herd (Flash's cell 4, main 6, alternative 2, margin 0.05)
- legitimate (Flash's cell 7, main 4, alternative 5, margin 0.17)
- merely (Flash's cell 5, main 7, alternative 4, margin 0.18)
- optimal (Flash's cell 9, main 2, alternative 3, margin 0.12)
- ornament (Flash's cell 3, main 5, alternative 4, margin 0.19)
- pound (Flash's cell 2, main 6, alternative 3, margin 0.09)
- stampede (Flash's cell 1, main 4, alternative 9, margin 0.02)
- steroid (Flash's cell 1, main 3, alternative 4, margin 0.2)
- tacit (Flash's cell 8, main 5, alternative 2, margin 0.03)
- ultimately (Flash's cell 6, main 3, alternative 6, margin 0.13)

## Words where the gate removed Flash's cell (5 of 53 measured, 2 of 17 tuning)

The gate (ADR-0032) put Flash's cell out because its caption marked a must-see item hidden.

- literature (Flash's cell 5, gated out 2, 3, 5, 6, 7, 8, 9)
- obtained (Flash's cell 3, gated out 1, 2, 3, 4, 5)
- odd (Flash's cell 1, gated out 1, 2, 3, 4, 5, 6, 8, 9)
- parchment (Flash's cell 1, gated out 1, 2, 3, 4, 5, 6, 8, 9)
- sweep (Flash's cell 2, gated out 1, 2, 3, 5, 6, 7, 8, 9)
- inward (tuning) (Flash's cell 2, gated out 2, 3, 6)
- spontaneous (tuning) (Flash's cell 7, gated out 2, 3, 4, 5, 6, 7, 8, 9)

## Partly cut must-see items

Cells with a partly cut must-see item: 267 of 477 (56.0%), over all 9 cells of the 53 judged measured words. A partly cut item doesn't put a cell out; it gets the lowest must-see clarity.

## Words where every cell hid a must-see item (22)

All 9 cells were scored without the gate.

- hypernym (tuning)
- malignancy (tuning)
- pale (tuning)
- unwinding (tuning)
- wore (tuning)
- bulge
- defect
- essence
- evicted
- fidelity
- idiosyncratic
- jerk
- lass
- latch
- legitimate
- merely
- ominous
- period
- pound
- simmers
- stampede
- trivial

## Per word (measured)

| Word | Flash's cell | Main | Alternative | 3 highest | Gated out | Margin | Weakest confidence | Exact | In three |
|---|---|---|---|---|---|---|---|---|---|
| aisle | 7 | 4 | 5 | 4, 5, 8 | — | 0.44 | 0.17 | no | no |
| anomaly | 1 | 2 | 5 | 2, 5, 7 | 4, 6, 8 | 0.21 | 0.62 | no | no |
| apparatus | 3 | 3 | 2 | 3, 2, 7 | 1, 6, 8, 9 | 0.35 | 0.31 | yes | yes |
| biases | 4 | 4 | 5 | 4, 5, 3 | 1, 2, 8, 9 | 0.16 | 0.37 | yes | yes |
| bulge | 1 | 5 | 7 | 5, 4, 6 | all (gate skipped) | 0.71 | 0.03 | no | no |
| concocted | 6 | unjudged | — | — | — | — | — | — | — |
| confound | 1 | 4 | 3 | 4, 3, 1 | — | 0.07 | 0.31 | no | yes |
| contest | 7 | 3 | 5 | 3, 2, 9 | — | 0.05 | 0.69 | no | no |
| corpus | 6 | 3 | 7 | 3, 7, 4 | — | 0.55 | 0.79 | no | no |
| cottage | 3 | unjudged | — | — | — | — | — | — | — |
| cramped | 1 | 3 | 8 | 3, 8, 5 | — | 0.4 | 0.61 | no | no |
| defect | 1 | 4 | 1 | 4, 1, 2 | all (gate skipped) | 0.2 | 0.32 | no | yes |
| devious | 9 | 6 | 3 | 6, 3, 7 | 2, 4 | 0.93 | 0.61 | no | no |
| dose | 1 | 5 | 4 | 5, 4, 1 | 8 | 0.58 | 0.71 | no | yes |
| elastic | 7 | 2 | 3 | 2, 3, 5 | 9 | 0.35 | 0.3 | no | no |
| engine | 6 | 2 | 5 | 2, 3, 4 | — | 0.35 | 0.53 | no | no |
| essence | 1 | 4 | 3 | 4, 3, 1 | all (gate skipped) | 0.29 | 0.31 | no | yes |
| evicted | 1 | 4 | 2 | 4, 2, 5 | all (gate skipped) | 0.65 | 0.3 | no | no |
| exotic | 1 | 4 | 2 | 4, 2, 6 | — | 0.23 | 0.35 | no | no |
| fidelity | 1 | 7 | 3 | 7, 3, 5 | all (gate skipped) | 0.15 | 0.13 | no | no |
| flustered | 6 | 6 | 9 | 6, 9, 2 | 5 | 0.23 | 0 | yes | yes |
| flux | 7 | unjudged | — | — | — | — | — | — | — |
| herd | 4 | 6 | 2 | 6, 2, 3 | — | 0.05 | 0.78 | no | no |
| idiosyncratic | 5 | 3 | 2 | 3, 2, 8 | all (gate skipped) | 0.34 | 0.39 | no | no |
| inflate | 1 | 5 | 4 | 5, 4, 6 | 2, 3, 8 | 0.48 | 0.56 | no | no |
| jerk | 4 | 5 | 3 | 5, 3, 6 | all (gate skipped) | 0.64 | 0.11 | no | no |
| lass | 4 | 4 | 6 | 4, 3, 8 | all (gate skipped) | 0.62 | 0.41 | yes | yes |
| latch | 5 | 3 | 8 | 3, 8, 1 | all (gate skipped) | 0.24 | 0.69 | no | no |
| legitimate | 7 | 4 | 5 | 4, 5, 2 | all (gate skipped) | 0.17 | 0 | no | no |
| literature | 5 | 4 | 1 | 4, 1 | 2, 3, 5, 6, 7, 8, 9 | 1.08 | 0.16 | no | no |
| merely | 5 | 7 | 4 | 7, 4, 6 | all (gate skipped) | 0.18 | 0.83 | no | no |
| obtained | 3 | 7 | 8 | 7, 8, 6 | 1, 2, 3, 4, 5 | 0.65 | 0.64 | no | no |
| odd | 1 | 7 | — | 7 | 1, 2, 3, 4, 5, 6, 8, 9 | ∞ (one scored cell) | 0 | no | no |
| ominous | 8 | 2 | 4 | 2, 4, 5 | all (gate skipped) | 0.45 | 0.62 | no | no |
| optimal | 9 | 2 | 3 | 2, 3, 9 | 4, 5, 6, 7 | 0.12 | 0.67 | no | yes |
| ornament | 3 | 5 | 4 | 5, 4, 3 | — | 0.19 | 0.47 | no | yes |
| parchment | 1 | 7 | — | 7 | 1, 2, 3, 4, 5, 6, 8, 9 | ∞ (one scored cell) | 0.27 | no | no |
| period | 9 | 2 | 3 | 2, 7, 9 | all (gate skipped) | 0.29 | 0.41 | no | yes |
| plumbing | 5 | 5 | 8 | 5, 8, 7 | — | 0.59 | 0.73 | yes | yes |
| pound | 2 | 6 | 3 | 6, 3, 2 | all (gate skipped) | 0.09 | 0.34 | no | yes |
| prevalence | 6 | unjudged | — | — | — | — | — | — | — |
| rationing | 1 | unjudged | — | — | — | — | — | — | — |
| regulation | 1 | unjudged | — | — | — | — | — | — | — |
| rev | 2 | 2 | 4 | 2, 4, 8 | 5 | 0.43 | 0.05 | yes | yes |
| ridge | 5 | 5 | 6 | 5, 6, 7 | 3 | 0.55 | 0.38 | yes | yes |
| rigged | 7 | 4 | 9 | 4, 9, 3 | — | 0.36 | 0.59 | no | no |
| rung | 1 | 5 | 7 | 5, 7, 2 | 3, 4, 8 | 0.47 | 0.37 | no | no |
| saturation | 7 | 3 | 9 | 3, 9, 2 | — | 0.3 | 0.14 | no | no |
| scalpel | 6 | 2 | 4 | 2, 4, 8 | 3, 7, 9 | 0.38 | 0.76 | no | no |
| simmers | 1 | 4 | 3 | 4, 3, 6 | all (gate skipped) | 0.41 | 0.5 | no | no |
| spilled | 1 | 7 | 5 | 7, 1, 5 | 4, 9 | 0.65 | 0.73 | no | yes |
| stampede | 1 | 4 | 9 | 4, 6, 3 | all (gate skipped) | 0.02 | 0.25 | no | no |
| steroid | 1 | 3 | 4 | 3, 4, 5 | — | 0.2 | 0.9 | no | no |
| strutted | 1 | 6 | 3 | 6, 3, 5 | 2, 4 | 0.58 | 0.67 | no | no |
| sweep | 2 | 4 | — | 4 | 1, 2, 3, 5, 6, 7, 8, 9 | ∞ (one scored cell) | 0.35 | no | no |
| synonym | 2 | unjudged | — | — | — | — | — | — | — |
| tacit | 8 | 5 | 2 | 5, 2, 7 | 6 | 0.03 | 0.59 | no | no |
| toss | 1 | 4 | 8 | 4, 3, 5 | 2, 6, 9 | 0.93 | 0.43 | no | no |
| trait | 1 | unjudged | — | — | — | — | — | — | — |
| trivial | 7 | 3 | 2 | 3, 2, 4 | all (gate skipped) | 0.48 | 0.3 | no | no |
| ultimately | 6 | 3 | 6 | 3, 6, 1 | 4, 7, 9 | 0.13 | 0.37 | no | yes |
| worn | 1 | unjudged | — | — | — | — | — | — | — |

## Unjudged words (12)

- concocted: grid differences failed: unusable grid differences: not 9 lines
- corncob (tuning): grid differences failed: unusable claude answer (bad JSON: Unexpected non-whitespace character after JSON at position 1565 (line 3 column 1)): {"lines":["Medium-wide eye-level shot of two campers by the fire, with a roasted cob held on a stick and another cob mid
- cottage: grid differences failed: unusable claude answer (bad JSON: Unexpected non-whitespace character after JSON at position 1389 (line 3 column 1)): {"lines":["Low rear three-quarter shot of both hikers climbing the grassy slope in the rain toward the house on the righ
- flux: grid differences failed: unusable claude answer (bad JSON: Unexpected non-whitespace character after JSON at position 1561 (line 3 column 1)): {"lines":["Wide eye-level shot of the whole scene: woman on the left tossing crumbs, two ducks flying overhead, ducks fe
- pajamas (tuning): grid differences failed: unusable grid differences: not 9 lines
- prevalence: grid differences failed: unusable grid differences: not 9 lines
- rationing: grid differences failed: unusable grid differences: not 9 lines
- regional (tuning): grid differences failed: unusable grid differences: not 9 lines
- regulation: grid differences failed: unusable grid differences: not 9 lines
- synonym: grid differences failed: unusable grid differences: not 9 lines
- trait: grid differences failed: unusable grid differences: not 9 lines
- worn: grid differences failed: unusable grid differences: not 9 lines

## Go / no-go

**No-go** for the must-see image pick. The bar, fixed before the run (ADR-0031): exact ≥ 45% and in-three ≥ 70%, on the measured words.
Measured: exact 13.2%, in three 32.1%, over 53 judged word(s).
