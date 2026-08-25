---
title: "best-candidates drops candidates with an empty RP cell (e.g. narwhal) from the candidate pool"
status: fixed
original_story: "[US-014](US-014.md)"
ac: 1
found: 2026-08-23
---

## Bug

Expected (AC1, "Onset match outranks nucleus-only match"): for target word
"gnarly" (GA `/ˈnɑɹli/`) and pair rp `/ɑː/` ga `/ɑɹ/`, candidate "narwhal"
(onset "n", matching the target's onset) appears in `best-candidates`'
output and is ranked above "starlet" (onset "st", non-matching).

Actual: "narwhal" is entirely absent from `best-candidates`' output for
that pair. Its `:rp` cell is empty (`""`) in
`resources/data/en_US_RP_ipa.tsv`, and `nemo-words.match/best-candidates`
queries the candidate pool via `(ipa/lookup-rows dict {:rp rp :ga ga})`.
Per `ipa/lookup-rows`'s `cond`, when both `:rp` and `:ga` keys are present
in `opts` only the `:rp` branch fires (`:rp` is checked before `:ga`), so
the query silently degrades to a `:rp`-substring-only lookup and the `:ga`
key is ignored entirely. Since narwhal's `:rp` is `""`, it fails the `:rp`
substring test and is dropped from the candidate pool before
`pairs/extract-syllable` (which would otherwise score it fine) ever sees
it.

## Reproduction

Command:
```
clojure -M -e '(require (quote [nemo-words.match :as match]) (quote [nemo-words.ipa :as ipa])) (def dict (ipa/load-rp-ga-dict)) (println (some #(= (:word %) "narwhal") (match/best-candidates dict "gnarly" "ɑː" "ɑɹ")))'
```

Observed output: `nil` (narwhal absent from the results).

Confirmed root cause directly against `ipa/lookup-rows`:
```
clojure -M -e '(require (quote [nemo-words.ipa :as ipa])) (def dict (ipa/load-rp-ga-dict)) (println (count (ipa/lookup-rows dict {:rp "ɑː" :ga "ɑɹ"}))) (println (some #(= (:word %) "narwhal") (ipa/lookup-rows dict {:rp "ɑː" :ga "ɑɹ"}))) (println (some #(= (:word %) "narwhal") (ipa/lookup-rows dict {:ga "ɑɹ"})))'
```
Output:
```
3181
nil
true
```
`{:rp "ɑː" :ga "ɑɹ"}` excludes narwhal (empty `:rp` cell); `{:ga "ɑɹ"}`
alone includes it. Confirms `best-candidates`' `{:rp rp :ga ga}` query
degrades to `:rp`-only per `lookup-rows`'s `cond` order, silently dropping
every candidate whose RP cell is empty — 14,577 of 62,894 rows per
US-001's "Data reality" note — from consideration regardless of GA match.

Note: `resources/data/en_US_RP_ipa.tsv`'s `narwhal` row is
`narwhal\t/ˈnɑɹʍəl/\t` (GA present, RP cell empty), consistent with
US-001's documented ~23% empty-RP-cell rate.

## Fix

`nemo-words.match/best-candidates` (`src/nemo_words/match.clj`) now
queries the candidate pool via `(ipa/lookup-rows dict {:ga ga})` instead
of `{:rp rp :ga ga}`, so rows with an empty `:rp` cell are no longer
silently excluded before `pairs/extract-syllable` gets a chance to score
them; `extract-syllable` already re-verifies rp/ga syllable alignment per
row, so dropping the redundant/broken `:rp` pre-filter doesn't loosen
correctness. Regression test:
`test/nemo_words/match_test.clj`'s
`best-candidates-includes-empty-rp-candidate-test`.
