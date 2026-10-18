---
id: CASE-003
type: case
status: open
subject: anomaly
label: "1"
items: [SP-029, SP-064, SP-066]
---
# CASE-003 anomaly

**Input:** the story "A knock rattles the family's tiles; one's irregular." and the grid `images/mnemonic/anomaly.grid.png`.
**Label:** cell 1, Flash's pick for the card. In cells 3 and 7 the orange tile sits on top of the wall's grout lines, which is a drawing error.

## Reviews
- 2026-10-15, SP-029: Flash's pick for the card is cell 1. (Found again by a pixel match with the final crop.)
- 2026-10-17, after SP-066 stage 5 (in the agent's words, from SP-066's open questions, not Flash's): "Flash thinks anomaly cell 7 would be the most plausible cell without its drawing error (the crack is near the door that is knocked on)." Label stays 1.

## Trials
| Date | Item | Run | Answer | Top 3 | Label's rank | Below the pick by | Report |
|---|---|---|---|---|---|---|---|
| 2026-10-15 | SP-029 | captions + Jev row picks | 1 | 1, 6, 7 (row picks) | — | — | reports/SP-029-auto-image-pick.md |
| 2026-10-16 | SP-064 | measure, weights 3·1·3 | 1 | 1, 9, 2 | 1 of 6 | 0 | reports/SP-064-must-see-image-pick.md |
| 2026-10-18 | SP-066 | change 4 (1, 2, 4 kept), weights 2·1·1 | 7 | 7, 1, 5 | 2 of 5 | 0.11 | reports/SP-066-tuning-five-changes.md |
| 2026-10-18 | SP-066 | change 4, weights 3·2·3 | 1 | 1, 7, 5 | 1 of 5 | 0 | reports/SP-066-tuning-five-changes.md |
