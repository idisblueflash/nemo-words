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

## Fix
`mustSeeLists` in `spikes/sp-064/lib/must-see.js` now checks each list with `unsignedNames`, asks again once with a note that names the bare name, fails the word if the name stays bare, and treats a cached list with a bare name as stale. Only the lists for evicted and bulge are re-made; the shared prompt is unchanged. Regression test: `spikes/sp-064/test/ac1-name-sign.test.js`.
