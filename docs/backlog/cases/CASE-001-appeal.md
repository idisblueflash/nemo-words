---
id: CASE-001
type: case
status: open
subject: appeal
label: "9"
items: [SP-029, SP-064, SP-066]
---
# CASE-001 appeal

**Input:** the story "A peal of bells attracts a curious crowd." and the grid `images/mnemonic/appeal.grid.png` (cells 1–3 on the top row, 7–9 on the bottom row).

![The appeal grid: cells 1–3 on the top row, 7–9 on the bottom row](../../../images/mnemonic/appeal.grid.png)

**Label:** cell 9. The crowd is seen from the back, so the picture tells the story: the sound of the bell draws the crowd in. Cells 1 and 6 show the crowd from the side, the front or at a quarter turn, so the crowd looks interested in the old man who pulls the bell rope, not in the sound. A back view also has two more benefits: it hides faces, where AI images often have odd details (as in cell 6), and it leads the reader's eye to what the crowd looks at, the bell.

## Reviews
- 2026-10-15, SP-029: Flash's pick for the card is cell 9. (Found again by a pixel match with the final crop.)
- 2026-10-17, after SP-066 stage 20 (ADR-0041, in the agent's words, not Flash's): "the main actor is the old man who pulls the bell rope, and the crowd is the onlooker; the back of the crowd leads the eye to him and hides the odd faces of cell 6." Label stays 9.
- 2026-10-18, after SP-066 (Flash's words, grammar fixed): "Cells 6 and 1 show the crowd's side, or its front and quarter faces. This makes the whole image look like people are interested in the old man who pulls the bell, instead of the sound of the bell attracting the crowd. Another benefit of the back of the crowd is that it reduces the chance of odd looks, because AI-generated images have flaws. The third benefit is that the back of the crowd moves the reader's attention to the object that the crowd is focused on (the bell here), so it improves the storytelling." Label stays 9.

## Trials
| Date | Item | Run | Answer | Top 3 | Label's rank | Below the pick by | Report |
|---|---|---|---|---|---|---|---|
| 2026-10-15 | SP-029 | captions + Jev row picks | 8 | 1, 6, 8 (row picks, tie) | — | — | reports/SP-029-auto-image-pick.md |
| 2026-10-16 | SP-064 | tuning, weights 3·1·3 | 5 | 5, 1, 6 | 4 of 7 | 2.27 | reports/SP-064-must-see-image-pick.md |
| 2026-10-18 | SP-066 | change 4 (1, 2, 4 kept), weights 2·1·1 | 1 | 1, 6, 5 | 4 of 7 | 0.81 | reports/SP-066-appeal-case.md |
| 2026-10-18 | SP-066 | change 4, weights 3·2·3 | 6 | 6, 1, 5 | 4 of 7 | 1.94 | reports/SP-066-tuning-five-changes.md |
