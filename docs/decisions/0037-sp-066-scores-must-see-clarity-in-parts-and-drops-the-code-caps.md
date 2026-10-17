---
status: accepted
deciders: Flash Hu
date: 2026-10-17
backlog: [SP-066, C-034, C-043, C-044, C-045, C-046]
---

# 0037. SP-066 scores must-see clarity in parts and drops the code caps

Technical Story: SP-066 (staged run, after stage 5, 2026-10-17)

## Context and Problem Statement

After stage 5 of SP-066's staged run (5 tuning words), three things showed that the code caps of ADR-0035 and ADR-0036 and the one clarity question don't separate the cells:

- **The plausible cap made period a miss.** In almost every cell of period, the sea is a flat block that ends in a straight edge. The captioner marked this drawing error in 6 of 9 cells, and the cap set plausible to 1 in those 6. Jev had already lowered them to about 2. Flash's cell 9, the only cell that shows every must-see item, lost to cell 5 because of the cap. Without the cap, cell 9's total is 9.60, more than cell 5's 9.49.
- **Clarity sits at its lowest level.** The lowest clarity level covers a small or partly cut item, and 39 of the 46 scored cells (85%) have one: their mean clarity is 1.17, against 1.99 for the other 7. Every surgeon cell has a headlamp, which is small by nature, so all of them got the lowest level. A crop that fits a close-up costs the same as one that cuts the story.
- **A cap does nothing at the floor.** The name-sign cap sets clarity to 2 at most, but every ventilator cell was already below 2, so it changed nothing.

Plausible and vivid sit at the top of the scale (2.8–3.0) in most cells, so totals often differ by less than 0.2. Flash proposed scoring the view of the main subject: in surgeon, cell 1 (three-quarter, from 45°) shows the most, cell 8 (side) less, and cell 5 (from above) the least. The caption's camera angle calls cells 1 and 5 both "high angle", so it can't tell them apart.

## Considered Options

For the drawing error:
* Jev decides plausible from the drawing errors, with no code cap
* Keep the code cap only for an error marked in fewer than half of the grid's cells
* Keep the cap (ADR-0036)

For must-see clarity:
* One Jev question per clarity part, clarity = the mean of the parts
* Code scores the lookup parts (completeness, size, name sign, view) and Jev only the state
* One Jev question for all parts, plus code caps for the name sign and the view
* Each part as its own axis with its own weight

## Decision Outcome

Chosen options: "Jev decides plausible from the drawing errors, with no code cap", and "One Jev question per clarity part, clarity = the mean of the parts".

The caption still lists drawing errors, and Jev's state still holds them, but code caps nothing: Jev already lowers a marked cell, and a cap turns a captioner's uneven marks into a large, uneven penalty.

Must-see clarity has five parts, each a Jev Score question with the full caption: completeness, size, state, name sign (only for a name anchor) and main-subject view (only when the story has a main subject: front or three-quarter 3, side 2, back or from above 1). The must-see list names the main subject, and the caption gives its view. Clarity is the mean of the parts that apply. Jev, not code, scores the parts, because some need judgment that a caption field can't give: a crop that fits a close-up and a headlamp that is small by nature cost less than a crop or a small item that hides the story. The mean keeps clarity on the 1–3 scale of the other axes, so the weight search keeps 3 weights.

This replaces both ADR-0036 (the plausible cap) and ADR-0035. ADR-0035's other half stays true and is restated here: the gate checks the carrier of a name (`nurse`), and a name sign never takes a cell out.

### Positive Consequences

* One crop, a small item or an unreadable name no longer pulls the whole clarity score to the bottom, so clarity can separate the cells.
* With the parts, surgeon's cells 1, 8 and 5 get clarity 2.75, 2.50 and 2.25 (assuming those views), in Flash's order.
* Period's cell 9 is no longer pushed down by a cap on an error that most of its cells share.
* The weight search stays at 3 weights.

### Negative Consequences

* The must-see list and caption prompts change, so the 20 lists, 45 captions and 5 Jev requests of stages 1–5 are made again, and the stages start again at 1.
* A Jev request has about 4 more Score questions per cell (about 6,000 in all, up from 2,200).
* The parts count equally, which is a guess; the view order comes from one grid.
* The caps were easy to test in code; Jev's parts vary a little from run to run, even where a part only reads a caption field.
* A badly drawn cell can still win if Jev doesn't lower plausible enough.

## Pros and Cons of the Options

### Jev decides plausible from the drawing errors, with no code cap

* Good, because Jev already lowered the marked cells, and an uneven captioner mark no longer gives a large penalty.
* Bad, because Jev's lowering is mild, so a real drawing error costs less.

### Keep the code cap only for an error marked in fewer than half of the grid's cells

* Good, because an error shared by most cells counts as the grid's style.
* Bad, because the half is a guess, and the captioner's uneven marks still decide which cells are capped.

### Keep the cap (ADR-0036)

* Good, because a drawing error on a must-see item always costs a lot.
* Bad, because period stays a miss through cells that the captioner marked unevenly.

### One Jev question per clarity part, clarity = the mean of the parts

* Good, because each part has its own levels, and Jev can judge when a crop or a small item is fine.
* Bad, because there are more questions, and the equal weights are a guess.

### Code scores the lookup parts and Jev only the state

* Good, because it is easy to test and gives the same result every run.
* Bad, because code can't tell a crop that fits a close-up from one that cuts the story, or a headlamp from a small newborn.

### One Jev question for all parts, plus code caps

* Good, because it is closest to today's run.
* Bad, because one part can still pull the whole score down, and a cap does nothing when clarity is already at the floor.

### Each part as its own axis with its own weight

* Good, because the search can learn which part matters.
* Bad, because 7 weights on 20 tuning words would fit those words too well.

## Links

* Supersedes ADR-0035
* Supersedes ADR-0036
* ADR-0033: vivid scores the scene, not the camera (still true)
* ADR-0032: the must-see gate checks item names only (still true)
