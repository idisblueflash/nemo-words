---
title: "The caption call sees the headword when the must-see list names it"
status: fixed
original_story: SP-064
ac: 2
found: 2026-10-17
---
# bug-016 The caption call sees the headword when the must-see list names it

## Bug
Expected: The captioner never sees the word, because scenario 2 says it sees only the cell and the list, never the word.

Actual: The caption prompt for ventilator ends with MUST-SEE ITEMS: ["nurse","breathing machine (ventilator)","newborn"]. The prompt for surgeon lists "surgeon", and the prompt for pajamas lists "matching pajamas". The promptKey in raw/captions.json matches these prompts, so the real caption calls got the headword.

## Reproduction
Reported: The caption call sees the headword when the must-see list names it. This happened for ventilator, surgeon and pajamas in the real run.

Command: `node -e 'const c=require("./spikes/sp-064/lib/caption.js");console.log(c.prompt(require("./spikes/sp-064/raw/must-see.json").ventilator.items).split("\n").pop())'`

Observed: `MUST-SEE ITEMS: ["nurse","breathing machine (ventilator)","newborn"]`. Confirmed. A scan of all 82 cached lists for item names that hold the word or a regular form of it finds exactly three: ventilator, surgeon ("surgeon") and pajamas ("matching pajamas").

## Fix
New `spikes/sp-064/lib/headword.js` (`mentions`, `maskName`, shared with the ac 3 fix) finds the word and its regular forms. `caption.js` now takes the word: `prompt`, `promptKey` and `parseCaption` hide the word in an item name that holds it (a bracket that holds only the word is dropped; otherwise the word becomes "key item"), and map the captioner's answer back to the list's own item names, so the `mustSee` keys stay the same for the gate and the pick. A list that does not hold the word gives a byte-identical prompt and key. Only the captions of ventilator, surgeon and pajamas are made again. Regression test: `spikes/sp-064/test/ac2-headword-hidden.test.js`.
