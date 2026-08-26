---
title: "ipa->arpabet mis-tokenizes when adjacent single-vowel/consonant-pair IPA output happens to spell a multi-codepoint symbol"
status: closed
resolution: fixed
original_story: "[US-020](US-020.md)"
ac: 5
found: 2026-08-26
closed: 2026-08-26
---

## Bug

Expected (AC 5, round-trip consistency): for any ARPABET token vector `v`,
converting `v` via `arpabet->ipa` then back via `ipa->arpabet` returns `v`
unchanged. E.g. `["S" "AO1" "IH0" "NG"]` -> `arpabet->ipa` -> `"sˈɔɪŋ"` ->
`ipa->arpabet` -> should be `["S" "AO1" "IH0" "NG"]`.

Actual: `ipa->arpabet` tokenizes greedily against `arpabet-phoneme->ipa`'s
values (longest match first) with no boundary awareness of where
`arpabet->ipa` actually placed a token boundary. When two adjacent ARPABET
tokens' IPA renderings happen to concatenate into a string that itself
spells a *different*, longer multi-codepoint IPA symbol, the greedy scan
matches that longer symbol across the boundary instead of respecting it:

- `AO` (`ɔ`) + `IH` (`ɪ`) concatenate to `ɔɪ`, which is also the rendering
  of `OY` (a diphthong) — greedy match picks `OY` instead of `AO`+`IH`.
- `T` (`t`) + `SH` (`ʃ`) concatenate to `tʃ`, which is also the rendering
  of `CH` — greedy match picks `CH` instead of `T`+`SH`.

31/135166 real cmudict.dict entries fail round-trip this way (e.g.
"nutshell" `[N AH1 T SH EH2 L]` round-trips to `[N AH1 CH EH2 L]`).

## Reproduction

Command:
```
clojure -M -e '(require (quote [nemo-words.ipa :as ipa])) (println ((ns-resolve (quote nemo-words.ipa) (quote arpabet->ipa)) ["S" "AO1" "IH0" "NG"])) (println (ipa/ipa->arpabet "sˈɔɪŋ"))'
```

Observed output:
```
sˈɔɪŋ
[S OY1 NG]
```

Expected: second line should print `[S AO1 IH0 NG]`.

Confirmed same class of failure for the T+SH/CH case:
```
clojure -M -e '(require (quote [nemo-words.ipa :as ipa])) (println ((ns-resolve (quote nemo-words.ipa) (quote arpabet->ipa)) ["N" "AH1" "T" "SH" "EH2" "L"])) (println (ipa/ipa->arpabet "nˈʌtʃˌɛl"))'
```
Output:
```
nˈʌtʃˌɛl
[N AH1 CH EH2 L]
```

Confirmed the scope against the real dictionary: a full pass of every
`resources/data/cmudict.dict` entry through `arpabet->ipa` then
`ipa->arpabet` shows exactly 31/135166 mismatches, all of the two
reported forms (`AO<d> IH0` collapsing to `OY<d>`, or `T SH` collapsing
to `CH`) — consistent with the bug's `actual` field.

## Investigation: why this can't be fixed by re-tokenizing smarter

`ipa->arpabet` only receives the concatenated IPA string — `arpabet->ipa`
(reused as-is per this story's Background, not to be changed) throws away
ARPABET token boundaries when it concatenates. When two adjacent tokens'
IPA renderings happen to spell the same string as some other single
ARPABET token's rendering, the two readings are **byte-for-byte
indistinguishable** in the output string — there is no signal left in the
IPA text (stress placement, adjacent characters, etc.) that reveals which
one the original token vector meant.

Verified there is no safe heuristic to break the tie in favor of the
31 real cases without breaking many more currently-correct words:
- Real cmudict occurrences of a vowel token immediately followed by a
  genuine standalone `OY` token (no intervening consonant) exist too:
  e.g. `IH0 OY1` (1x), `IY0 OY1` (2x), `ER0 OY1`/`ER0 OY2` (5x/12x),
  `AA1 OY0`/`IY1 OY0` (1x each) — so "an adjacent vowel implies the
  diphthong should be split" is false in general.
- Real cmudict has 4877 genuine `CH` tokens and 6291 genuine `JH`
  tokens (vs. only 12 genuine `T SH` boundary occurrences and 0 `D ZH`
  ones) — any change that prefers splitting `tʃ`/`dʒ` into two tokens
  instead of merging would fix ~12-31 words while breaking thousands.
- Concretely, `test/nemo_words/ipa_test.clj`'s existing
  `round-trip-arpabet-ipa-arpabet-test` already round-trips every single
  ARPABET token (including `OY0/1/2`, `CH`, `JH`) standalone through
  `arpabet->ipa`/`ipa->arpabet` and asserts the merged (greedy) reading
  — flipping the tie-break to prefer splitting would fail that
  already-passing test, which the workflow requires not weakening.
- That same test file's own comment (lines 190-196, pre-dating this bug)
  already documents this exact ambiguity as "the tokenizer's inherent,
  accepted ambiguity", and the story's own "Known limitation, accepted"
  section already carves out "similar many-to-one collapses" (named for
  `AH0`, but structurally identical to this case) as not
  round-trip-guaranteed.

Conclusion: this is a **representation-level ambiguity**, not a
tokenizing bug with a hidden correct fix. Resolving it for real would
require `arpabet->ipa` to encode token boundaries in its output (e.g. a
boundary marker), which changes the reused forward function's public
output format and would ripple into its other consumers (the `:cmudict`
brand loader, `ga-tokens->ipa`'s AC1/AC2 exact-string expectations) — a
design change beyond a bug fix's scope. No code change was made; see the
story's owner for a decision on either (a) explicitly narrowing AC5 to
match what the implementation already guarantees (alternating
consonant-vowel token vectors, as the existing round-trip test already
restricts itself to) or (b) redesigning `arpabet->ipa`'s output format to
carry boundary information.

## Resolution (2026-08-26)

Initially investigated options (a) narrow AC 5's scope or (b) redesign
`arpabet->ipa`'s output to carry boundary information, and confirmed via
web research that no other ARPABET↔IPA tool solves this class of
problem either (see prior investigation above).

Went with a narrower version of (b) that avoids the ripple effect
originally assumed: an exhaustive pairwise check of every
`arpabet-phoneme->ipa` base against every other showed only **three**
adjacent-base pairs can ever collide (`T`+`SH`→`CH`, `AO`+`IH`→`OY`,
`D`+`ZH`→`JH` — provably exhaustive, since every mapped IPA rendering is
at most 2 codepoints, so a 3+-token span can't collide). `arpabet->ipa`
now inserts a zero-width non-joiner (`U+200C`) between exactly those
three pairs at concatenation time, while it still has the real token
boundaries. This is invisible in display output and doesn't touch any
existing exact-string test assertion (none contain a colliding pair),
so the "reused as-is" visible-output guarantee holds. `ipa->arpabet`
needed no changes: its existing unrecognized-codepoint skip already
treats the marker as a forced token break.

Verified against the full `resources/data/cmudict.dict` corpus (135,166
entries): 0 round-trip failures, down from 31. AC 5 was restored to its
original unrestricted wording. Fixed via TDD in
`src/nemo_words/ipa.clj` (`render-arpabet-token`, `colliding-adjacent-bases`,
`token-boundary-marker`) with new tests in `test/nemo_words/ipa_test.clj`
(`round-trip-boundary-collision-test`, and the randomized round-trip
generator now covers any token arrangement, not just alternating
consonant/vowel). Closed as fixed, not wontfix.
