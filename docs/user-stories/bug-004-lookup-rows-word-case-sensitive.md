---
title: "lookup-rows's {:word w} exact-match lookup is case-sensitive, dropping capitalized queries against the lowercase dict"
status: fixed
original_story: "[US-001](US-001.md)"
ac: 1
found: 2026-08-26
closed: 2026-08-26
---

## Bug

`nemo-words.ipa/lookup-rows` (`src/nemo_words/ipa.clj`, ~lines 618-621),
the `{:word w}` branch, does a case-sensitive exact string match:

```clojure
(contains? opts :word)
(filter #(= (:word %) (:word opts)) dict)
```

`resources/data/ga_rp.tsv` stores every word lowercase (e.g. `boston`,
`chelsea`), but callers sometimes look up a word with its natural
capitalization -- most concretely, `nemo-words.build-set/lexical-sets-table`'s
seed words for the Wells Lexical Sets, lifted verbatim from FEAT-001's
markdown table, include capitalized proper nouns like `"Boston"` (CLOTH
set) and `"Chelsea"` (happY set).

`word-matches?` (same file, ~line 651) delegates to `lookup-rows {:word
word}` first, so it inherits this: a word that's genuinely in the dict and
genuinely matches its target rp/ga still reports as "not matching" if the
caller's casing doesn't equal the dict's stored casing.

This violates US-001 AC 1 (exact word lookup): `lookup-rows`'s `{:word w}`
match should find a dictionary word regardless of the query's casing,
since the dict itself is normalized to lowercase and the "exact match"
guarantee is about identifying the same word, not about byte-for-byte
casing equality.

## Reproduction

Command:
```
clojure -M -e '(require (quote [nemo-words.ipa :as ipa])) (def dict (ipa/load-ga-rp-dict)) (println (ipa/word-matches? dict "boston" "ɒ" "ɔ")) (println (ipa/word-matches? dict "Boston" "ɒ" "ɔ"))'
```
Observed output:
```
true
false
```
Confirms `word-matches?` (via `lookup-rows {:word ...}`) resolves the
lowercase form `"boston"` but fails on the capitalized `"Boston"`, even
though both should refer to the same dictionary row.

Concretely surfaced via `clojure -M -m nemo-words.core
populate-lexical-sets`: CLOTH's seed word "Boston" and happY's seed word
"Chelsea" both show up in that command's "dropped: [...]" summary, even
though their tokens genuinely satisfy their set's rp/ga targets --
confirmed by testing the lowercase form of each word directly via
`word-matches?`, which returns `true`.

## Fix (2026-08-26)

Made the `{:word w}` branch of `lookup-rows` (`src/nemo_words/ipa.clj`,
~line 620) case-insensitive: both the row's `:word` and the query are
lower-cased via `strutil/lower-case-str` (already `:require`d as
`strutil`) before comparison.

Checked callers of `lookup-rows {:word ...}` / `word-matches?`:
`core.clj`'s `ipa-lookup` and `build_set.clj` (via `word-matches?`) --
neither relies on case-sensitivity as a feature; both pass through
whatever casing the caller/CLI gives them and expect a dictionary
lookup, not a literal string comparison.

Regression test: `test/nemo_words/ipa_test.clj`'s
`lookup-rows-exact-word-case-insensitive-test`, asserting `{:word "Car"}`
and `{:word "CAR"}` both resolve to the same lowercase-stored `"car"`
row as `{:word "car"}` does.

Verified: `clojure -M:test` -- `nemo-words.ipa-test` fully passes
(previously-passing word/rp/ga/pair tests unweakened); the 3 remaining
suite failures (`main-pick-example-words-by-ipa-missing-lexical-sets-exits-nonzero-test`)
are pre-existing and unrelated, due to a checked-in
`resources/lexical-sets.edn` (same as noted in bug-003).

Re-ran `clojure -M -e '... (ipa/word-matches? dict "Boston" "ɒ" "ɔ")'`
-- now `true` (was `false`). Re-ran `clojure -M -m nemo-words.core
populate-lexical-sets` against the real `resources/data/ga_rp.tsv`:
CLOTH now shows `kept 5/5` (was 4/5, dropping "Boston"); happY now
shows `kept 6/7 dropped: ["scampi"]` (was dropping "Chelsea" too;
"scampi" remains a real, separate data limitation). `resources/lexical-sets.edn`
was not touched/committed here, per instructions -- left to the user.
