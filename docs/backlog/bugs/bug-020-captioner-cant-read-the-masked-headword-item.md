---
title: "The captioner marks an item hidden when its name is wholly the headword"
status: fixed
original_story: SP-066
ac: 2
found: 2026-10-17
---
# bug-020 The captioner marks an item hidden when its name is wholly the headword

## Bug
Expected: An item whose name is wholly the headword is still marked from what the cell shows, because scenario 2 says each caption marks every must-see item. A cell that shows the item is not taken out by the gate (scenario 3). The headword still never reaches the blind caption call.

Actual: The caption prompt shows the item as "key item". The captioner cannot know what that means. It marks the item `surgeon` hidden in cells that show the surgeon. The gate then takes those cells out.

## Reproduction
Reported: For the word "surgeon" (story "Power surge! An OR goes dark; she operates by headlamp."), the must-see list has the item `surgeon`, which is the headword. `maskName` in spikes/sp-066/lib/headword.js turns that name into the placeholder "key item" for the blind caption call. In spikes/sp-066/raw/captions.json, surgeon.grid.png cells 2, 3, 6 and 7 mark `surgeon` hidden, although each cell's own `objects` list names "surgeon". The gate took out cells 2, 3, 6 and 7. SP-064 had the same symptom.

Observed (no paid call made): `caption.prompt` listed `["operating room","key item","headlamp"]` for the word "surgeon". With the fake captioner, which hides "key item" as the real one did, `node run.js --stage tuning --caption-only` marked `surgeon` hidden in cells that show it. The new test in `spikes/sp-066/test/ac2-bare-headword-item.test.js` failed with 'hidden' instead of 'visible'.

## Fix
spikes/sp-066/lib/headword.js adds `describeBareName`; spikes/sp-066/lib/caption.js shows a name that is wholly the headword as "the main subject of the picture (the one thing or person the scene is about)" (no headword, no story). The `mustSee` key stays the item name. Names with other words keep the placeholder, so other prompts stay byte-identical.
