---
title: "The must-see list for evicted keeps the name Victor as a bare item"
status: fixed
original_story: SP-064
ac: 1
found: 2026-10-17
---
# bug-015 The must-see list for evicted keeps the name Victor as a bare item

## Bug
Expected: The list turns the name anchor Victor into its visible sign, such as a nametag that reads "Victor", because scenario 1 says a name anchor becomes its visible sign.

Actual: The real run's list for evicted has the item {"name":"Victor","adjectives":["worried"]}. No item or adjective shows a nametag or other visible sign for Victor. The other name anchors in the run (Venice, Dee, Carl, Lee and more) do get a nametag.

## Reproduction
Reported: The must-see list for evicted keeps the name Victor as a bare item. It does not turn the name into a visible sign.

Command: `node -e 'console.log(JSON.stringify(require("./spikes/sp-064/raw/must-see.json").evicted))'`

Observed: `{"story":"If Victor misses rent, movers will make him leave.","items":[{"name":"Victor","adjectives":["worried"]},{"name":"rent payment",...},{"name":"movers",...}],"isSequence":true}`. Confirmed. A scan of all 82 cached lists for a capitalized story word that is an item name with no sign (nametag, sign, label, ...) finds two lists: evicted (Victor) and bulge (Bulb, item {"name":"Bulb","adjectives":["light bulb head","bribing"]}).

Round 2 (QA, c81f29f). Reported: the list for evicted is now {"name":"Victor","adjectives":["worried","nametag reading \"Victor\""]}. The sign is only an adjective, but the caption prompt sends item names only (ADR-0032), so the captioner judges the bare name "Victor" and marks it hidden in 7 of 9 cells. Same for devious (Dee), polysemy (Melissa) and toss (Tom). Confirmed by scanning the 82 cached lists: those four are the only items whose name holds a story name with no sign in the name. Ventilator's item name is "nurse" (sign in an adjective), so its name is not the bare anchor and stays.

## Fix
`mustSeeLists` in `spikes/sp-064/lib/must-see.js` now checks each list with `unsignedNames`, asks again once with a note that names the bare name, fails the word if the name stays bare, and treats a cached list with a bare name as stale. Only the lists for evicted and bulge are re-made; the shared prompt is unchanged. Regression test: `spikes/sp-064/test/ac1-name-sign.test.js`.

Round 2: `unsignedNames` now keys on the item name (the sign must be in the name). New `moveSignIntoName` in `spikes/sp-064/lib/must-see.js` rewrites an item whose name holds the anchor but whose sign sits only in an adjective to `person with a nametag reading "<anchor>"` and drops that adjective, with no Claude call; it runs on new and cached lists. A list with no sign at all still takes the round-1 re-ask. Regression tests: `spikes/sp-064/test/ac1-name-sign.test.js`.
