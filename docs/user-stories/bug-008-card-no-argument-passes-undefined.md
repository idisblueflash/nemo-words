---
title: "card.js with no argument sends the literal word \"undefined\" down the pipeline"
status: fixed
original_story: "[[US-028-one-word-in-a-story-card-out]]"
ac: 1
found: 2026-10-11
---

## Bug

AC 1 / edge case: empty input is rejected by `normalize`. Expected: `node scripts/card.js`
with no word (or with `""`) stops at `normalize` ("empty input: give one word"), exit 1,
and no later step runs. Actual: with no argument `card.js` passed `WORD=undefined` to
`dags/card.yaml`, so "undefined" was treated as a real word. _qa saw it stop at `ipa`; with
the real CMU dictionary it could card the word "undefined".

## Reproduction

Through `card.js` under Dagu, via `test/helpers/card-harness.js` (throwaway DAGU_HOME,
fakes, mock AnkiConnect):

```
card.js            -> exit 1, "stopped at ipa: no-ipa: undefined is not in the GA dictionary"
card.js ""         -> exit 1, "stopped at normalize: empty input: give one word"  (already fine)
```

Root cause: `scripts/card.js` built `WORD=${process.argv[2]}`, which stringifies a missing
argument as "undefined" before `normalize` ever sees it.

## Fix

`scripts/card.js`: `process.argv[2] ?? ""`, so a missing word is an empty param and
`normalize` rejects it. Regression test: `test/card-ac1-no-word.test.js` (no argument,
empty string, whitespace; asserts stop at normalize, no card write, no model call).
