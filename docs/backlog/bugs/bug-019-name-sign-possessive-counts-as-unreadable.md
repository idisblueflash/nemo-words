---
title: "A possessive form of the name sign counts as unreadable"
status: fixed
original_story: SP-066
ac: 3
found: 2026-10-17
---
# bug-019 A possessive form of the name sign counts as unreadable

## Bug
Expected: A possessive form of the name ('s or ’s, in any case) counts as the name, because scenario 3 and ADR-0035 cap must-see clarity only when the cell can't show the name sign. The name sign is readable, so clarity is not capped. A word that only starts with the name (for example "Venicean") or ends in an extra letter (for example "Venices") still does not match.

Actual: `nameSignReadable` returns false for the readable text `NURSE VENICE'S STATION` and for `Venice’s` when the name sign is "Venice". The cell then gets the must-see clarity cap at 2.

## Reproduction
Reported: `nameSignReadable` (spikes/sp-066/lib/pick.js) returns false for the readable text `NURSE VENICE'S STATION` and for `Venice’s` (curly apostrophe) when the name sign is "Venice". The code drops the apostrophe, so "venices" is compared with "venice" and doesn't match.

Observed (no paid call made): the new test in `spikes/sp-066/test/ac3-name-sign-drawing-error.test.js` failed with false for these texts.

## Fix
spikes/sp-066/lib/pick.js: plainText now drops a possessive ('s or ’s at the end of a word) before it drops apostrophes, so "Venice's" matches the name "Venice"; whole-word matching is unchanged.
