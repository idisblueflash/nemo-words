---
id: SP-070
type: spike
parent: E01
status: in-progress
timebox: 1d
concepts: [C-034, C-050]
---
# SP-070 Does a must-see mark that asks about the action catch the cells that cut off the action?

**Why now:** SP-069 found that the must-see mark is the caption part with the biggest gap between the 8B model and Sonnet (2.03 against 2.72). Of the 478 items that both models marked, they disagree on 171 marks, but on only 10 marks when `partly cut` counts as `visible`. Flash says that an edge that cuts an item seldom changes his pick. A cached test on the SP-066 scores agrees: without the completeness part, exact + in-three changes by 2 or less, which is noise. But anomaly cell 4 shows a case that matters: the cell shows only the family's feet, so it cuts off what the people do. Sonnet marked the family `partly cut`, and the 8B model marked it `visible`.

The spike replaces the 3 values of the mark (`visible` / `partly cut` / `hidden`) with 3 values that ask about the action:

- `visible`: the cell shows the item, and it shows the part that does the story's action (for a person: the body, hands or face).
- `part only`: the cell shows the item, but not the part that acts (feet only, a hand with no person, the back of a head in a crowd).
- `hidden`: the cell does not show the item.

The completeness part of must-see clarity then scores `part only`, not edge cuts. Only the mark changes; size and place stay as they are.

## Done when
- **Gold set.** Sonnet's new marks against Flash's gold marks (`spikes/sp-070/gold/gold.json`, frozen in commit 0e65e80: 304 items in 114 cells; the 3 `not sure` items are left out, so 301). The report gives the overall match, the `part only` and `hidden` matches, the false `part only` marks, and anomaly cell 4's family. The bar: overall ≥ 90% (271 of 301), `part only` ≥ 9 of 12 with anomaly cell 4's family among them, `hidden` ≥ 18 of 22, and no more than 10 of the 267 `visible` items marked `part only`.
- **Agreement.** The share of must-see items where the 8B model's new mark is the same as Sonnet's new mark, on every captioned cell (the 20 tuning grids and the 54 free gold cells). The bar is 90%.
- **Pick with the 8B model's marks.** Exact and in-three on the 20 SP-066 tuning words when the captions are Sonnet's new captions with only the marks taken from the 8B model's new captions.
- **Pick with Sonnet's new marks.** Exact and in-three on the 20 tuning words with Sonnet's new captions, against SP-066's change 4 at weights 2·1·1 (exact 5, in-three 14, sum 19 of 40). A change of 2 or less in the sum is noise.
- **Go / no-go.** Go for the new mark when Sonnet passes the gold-set bar and the pick with Sonnet's new marks is not worse than SP-066's by more than the noise. Go for the 8B model's marks as well when the agreement is ≥ 90% and its pick is not worse than the pick with Sonnet's new marks by more than the noise. Otherwise no-go, with the gold-set items that failed.

## Approach
- Copy SP-066's caption step to `spikes/sp-070/` and change only the mark: the list becomes `visible` / `part only` / `hidden`, and the prompt gives the 3 meanings from this card (the part that does the story's action decides). Size, place and the other caption parts stay as they are.
- The completeness part of must-see clarity (C-050) scores `part only` where it scores `partly cut` today. The gate still removes a cell with a `hidden` item.
- Caption with Sonnet the 180 cells of the 20 tuning grids and the 54 free gold cells (234 calls). Caption the same cells with `qwen/qwen3-vl-8b+schema` in LM Studio (free, about 75 min). The schema takes the new mark list.
- Score the marks against `gold.json` with a small script; no Opus judge.
- For the 2 pick lines, run SP-066's pick with Jev on the 20 tuning words, change 4, weights 2·1·1. Reuse SP-066's cached must-see lists and compare lines, so only the captions and Jev's picks are new.
- The run takes a grid list or a limit, and a re-run reuses its cached captions and picks.
- Leave out: the 62 held-out words, size and place, the other caption parts, weight tuning.

## Staged run
- **Cases:** 20 tuning grids (180 cells) and 27 free grids (54 gold cells); no measure set: the 62 held-out words stay out.
- **Stages:** 1 → 3 → 5 → all 47 grids.
- **Early picks:** anomaly first (cell 4 is the case that started this spike), then cottage and optimal (3 of the 12 `part only` items), then sweep and saturation.
- **Check after each stage:** every caption parses and uses only the 3 new marks; a re-run makes no new calls; the gold-set counts so far.
- **Stop for design if:** Sonnet marks most of the gold `part only` items `visible`, or marks many gold `visible` items `part only`, on the first 5 grids. That means the prompt's meaning of the mark does not work, not the code.

## Open questions
- Flash marked the knocks in anomaly 4, 6 and 8 `hidden`: a sound shows only through what it does. The run counts how Sonnet marks them; a rule for sounds in the must-see list is for a later item.
- The 90% bar for the 8B model's agreement stays from SP-069 for now (Flash, 2026-10-19).
- The cells of batches 1 and 2 were picked by their old marks, so the overall match is not the rate on a random cell. Batch 3 (54 random cells from free grids) is closer to that rate; the report gives both.
- `part only` is rare (12 of 301 items), so the pick lines will probably stay inside the noise. That answer is still useful: the new mark would then matter for the gate and the gold set, not for the pick.
- A full gold set for all 6 caption parts is for a separate item (Flash chose the mark only for now).
