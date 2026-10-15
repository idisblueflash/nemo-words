# SP-029 — Does an auto image pick agree with Flash's picks?

Run 2026-10-15. Flash's cell is found again by a pixel match between each grid and its final crop.
Each cell is captioned alone by `claude -p`; Jev then picks one cell per grid row and the best of those three (`judge-image`).
Judged: 82 of 82 kept words. Rates are over the judged words only.

## Results

| | Jev | Chance | Always cell 1 |
|---|---|---|---|
| Exact (Jev's final cell = Flash's cell) | 13 / 82 (15.9%) | 11% | 28 / 82 (34.1%) |
| In three (Flash's cell is one of Jev's row picks) | 38 / 82 (46.3%) | 33% | 45 / 82 (54.9%) |

Chance is 1/9 (exact) and 3/9 (in three). The always-cell-1 rule's "row picks" are cells 1, 4 and 7, the first cell of each row.

## Ties

A pick is the highest p; a tie goes to the lower cell number, which leans toward cell 1.

- Row picks decided by a tie: 4 of 246
- Final picks decided by a tie: 0 of 82
- Exact matches whose final pick was a tie: 0 of 13

## Cells

- Flash's cell: 1→28, 2→6, 3→4, 4→6, 5→8, 6→9, 7→11, 8→3, 9→7
- Jev's cell: 1→28, 2→7, 3→4, 4→4, 5→10, 6→8, 7→7, 8→6, 9→8

## Per word

