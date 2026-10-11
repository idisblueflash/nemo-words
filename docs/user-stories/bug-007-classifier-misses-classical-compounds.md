---
title: "classify-word.js misses classical-morpheme compounds (photograph, telephone, adjoining); route.js sends them down the story-card path"
status: fixed
original_story: "[[US-028-one-word-in-a-story-card-out]]"
ac: 5
found: 2026-10-11
---

## Bug

AC 5: a word built from classical Greek/Latin morphemes goes to the word-part path
(_etta_mology) and no card is made. Expected: `photograph`, `telephone`, `adjoining` stop
with "word-part path (_etta_mology)". Actual: `route.js` prints `general` and `card.js`
cards them.

## Reproduction

```
NEMO_MNEMONIC_LOG=/dev/null node scripts/route.js photograph   -> general, exit 0
NEMO_MNEMONIC_LOG=/dev/null node scripts/route.js telephone    -> general, exit 0
NEMO_MNEMONIC_LOG=/dev/null node scripts/route.js adjoining    -> general, exit 0
node scripts/classify-word.js photograph                       -> Verdict: no match
```

Root cause: `scripts/word-part-reference.json` is a medical-flavoured seed. It has no
general-English Greek combining forms (photo-, tele-, -graph, -phone, ...), and its
`ad-` entry is under the 3-letter `MIN_PART_LENGTH` so it never matches; there is also
no Latin bound root (join) for a short prefix to attach to.

Pre-existing, out of scope (noted for the caller): the substring rules already flag
ordinary words as `medical` (trial, pathway, period, roster, episode, recurrent,
adherence, ...), so `route.js` stops those with a word-part message today.

## Fix

`scripts/classify-word.js` + `scripts/word-part-reference.json` (new `compounds` key):
a word is now `medical`/word-part when an initial form (photo-, tele-, bio-, ... or any
existing non-weak prefix of 3+ letters) is followed by a final form that closes the word
(-graph, -phone, -meter, ...), or a short Latin prefix (ad-, con-, ...) is followed by a
bound root (join). A lone form never matches. Regression tests:
`test/classify-word-compounds.test.js` and the extended `test/card-ac5-word-part.test.js`.
Precision: over the non-word-part rows in `anki/reading-room-terms.txt` the only newly
word-part word is `adjoining`; no other row changed verdict. Limitation: the Latin-root
list is just `join`; other Latin compounds (conduct, subject, ...) are not recognised.
