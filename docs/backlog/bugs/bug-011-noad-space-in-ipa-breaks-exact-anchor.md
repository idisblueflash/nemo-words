---
title: "A space inside a raw NOAD IPA stays in the syllable, so it never exactly matches"
status: fixed
original_story: SP-052
ac: 3
found: 2026-10-12
---
# bug-011 A space inside a raw NOAD IPA stays in the syllable, so it never exactly matches

## Bug
Expected: The syllable `pər` of "percent" (NOAD `pər ˈsɛnt`) gets NOAD `per` /pər/ as its anchor, so 2 of the 2 syllables have an anchor. Scenario 3 of SP-052 says that a syllable gets a common word whose IPA equals the syllable's IPA exactly.

Actual: The syllable is `pər ` with a space at the end. No keyword has that IPA, so only 1 of the 2 syllables has an anchor. 122 lower-case NOAD headwords have a space in their IPA. The space affects target words and keyword candidates in the same way.

## Reproduction
Reported: Expected: syllable `pər` of percent (NOAD `pər ˈsɛnt`) is anchored with NOAD `per` /pər/, so percent is 2/2. Actual: the syllable is `pər ` (with the space), which equals no keyword's IPA, so percent is 1/2. 122 lower-case NOAD headwords have a space in their IPA; this hits target words and keyword candidates alike.

Round 1 (2026-10-12), from this worktree with the real NOAD extract:

    node spikes/sp-052/run.js
    grep -P '^percent\t' dictionaries/noad/data/sp-052-detail.tsv

Observed for percent: `noad_syllables` `pər .ˈsɛnt`, `noad_anchors` `pər =- sɛnt=sent`, `noad_anchored` 1/2.

## Fix
`canonicalNoad` in `spikes/sp-052/lib/noad.js` now drops whitespace, so syllables and keyword keys never carry a space. Regression test: `test/sp052-ac3-space-in-ipa.test.js`. Report regenerated: NOAD anchored syllables 521 to 522 of 1197; the word counts and the verdict do not change.
