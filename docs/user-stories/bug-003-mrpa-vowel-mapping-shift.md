---
title: "mrpa-phoneme->ipa maps oh/ao/ow to the wrong IPA vowel and is missing aw entirely"
status: fixed
original_story: "[US-021](US-021.md)"
ac: 1
found: 2026-08-26
closed: 2026-08-26
---

## Bug

`mrpa-phoneme->ipa` in `src/nemo_words/ipa.clj` (~lines 172-177) has four
BEEP MRPA vowel/diphthong tokens mapped to the wrong IPA symbols, shifted
by one relative to what BEEP's actual data uses, and one token (`aw`) is
missing entirely.

Current (wrong):
```
"oh" "əʊ"   "ow" "aʊ"   ...   "ao" "ɒ"   ...
```
`aw` is absent from the map altogether, so it falls through to
`mrpa->ipa`'s `(get mrpa-phoneme->ipa % %)` identity fallback and prints
the literal un-converted token text instead of IPA.

Expected, verified directly against `resources/data/beep_uk.dict`:
- `"oh"` -> `"ɒ"` (LOT) -- e.g. BEEP entries `A-BOMB  ey b oh m`,
  `BECAUSE  b ih k oh z`.
- `"ao"` -> `"ɔː"` (THOUGHT) -- e.g. `'CAUSE  k ao z`,
  `ABHOR  ax b hh ao r`.
- `"ow"` -> `"əʊ"` (GOAT) -- e.g.
  `"DOUBLE-QUOTE  d ah b ah l k w ow t`.
- `"aw"` -> `"aʊ"` (MOUTH) -- e.g. `ABLAUT  ae b l aw t`,
  `ABOUND  ax b aw n d`.

Because the forward table's `oh`/`ao`/`ow` entries are wrong and `aw` is
missing, `ipa->mrpa` (the derived reverse map) and any consumer that
round-trips through it (e.g. US-022's `word-matches?`, used by
`populate-lexical-sets`) also produce wrong results: Lexical Sets LOT,
CLOTH, GOAT, and MOUTH all matched 0 real BEEP words even though the
underlying phoneme data is correct.

This violates US-021 AC 1 (`mrpa->ipa converts a simple token vector`) --
the whole point of the map is a correct, spot-checked-against-real-BEEP
per-token mapping, and these four entries aren't.

## Reproduction

Command:
```
clojure -M -e '(require (quote [nemo-words.ipa :as ipa])) (println (ipa/rp-tokens->ipa "s t oh p"))'
```
Observed output: `stəʊp` (GOAT vowel) for the word "stop" -- should be
`stɒp` (LOT vowel).

CLI reproduction:
```
clojure -M -m nemo-words.core ipa-lookup --word out
```
Observed output: `out	awt	ˈaʊt` -- the RP column prints the literal
un-converted `awt` (identity fallback for the missing `aw` entry)
instead of IPA `aʊt`.

Confirmed against `resources/data/beep_uk.dict` directly (grep for
`'CAUSE`, `A-BOMB`, `DOUBLE-QUOTE`, `ABLAUT`, `ABOUND`, `ABHOR`,
`BECAUSE`): all consistent with the Bug section's expected mappings
above, not the current code's.

Also reproduced the downstream effect: `clojure -M -m nemo-words.core
populate-lexical-sets` (run against the real `resources/data/ga_rp.tsv`)
shows LOT/CLOTH/GOAT/MOUTH with 0 kept words each (e.g. `LOT kept 0/6
dropped: ["stop" "sock" "dodge" "romp" "possible" "quality"]`), traced to
`word-matches?` converting the Lexical Set's target IPA through
`ipa->mrpa` and failing to match the dict row's real `:rp-tokens` due to
this same shift.

## Fix (2026-08-26)

Corrected the four `mrpa-phoneme->ipa` entries in `src/nemo_words/ipa.clj`
(~line 172): `"oh" "ɒ"`, `"ao" "ɔː"`, `"ow" "əʊ"`, added `"aw" "aʊ"`. Since
`ipa->mrpa-phoneme` is derived from this map, the reverse direction and
its consumers (`ipa->mrpa`, `rp-query->token-string`, `word-matches?`)
picked up the fix automatically with no other code changes.

Regression test: `test/nemo_words/ipa_test.clj`'s
`mrpa->ipa-lot-cloth-goat-mouth-vowels-test`, asserting each of the four
corrected tokens against a real BEEP-style example word (`stop`, `cause`,
`double-quote`'s `ow t`, and standalone `aw t`).

Verified: `clojure -M:test` -- all `nemo-words.ipa-test` tests pass
(including the pre-existing `mrpa-ipa-round-trip-test` and `ipa->mrpa-*`
tests, unweakened); the one other failing test in the suite
(`main-pick-example-words-by-ipa-missing-lexical-sets-exits-nonzero-test`)
is pre-existing and unrelated (fails identically on `main` before this
change, due to a checked-in `resources/lexical-sets.edn`).

Re-ran `clojure -M -m nemo-words.core populate-lexical-sets` against the
real `resources/data/ga_rp.tsv`: LOT (6/6), CLOTH (4/5), GOAT (6/6), and
MOUTH (6/6) now all show real kept words instead of 0/N.
`resources/lexical-sets.edn` was not touched/committed here, per
instructions -- left to the user.
