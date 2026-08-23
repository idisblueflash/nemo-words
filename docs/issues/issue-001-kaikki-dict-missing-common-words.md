---
title: "en_US_RP_ipa.tsv is missing many common plain words, causing heavy seed-word drop rates in populate-lexical-sets"
status: handed-off
story: "[[US-016]]"
related_story: "[[US-015]]"
found: 2026-08-23
investigated: 2026-08-23
---

## Issue

Re-running `clojure -M -m nemo-words.core populate-lexical-sets` against a
freshly built `resources/data/en_US_RP_ipa.tsv` drops far more seed words
than [[US-015]]'s background section anticipates. That story documents
drops as expected mainly for the 7 rhotic rows (composed vs. decomposed
r-colored vowel, e.g. `hurt` → dict GA `/hɝt/` not `/ɜɹ/`). In practice,
plain (non-rhotic) sets drop heavily too, e.g.:

```
KIT      kept 0/6  dropped: ["ship" "sick" "bridge" "milk" "myth" "busy"]
DRESS    kept 4/6  dropped: ["neck" "shelf"]
TRAP     kept 3/6  dropped: ["badge" "scalp" "cancel"]
STRUT    kept 3/6  dropped: ["suck" "budge" "blood"]
```

Root cause traced to `scripts/build-kaikki-ipa-dict.js`, not to
`build-set`/`word-matches?`. Confirmed directly against
`resources/data/en_US_RP_ipa.tsv`: ordinary words like `ship`, `sick`,
`milk`, `myth`, `busy`, `bridge`, `neck`, `badge`, `scalp`, `cancel` have
**no row at all** in the file (`awk -F'\t' '$1=="ship"'` on the TSV
returns nothing), even though they're common English words. The
extraction script only emits a row when kaikki's `sounds` array has an
entry tagged US/GA/RP, or (fallback) an untagged entry when the word has
*no* regional tag at all:

```js
const { genam, rp } = pickDialectIpas(obj.sounds);
if (!genam && !rp) return;   // word silently dropped from the TSV
```

So a word whose kaikki entry has `sounds` but none tagged US/GA/RP, and
also has at least one entry tagged with some *other* region (which
disqualifies the untagged fallback per the `hasAnyRegionalTag` check),
gets skipped entirely rather than partially included. This is a data
coverage gap in the extraction, separate from the already-documented
empty-RP-cell issue ([[US-001]]'s ~23% empty-RP-cell rate, bug-001).

## Impact

`populate-lexical-sets`/`build-set` behave correctly per their ACs
(filter to what verifies, report drops, no error) — this is not a code
bug in [[US-004]]/[[US-015]]. But the practical result is that several
Wells sets bootstrap with very few (or, for KIT, zero) example words,
which undermines the CLI's stated purpose of bootstrapping a usable
`lexical-sets.edn` from a fresh checkout.

## Investigation (2026-08-23)

Confirmed root cause is more precise than originally hypothesized, by
inspecting raw `sounds` entries in `resources/data/kaikki-en.jsonl` for
`ship`, `sick`, `the`, `egg`, `tree`, `bus`, `bridge`, `badge`, `scalp`,
`cancel`, `neck`, `myth`, `milk`.

The dominant mechanism: kaikki frequently stores **audio-clip metadata
entries that carry a region tag but no `ipa` field** alongside a
perfectly good untagged IPA transcription, e.g. `tree`'s `sounds`
contains untagged `/tɹiː/` plus separate audio-only objects tagged
`['Received-Pronunciation']` and `['General-American']` (only
`audio`/`ogg_url` keys, no `ipa`). `pickDialectIpas`' `hasAnyRegionalTag`
checks only `s.tags`, not whether `s.ipa` is present, so these audio-only
entries both (a) disqualify the untagged fallback and (b) still fail the
`s.ipa && tags.some(...)` candidate filter since they have no `ipa` —
net result `genam=null, rp=null`, row dropped. Same pattern hits ordinary
function words: `the`, `at`, `in`, `if`, `by`, `this`, `that`, `would`,
`could`, `them`, `which`, `there`.

A secondary, smaller mechanism (the original hypothesis) is also real:
`milk`/`myth` have real dialectal `ipa` entries tagged Canada/Southern-US/
South-Asia, none GA/RP-exact, so genuinely no US/GA/RP candidate exists
for them — a data-coverage gap in kaikki itself, not an extraction bug.

**Scope**: hand-built list of ~190 common words (function words + basic
vocab), **45/188 (~24%) absent** from `en_US_RP_ipa.tsv` — systemic, not
a narrow KIT-set edge case.

**Option 3 checked concretely**: `cmudict.dict` and `wikipron_us_broad.tsv`
cover nearly all sampled missing words (`cancel` missing from wikipron's
broad set too) but both are GA/US-only, confirming [[FEAT-001]]'s original
rejection of them as primary sources (no RP, and CMUdict has no native
IPA). Using either as a supplement would only patch the GA column and
reopens the stress-notation-mismatch problem FEAT-001 already ruled out.

## Recommendation

**Option 1** (fix `pickDialectIpas`'s `hasAnyRegionalTag`/candidate
filters in `scripts/build-kaikki-ipa-dict.js` to ignore `sounds` entries
without an `ipa` field when gating). Small, surgical, root-cause fix;
recovers both GA and RP symmetrically (unlike option 3, GA-only); doesn't
reopen FEAT-001's RP-coverage concerns (unlike option 3). Plan: apply the
fix, re-run `build-kaikki-ipa-dict.js` against the local dump, then
re-verify `lexical-sets-table` against the regenerated TSV — it may need
no re-seeding (option 2) at all once this lands.

No fix applied yet — this file tracks the investigation; implementation
is a separate follow-up.
