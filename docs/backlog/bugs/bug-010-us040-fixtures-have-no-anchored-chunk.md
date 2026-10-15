---
title: "US-040 wary fixture has no anchored chunk, so find-keywords now stops the run"
status: fixed
original_story: US-041
ac: 2
found: 2026-10-12
---
# bug-010 US-040 wary fixture has no anchored chunk, so find-keywords now stops the run

## Bug
Expected: A word that has some chunks with a keyword and some chunks with none still gets a card. Scenario 2 of US-041 says so. The US-040 tests that make a card for "wary" still pass.

Actual: After US-041 was rebased onto US-040, three tests exit 1 with `stopped at find-keywords: no sound anchor found; wɛ	-; ɹi	-`. The cause is the shared `waryFixture`: it gives no keyword to either chunk.

## Reproduction
Reported: Expected: a word where some chunks are anchored is still carded (US-041 AC2); the US-040 tests that card "wary" still pass. Actual: after rebasing US-041 onto US-040, three tests exit 1 with `stopped at find-keywords: no sound anchor found; wɛ	-; ɹi	-`, because the shared `waryFixture` gives neither chunk a keyword.

`node --test test/card-us040-ac1-judged-general.test.js test/card-us040-ac9-lowercase.test.js` fails 3 tests (AC1, AC9 WARY, AC9 Wary) with the stop above.

## Fix
`waryFixture` (test/helpers/card-harness.js) now has a common word "re" (/ɹˈi/) anchoring the ɹi chunk, and its story sentence (and the US-040 tests asserting it) gains ", re safety" so the anchor appears in it; no production code changed.
