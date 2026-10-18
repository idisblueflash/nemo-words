---
id: CASE-002
type: case
status: open
subject: ventilator
label: "8"
items: [SP-029, SP-064, SP-066, SP-069]
---
# CASE-002 ventilator

**Input:** the story "Nurse Venice returns later; the machine breathes for the newborn." and the grid `images/mnemonic/ventilator.grid.png`.

![The ventilator grid: cells 1–3 on the top row, 7–9 on the bottom row](../../../images/mnemonic/ventilator.grid.png)

**Label:** cell 8, Flash's pick for the card. After SP-066 stage 2, Flash thinks cells 1 and 7 are better (see Reviews). The label stays 8 until Flash changes it, so the trials of SP-029, SP-064 and SP-066 compare.

## Reviews
- 2026-10-15, SP-029: Flash's pick for the card is cell 8. (Found again by a pixel match with the final crop.)
- 2026-10-17, after SP-066 stage 2 (in the agent's words, from SP-066's open questions, not Flash's): "Flash now thinks cells 1 and 7 are better than cell 8." Label stays 8.

## Trials
| Date | Item | Run | Answer | Top 3 | Label's rank | Below the pick by | Report |
|---|---|---|---|---|---|---|---|
| 2026-10-15 | SP-029 | captions + Jev row picks | 2 | 2, 5, 8 (row picks) | — | — | reports/SP-029-auto-image-pick.md |
| 2026-10-16 | SP-064 | tuning, weights 3·1·3 | 7 | 7, 4, 2 | 4 of 9 | 1.73 | reports/SP-064-must-see-image-pick.md |
| 2026-10-18 | SP-066 | change 4 (1, 2, 4 kept), weights 2·1·1 | 6 | 6, 7, 8 | 3 of 9 | 0.19 | reports/SP-066-tuning-five-changes.md |
| 2026-10-18 | SP-066 | change 4, weights 3·2·3 | 7 | 7, 6, 9 | 4 of 9 | 0.48 | reports/SP-066-tuning-five-changes.md |
| 2026-10-19 | SP-069 | captions by `qwen3-vl-4b`: Opus mean 2.48 (Sonnet 2.91), 9 of 9 parse | — | — | — | — | reports/SP-069-cheaper-caption-models.md |
| 2026-10-19 | SP-069 | captions by Haiku: Opus mean 2.43 (Sonnet 2.91), 9 of 9 parse | — | — | — | — | reports/SP-069-cheaper-caption-models.md |
| 2026-10-19 | SP-069 | captions by `qwen3-vl-8b`: Opus mean 2.50 (Sonnet 2.91), 9 of 9 parse | — | — | — | — | reports/SP-069-cheaper-caption-models.md |
| 2026-10-19 | SP-069 | captions by `qwen3-vl-8b` + JSON schema: Opus mean 2.44 (Sonnet 2.91), 9 of 9 parse | — | — | — | — | reports/SP-069-cheaper-caption-models.md |
