# SP-064 — Does Jev agree with Flash's image pick once it checks the must-see objects and the shot?

Run 2026-10-16. Per word: a must-see list (Claude, text only), a caption per cell and one difference line per cell (Claude, blind to the word, the story and Flash's cell), a gate on hidden must-see items, then one Jev request scoring each remaining cell on plausible, vivid and must-see clarity (`image-rubric.json`). Code adds the weighted scores; the highest total is the main cell (ties: higher plausible, then lower cell).
Tuned on 20 blind-check words (20 judged); measured on 62 other words (59 judged). Rates are over the judged words only.

## Results (measured words)

| | SP-064 | SP-029 (same words) | Chance | Always cell 1 |
|---|---|---|---|---|
| Exact (the main cell is Flash's cell) | 7 / 59 (11.9%) | 13 / 59 (22.0%) | 11% | 23 / 59 (39.0%) |
| In three (Flash's cell is among the 3 highest totals) | 18 / 59 (30.5%) | 31 / 59 (52.5%) | 33% | 29 / 59 (49.2%) |

SP-029 over all its judged words: exact 13 / 82 (15.9%), in three 38 / 82 (46.3%). SP-029's "in three" is Flash's cell among its three row picks.
Chance is 1/9 (exact) and 3/9 (in three). The always-cell-1 rule picks cell 1, and its 3 highest are cells 1, 2 and 3. With fewer than 3 scored cells, in three is over the scored cells only.

## Weights

Weights (tuned on the 20 blind-check words): 3 × plausible + 1 × vivid + 0 × must-see clarity. Start guess: 2 × plausible + 1 × vivid + 1 × must-see clarity. Searched: each weight 0–3; most exact, then most in three, then nearest the start guess.
Tuning: exact 5 / 20 (25.0%), in three 9 / 20 (45.0%).

## Ties

A tie on the total goes to the higher plausible score, then to the lower cell (SP-029's lower-cell tie-break favoured cell 1).

- Picks decided by a tie: 0 of 59 (tuning words: 0 of 20)
- Exact matches whose pick was a tie: 0 of 7

## Main or alternative cell

- Flash's cell is the main cell: 7 of 59 (11.9%)
- Flash's cell is the alternative cell: 4 of 59 (6.8%)
- Main or alternative: 11 of 59 (18.6%)

## Certainty signals

Bands are thirds of the measured words, per signal.

### Margin

The best total minus the second-best (C-036).

| Band | Words | Range | Exact | In three |
|---|---|---|---|---|
| High | 20 | 0.46 – ∞ (one scored cell) | 4 / 20 (20.0%) | 7 / 20 (35.0%) |
| Middle | 19 | 0.26 – 0.46 | 1 / 19 (5.3%) | 5 / 19 (26.3%) |
| Low | 20 | 0.02 – 0.24 | 2 / 20 (10.0%) | 6 / 20 (30.0%) |

### Weakest confidence

The lowest of the main cell's three Jev confidences (C-037).

| Band | Words | Range | Exact | In three |
|---|---|---|---|---|
| High | 20 | 0.59 – 0.9 | 1 / 20 (5.0%) | 4 / 20 (20.0%) |
| Middle | 19 | 0.34 – 0.58 | 4 / 19 (21.1%) | 7 / 19 (36.8%) |
| Low | 20 | 0 – 0.34 | 2 / 20 (10.0%) | 7 / 20 (35.0%) |

Better signal: **margin** (exact rate high band − low band: margin +10.0 points, weakest confidence −5.0 points).

Each cut-off is the top edge of that signal's low band, over the measured words:

- Margin cut-off: ≤ 0.24: 20 of 59 words (33.9%) at or below it
- Weakest-confidence cut-off: ≤ 0.34: 21 of 59 words (35.6%) at or below it

### Words at or below the margin cut-off (20), for Flash to check

- anomaly (Flash's cell 1, main 2, alternative 5, margin 0.1)
- biases (Flash's cell 4, main 4, alternative 5, margin 0.16)
- concocted (Flash's cell 6, main 5, alternative 4, margin 0.03)
- confound (Flash's cell 1, main 3, alternative 1, margin 0.09)
- contest (Flash's cell 7, main 2, alternative 8, margin 0.06)
- defect (Flash's cell 1, main 4, alternative 1, margin 0.24)
- fidelity (Flash's cell 1, main 7, alternative 3, margin 0.07)
- flustered (Flash's cell 6, main 6, alternative 9, margin 0.02)
- flux (Flash's cell 7, main 5, alternative 9, margin 0.11)
- herd (Flash's cell 4, main 6, alternative 2, margin 0.02)
- latch (Flash's cell 5, main 3, alternative 1, margin 0.11)
- legitimate (Flash's cell 7, main 4, alternative 5, margin 0.06)
- merely (Flash's cell 5, main 7, alternative 4, margin 0.18)
- optimal (Flash's cell 9, main 2, alternative 3, margin 0.11)
- prevalence (Flash's cell 6, main 5, alternative 4, margin 0.08)
- regulation (Flash's cell 1, main 5, alternative 2, margin 0.03)
- stampede (Flash's cell 1, main 4, alternative 9, margin 0.02)
- steroid (Flash's cell 1, main 3, alternative 4, margin 0.07)
- tacit (Flash's cell 8, main 5, alternative 2, margin 0.1)
- ultimately (Flash's cell 6, main 3, alternative 6, margin 0.02)

## Words where the gate removed Flash's cell (6 of 59 measured, 3 of 20 tuning)

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

Cells with a partly cut must-see item: 283 of 531 (53.3%), over all 9 cells of the 59 judged measured words. A partly cut item doesn't put a cell out; it gets the lowest must-see clarity.

## Words where every cell hid a must-see item (26)

All 9 cells were scored without the gate.

- hypernym (tuning)
- malignancy (tuning)
- pale (tuning)
- regional (tuning)
- surgeon (tuning)
- unwinding (tuning)
- wore (tuning)
- bulge
- defect
- essence
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
- prevalence
- regulation
- simmers
- stampede
- trait
- trivial

## Per word (measured)

| Word | Flash's cell | Main | Alternative | 3 highest | Gated out | Margin | Weakest confidence | Exact | In three |
|---|---|---|---|---|---|---|---|---|---|
| aisle | 7 | 4 | 5 | 4, 5, 8 | — | 0.44 | 0.19 | no | no |
| anomaly | 1 | 2 | 5 | 2, 5, 7 | 4, 6, 8 | 0.1 | 0.58 | no | no |
| apparatus | 3 | unjudged | — | — | — | — | — | — | — |
| biases | 4 | 4 | 5 | 4, 5, 3 | 1, 2, 8, 9 | 0.16 | 0.49 | yes | yes |
| bulge | 1 | 3 | 7 | 3, 5, 9 | all (gate skipped) | 0.34 | 0.62 | no | no |
| concocted | 6 | 5 | 4 | 5, 4, 3 | — | 0.03 | 0.44 | no | no |
| confound | 1 | 3 | 1 | 3, 1, 9 | — | 0.09 | 0.08 | no | yes |
| contest | 7 | 2 | 8 | 2, 3, 9 | — | 0.06 | 0.55 | no | no |
| corpus | 6 | 3 | 7 | 3, 7, 4 | — | 0.56 | 0.76 | no | no |
| cottage | 3 | 3 | 1 | 3, 1, 4 | 2, 5, 7, 9 | 0.49 | 0.44 | yes | yes |
| cramped | 1 | unjudged | — | — | — | — | — | — | — |
| defect | 1 | 4 | 1 | 4, 1, 2 | all (gate skipped) | 0.24 | 0.32 | no | yes |
| devious | 9 | 6 | 3 | 6, 3, 7 | 2, 4 | 0.97 | 0.61 | no | no |
| dose | 1 | 5 | 4 | 5, 4, 1 | 8 | 0.61 | 0.7 | no | yes |
| elastic | 7 | 2 | 3 | 2, 3, 5 | 9 | 0.36 | 0.32 | no | no |
| engine | 6 | 2 | 5 | 2, 3, 4 | — | 0.32 | 0.58 | no | no |
| essence | 1 | 4 | 3 | 4, 3, 1 | all (gate skipped) | 0.44 | 0.31 | no | yes |
| evicted | 1 | 4 | 1 | 4, 1 | 2, 3, 5, 6, 7, 8, 9 | 1.36 | 0.27 | no | yes |
| exotic | 1 | 4 | 2 | 4, 2, 6 | — | 0.32 | 0.39 | no | no |
| fidelity | 1 | 7 | 3 | 7, 3, 5 | all (gate skipped) | 0.07 | 0.34 | no | no |
| flustered | 6 | 6 | 9 | 6, 9, 2 | 5 | 0.02 | 0 | yes | yes |
| flux | 7 | 5 | 9 | 5, 9, 2 | all (gate skipped) | 0.11 | 0.37 | no | no |
| herd | 4 | 6 | 2 | 6, 2, 3 | — | 0.02 | 0.76 | no | no |
| idiosyncratic | 5 | 3 | 2 | 3, 2, 8 | all (gate skipped) | 0.26 | 0.3 | no | no |
| inflate | 1 | 5 | 4 | 5, 4, 6 | 2, 3, 8 | 0.39 | 0.64 | no | no |
| jerk | 4 | 5 | 3 | 5, 3, 6 | all (gate skipped) | 0.42 | 0 | no | no |
| lass | 4 | 4 | 6 | 4, 3, 8 | all (gate skipped) | 0.79 | 0.4 | yes | yes |
| latch | 5 | 3 | 1 | 3, 1, 8 | all (gate skipped) | 0.11 | 0.67 | no | no |
| legitimate | 7 | 4 | 5 | 4, 5, 2 | all (gate skipped) | 0.06 | 0.2 | no | no |
| literature | 5 | 4 | 1 | 4, 1 | 2, 3, 5, 6, 7, 8, 9 | 1.08 | 0 | no | no |
| merely | 5 | 7 | 4 | 7, 4, 6 | all (gate skipped) | 0.18 | 0.85 | no | no |
| obtained | 3 | 7 | 8 | 7, 8, 6 | 1, 2, 3, 4, 5 | 0.61 | 0.64 | no | no |
| odd | 1 | 7 | — | 7 | 1, 2, 3, 4, 5, 6, 8, 9 | ∞ (one scored cell) | 0 | no | no |
| ominous | 8 | 2 | 4 | 2, 4, 5 | all (gate skipped) | 0.46 | 0.61 | no | no |
| optimal | 9 | 2 | 3 | 2, 3, 9 | 4, 5, 6, 7 | 0.11 | 0.62 | no | yes |
| ornament | 3 | 5 | 4 | 5, 4, 3 | — | 0.26 | 0.49 | no | yes |
| parchment | 1 | 7 | — | 7 | 1, 2, 3, 4, 5, 6, 8, 9 | ∞ (one scored cell) | 0.29 | no | no |
| period | 9 | 2 | 3 | 2, 7, 9 | all (gate skipped) | 0.33 | 0.39 | no | yes |
| plumbing | 5 | 5 | 8 | 5, 8, 7 | — | 0.46 | 0.74 | yes | yes |
| pound | 2 | unjudged | — | — | — | — | — | — | — |
| prevalence | 6 | 5 | 4 | 5, 4, 2 | all (gate skipped) | 0.08 | 0.71 | no | no |
| rationing | 1 | 4 | 2 | 4, 2, 1 | — | 0.52 | 0 | no | yes |
| regulation | 1 | 5 | 2 | 5, 2, 4 | all (gate skipped) | 0.03 | 0.56 | no | no |
| rev | 2 | 2 | 8 | 2, 8, 4 | 5 | 0.37 | 0.04 | yes | yes |
| ridge | 5 | 5 | 6 | 5, 6, 7 | 3 | 0.69 | 0.37 | yes | yes |
| rigged | 7 | 4 | 9 | 4, 9, 5 | — | 0.37 | 0.59 | no | no |
| rung | 1 | 5 | 7 | 5, 7, 2 | 3, 4, 8 | 0.55 | 0.43 | no | no |
| saturation | 7 | 3 | 2 | 3, 2, 9 | — | 0.33 | 0.14 | no | no |
| scalpel | 6 | 2 | 4 | 2, 4, 8 | 3, 7, 9 | 0.38 | 0.76 | no | no |
| simmers | 1 | 4 | 3 | 4, 3, 6 | all (gate skipped) | 0.47 | 0.55 | no | no |
| spilled | 1 | 2 | 5 | 2, 7, 1 | 4, 9 | 0.42 | 0.78 | no | yes |
| stampede | 1 | 4 | 9 | 4, 6, 3 | all (gate skipped) | 0.02 | 0.28 | no | no |
| steroid | 1 | 3 | 4 | 3, 4, 5 | — | 0.07 | 0.9 | no | no |
| strutted | 1 | 6 | 3 | 6, 3, 8 | 2, 4 | 0.47 | 0.67 | no | no |
| sweep | 2 | 4 | — | 4 | 1, 2, 3, 5, 6, 7, 8, 9 | ∞ (one scored cell) | 0.37 | no | no |
| synonym | 2 | 4 | 7 | 4, 7, 8 | 5 | 0.34 | 0.34 | no | no |
| tacit | 8 | 5 | 2 | 5, 2, 7 | 6 | 0.1 | 0.59 | no | no |
| toss | 1 | 4 | 8 | 4, 3, 5 | 2, 6, 9 | 0.9 | 0.39 | no | no |
| trait | 1 | 2 | 4 | 2, 4, 9 | all (gate skipped) | 0.53 | 0.66 | no | no |
| trivial | 7 | 3 | 2 | 3, 2, 4 | all (gate skipped) | 0.26 | 0.25 | no | no |
| ultimately | 6 | 3 | 6 | 3, 6, 1 | 4, 7, 9 | 0.02 | 0.35 | no | yes |
| worn | 1 | 2 | 3 | 2, 3, 5 | 1, 4, 7, 8 | 0.68 | 0.22 | no | no |

## Unjudged words (3)

- apparatus: Jev could not be reached: fetch failed (80DD93F801000000:error:0A000119:SSL routines:tls_get_more_records:decryption failed or bad record mac:ssl/record/methods/tls_common.c:874:
)
- cramped: grid differences failed: unusable grid differences: not 9 lines
- pound: grid differences failed: unusable grid differences: an empty line

## Go / no-go

**No-go** for the must-see image pick. The bar, fixed before the run (ADR-0031): exact ≥ 45% and in-three ≥ 70%, on the measured words.
Measured: exact 11.9%, in three 30.5%, over 59 judged word(s).
