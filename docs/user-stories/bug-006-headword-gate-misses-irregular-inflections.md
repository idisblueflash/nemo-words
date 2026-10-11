---
title: "Headword gate in check-story.js only knows regular inflections; irregular forms (sang, ran, dying, lying, children) pass"
status: fixed
original_story: "[[US-028-one-word-in-a-story-card-out]]"
ac: 2
found: 2026-10-11
closed: 2026-10-11
---

## Bug

AC 2: the picked story must not contain the word or any inflection of it.
Expected: for `sing`, the candidate "She sang music at the fair." is rejected
(`headword: sang`). Actual: `check-story` exits 0, so `card.js` carded it. Same for
run/ran, die/dying, lie/lying, child/children.

## Reproduction

With an empty chunk-keywords file `K`:

```
node scripts/check-story.js sing music "She sang music." - K     -> exit 0 (should be 1)
node scripts/check-story.js run music "He ran music." - K        -> exit 0
node scripts/check-story.js die music "Dying music." - K         -> exit 0
node scripts/check-story.js lie music "Lying music." - K         -> exit 0
node scripts/check-story.js child music "Children music." - K    -> exit 0
node scripts/check-story.js sing music "She sings music." - K    -> "headword: sings", exit 1 (regular form is caught)
```

Root cause: `inflections()` generated only suffix-rule forms (-s/-es/-ed/-ing/-er/-est
with e-drop, y->i, doubling), so suppletive/ablaut forms and the ie->ying rule were never
produced.

## Fix

`scripts/check-story.js`: `inflections()` now also adds forms from a curated `IRREGULAR`
table (common irregular verbs, plurals, good/bad) and the ie -> -ying rule. Regression
test: `test/card-ac2-irregular-headword.test.js`.
