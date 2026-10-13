---
title: "check-stories only compares a keyword's first GA form, so a closed keyword matching through a later form never passes"
status: fixed
original_story: US-050
ac: 1
found: 2026-10-14
---
# bug-014 check-stories only compares a keyword's first GA form

## Bug
Expected: for a word whose stressed syllable plus the next consonant is exactly a common word (elastic: /læs/ is "last"), `node scripts/card.js elastic` makes the card, with the story built on that word. Actual: exit 1, `stopped at pick-story: no-pick: none of 1 candidates passed every gate; ... anchor-ipa: last /læst/ is not /læs/`. No row, note or log row.

## Reproduction
Round 1 (qa): `node scripts/card.js elastic` with real nemo-words and word-freq data, a fake claude answering compose-stories with "The last stick was a stretchy band.", mock AnkiConnect and Jev.

Own repro: `node scripts/find-keywords.js 'ɪ.ˈlæ.stɪk' elastic` prints `læs	last	3.1711e-4`, because `find-keywords` accepts any GA form (CMU lists `last` as `lˈæst,lˈæs`). `check-story.js` looked the keyword up with `lookupGa`, which returns only the first form (`lˈæst`), so the gate said `last /læst/ is not /læs/` for every sentence. Reproduced as a red test: `test/card-us050-ac1-second-ga-form.test.js` (exit 1 with that reason before the fix).

## Fix
`scripts/check-story.js` now accepts a keyword when any of its GA forms matches the chunk (exact or rime); the CLI uses the new `lookupGaForms` in `scripts/ipa.js`, which returns all forms.