| Word | Grid | Flash's cell | Jev's row picks | Jev's cell | Exact | In three |
|---|---|---|---|---|---|---|
| aisle | aisle.grid.png | 7 | 1, 4, 7 | 1 | no | yes |
| anomaly | anomaly.grid.png | 1 | 1, 6, 7 | 1 | yes | yes |
| apparatus | apparatus.grid-2.png | 3 | 1, 6, 8 | 6 | no | no |
| appeal | appeal.grid.png | 9 | 1, 6, 8 (tie) | 8 | no | no |
| biases | biases.grid.png | 4 | 3, 6, 8 | 6 | no | no |
| bulge | bulge.grid.png | 1 | 1, 4, 8 | 1 | yes | yes |
| cocked | cocked.grid.png | 7 | 1, 5, 7 (tie) | 1 | no | yes |
| concocted | concocted.grid.png | 6 | 1, 5, 8 | 5 | no | no |
| confound | confound.grid.png | 1 | 1, 5, 7 | 5 | no | yes |
| contest | contest.grid.png | 7 | 1, 6, 7 | 7 | yes | yes |
| corncob | corncob.grid.png | 9 | 2, 5, 9 | 2 | no | yes |
| corpus | corpus.grid.png | 6 | 3, 4, 9 | 9 | no | no |
| cottage | cottage.grid.png | 3 | 1, 5, 8 | 5 | no | no |
| cramped | cramped.grid.png | 1 | 3, 5, 9 | 9 | no | no |
| defect | defect.grid.png | 1 | 1, 5, 8 | 8 | no | yes |
| devious | devious.grid.png | 9 | 1, 6, 9 | 1 | no | yes |
| dose | dose.grid.png | 1 | 1, 6, 7 | 6 | no | yes |
| elastic | elastic.grid.png | 7 | 1, 5, 7 | 1 | no | yes |
| engine | engine.grid-2.png | 6 | 3, 4, 7 | 3 | no | no |
| essence | essence.grid.png | 1 | 1, 4, 8 | 8 | no | yes |
| evicted | evicted.grid.png | 1 | 1, 4, 7 | 1 | yes | yes |
| exotic | exotic.grid.png | 1 | 2, 6, 9 | 9 | no | no |
| fidelity | fidelity.grid.png | 1 | 1, 4, 7 | 1 | yes | yes |
| flustered | flustered.grid.png | 6 | 2, 6, 7 | 7 | no | yes |
| flux | flux.grid.png | 7 | 1, 5, 7 | 5 | no | yes |
| herd | herd.grid.png | 4 | 1, 4, 8 | 8 | no | yes |
| hypernym | hypernym.grid.png | 1 | 3, 6, 7 | 6 | no | no |
| idiosyncratic | idiosyncratic.grid.png | 5 | 1, 6, 8 | 1 | no | no |
| inflate | inflate.grid.png | 1 | 2, 4, 8 | 2 | no | no |
| intervention | intervention.grid.png | 1 | 1, 6, 9 | 9 | no | yes |
| inward | inward.grid-2.png | 2 | 3, 4, 9 | 4 | no | no |
| jerk | jerk.grid.png | 4 | 1, 4, 7 | 7 | no | yes |
| lass | lass.grid.png | 4 | 3, 5, 8 | 5 | no | no |
| latch | latch.grid.png | 5 | 1, 6, 7 | 6 | no | no |
| legitimate | legitimate.grid.png | 7 | 3, 6, 9 | 3 | no | no |
| literature | literature.grid-2.png | 5 | 1, 6, 7 | 1 | no | no |
| malignancy | malignancy.grid.png | 7 | 2, 6, 9 | 9 | no | no |
| merely | merely.grid.png | 5 | 1, 4, 8 | 8 | no | no |
| obtained | obtained.grid.png | 3 | 3, 6, 7 | 6 | no | yes |
| odd | odd.grid.png | 1 | 2, 6, 8 | 2 | no | no |
| ominous | ominous.grid.png | 8 | 1, 4, 8 | 1 | no | yes |
| optimal | optimal.grid.png | 9 | 2, 4, 9 | 9 | yes | yes |
| ornament | ornament.grid.png | 3 | 2, 4, 7 | 2 | no | no |
| overreach | overreach.grid.png | 1 | 2, 5, 7 | 7 | no | no |
| pajamas | pajamas.grid.png | 5 | 1, 5, 8 | 1 | no | yes |
| pale | pale.grid.png | 2 | 1, 5, 7 | 1 | no | no |
| parchment | parchment.grid.png | 1 | 3, 4, 7 | 4 | no | no |
| peculiar | peculiar.grid.png | 4 | 1, 6, 9 | 1 | no | no |
| period | period.grid.png | 9 | 3, 6, 7 | 3 | no | no |
| plumbing | plumbing.grid.png | 5 | 1, 6, 9 | 1 | no | no |
| polysemy | polysemy.grid.png | 5 | 1, 6, 7 | 6 | no | no |
| pound | pound.grid.png | 2 | 1, 6, 7 | 1 | no | no |
| prevalence | prevalence.grid.png | 6 | 1, 4, 7 | 1 | no | no |
| rationing | rationing.grid.png | 1 | 1, 4, 8 | 1 | yes | yes |
| regional | regional.grid-2.png | 4 | 1, 4, 7 (tie) | 1 | no | yes |
| regulation | regulation.grid.png | 1 | 1, 4, 9 | 9 | no | yes |
| rev | rev.grid.png | 2 | 1, 5, 9 | 1 | no | no |
| ridge | ridge.grid.png | 5 | 3, 5, 9 | 5 | yes | yes |
| rigged | rigged.grid-2.png | 7 | 3, 5, 8 | 5 | no | no |
| rung | rung.grid.png | 1 | 2, 4, 9 | 2 | no | no |
| saturation | saturation.grid.png | 7 | 3, 4, 8 | 3 | no | no |
| scalpel | scalpel.grid.png | 6 | 1, 4, 8 | 4 | no | no |
| shattered | shattered.grid.png | 9 | 3, 5, 7 | 5 | no | no |
| simmers | simmers.grid.png | 1 | 1, 5, 7 | 5 | no | yes |
| snubbing | snubbing.grid.png | 6 | 1, 6, 8 | 1 | no | yes |
| spilled | spilled.grid-2.png | 1 | 1, 6, 9 | 1 | yes | yes |
| spontaneous | spontaneous.grid.png | 7 | 1, 4, 8 | 1 | no | no |
| stampede | stampede.grid.png | 1 | 1, 6, 7 | 6 | no | yes |
| steroid | steroid.grid-2.png | 1 | 1, 4, 7 | 7 | no | yes |
| strutted | strutted.grid.png | 1 | 1, 5, 8 | 1 | yes | yes |
| surgeon | surgeon.grid.png | 1 | 2, 4, 7 | 7 | no | no |
| sweep | sweep.grid.png | 2 | 1, 5, 9 (tie) | 5 | no | no |
| synonym | synonym.grid.png | 2 | 1, 4, 7 | 1 | no | no |
| tacit | tacit.grid.png | 8 | 2, 4, 9 | 4 | no | no |
| toss | toss.grid.png | 1 | 1, 5, 9 | 1 | yes | yes |
| trait | trait.grid.png | 1 | 1, 6, 8 | 1 | yes | yes |
| trivial | trivial.grid.png | 7 | 1, 6, 7 | 7 | yes | yes |
| ultimately | ultimately.grid.png | 6 | 1, 6, 8 | 8 | no | yes |
| unwinding | unwinding.grid.png | 6 | 2, 4, 9 | 9 | no | no |
| ventilator | ventilator.grid.png | 8 | 2, 5, 8 | 2 | no | yes |
| wore | wore.grid.png | 9 | 1, 4, 7 | 1 | no | no |
| worn | worn.grid.png | 1 | 2, 5, 7 | 2 | no | no |

