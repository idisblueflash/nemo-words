---
title: "The grid-differences call sees the headword through the must-see list"
status: fixed
original_story: SP-064
ac: 3
found: 2026-10-17
---
# bug-017 The grid-differences call sees the headword through the must-see list

## Bug
Expected: The grid-differences call never sees the word, because scenario 3 says it works under the same blindness as the captioner.

Actual: The differences prompt sends the full must-see list with adjectives. For worn it holds the adjective "worn". The lists for cramped, spilled, shattered, surgeon, pajamas and ventilator also hold the headword, so those calls saw it too.

## Reproduction
Reported: The grid-differences call sees the headword when the must-see list holds it as a name or an adjective. This happened for 7 words in the real run.

Command: `node -e 'const d=require("./spikes/sp-064/lib/differences.js");console.log(d.prompt(require("./spikes/sp-064/raw/must-see.json").worn.items).split("\n").pop())'`

Observed: `MUST-SEE LIST: [{"name":"driver","adjectives":["warned"]},{"name":"tire","adjectives":["bald","worn","rubbed smooth"]},{"name":"tread","adjectives":["rubbed off","bald"]}]`. Confirmed. A scan of all 82 lists with the bug-016 helper (`mentions`, which also matches regular forms) finds 10 words, not 7: bulge ("bulging"), contest ("showing a contest"), cramped, pajamas, pound ("pounding"), shattered ("shattered into pieces"), spilled, surgeon, ventilator and worn. The raw cache `differences.json` was keyed by grid only, so it did not record which prompt made a entry.

## Fix
`spikes/sp-064/lib/differences.js`: `prompt(items, word)` now reuses `headword.js` (bug-016) to hide the word in an item name (`maskName`) and to drop an adjective that holds it; a list without the word gives a byte-identical prompt. Cache entries are now `{ promptKey, lines }`, keyed by prompt like captions; an old bare array of lines stays only while the word's prompt is unchanged. `run.js` unwraps the lines for the pick. Regression test: `spikes/sp-064/test/ac3-headword-hidden.test.js` (`ac3-differences.test.js` reads the new cache shape).