## Unjudged words

None.

## Grids left out (39)

- -cy.grid.png: word-part card
- -ence.grid.png: word-part card
- -esce.grid.png: word-part card
- -gen-.grid-2.png: word-part card
- -gen-.grid.png: word-part card
- -glob-.grid.png: word-part card
- -ion.grid.png: word-part card
- -meter.grid.png: word-part card
- -tomy.grid.png: word-part card
- apparatus.grid.png: another grid of apparatus matched its crop
- coaster.grid.png: no single crop coaster.png
- con-.grid.png: word-part card
- creak.grid.png: no single crop creak.png
- crest.grid.png: no single crop crest.png
- devastating.grid.png: no single crop devastating.png
- engine.grid.png: another grid of engine matched its crop
- faint.grid.png: no single crop faint.png
- faint.scenes.grid.png: no single crop faint.png
- fus-.grid.png: word-part card
- intra-.grid.png: word-part card
- ladles.grid.png: no single crop ladles.png
- ladles.noodles.grid.png: no single crop ladles.png
- literature.grid.png: another grid of literature matched its crop
- malignancy.grid-2.png: another grid of malignancy matched its crop
- manu-.grid.png: word-part card
- para-.grid.png: word-part card
- per-.grid.png: word-part card
- pre-.grid.png: word-part card
- rattles.grid.png: no single crop rattles.png
- rigged.grid.png: another grid of rigged matched its crop
- ruffled.before.grid.png: no single crop ruffled.png
- ruffled.grid.png: no single crop ruffled.png
- spilled.grid.png: another grid of spilled matched its crop
- stray.grid.png: no single crop stray.png
- tax-.grid.png: word-part card
- trans-.grid.png: word-part card
- ultimately.v2.grid.png: another grid of ultimately matched its crop
- val-.grid.png: word-part card
- weathered.grid.png: no single crop weathered.png

## Blind check

20 words where Jev's cell wasn't Flash's. Flash sees both cells side by side, unlabelled, his own on the left for half the words, and chooses one or rates them about the same.

Not finished: 0 of 20 answered. The share is shown once every word is answered.

## Go / no-go

**No-go** for auto image pick. The bar, fixed before the run (ADR-0027): exact ≥ 45% and in-three ≥ 70%.
Measured: exact 15.9%, in three 46.3%, over 82 judged word(s).
