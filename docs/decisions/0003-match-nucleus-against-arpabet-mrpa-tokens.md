---
status: accepted
deciders: Flash Hu
date: 2026-08-25
---

# 0003. Match lexical-set nucleus against ARPABET/MRPA tokens, not translated IPA

## Context and Problem Statement

[[FEAT-002]] switches the primary dictionary build to CMUdict (GA) + BEEP
(RP), and both are translated into IPA for the output TSV's columns.
Downstream lexical-set consumers (`populate-lexical-sets`, `ipa-lookup`)
need to identify a word's vowel nucleus to classify it into a Wells
lexical set. [[investigation-001-lexical-sets-dictionary-comparison]]
(finding 4) already found that doing this against IPA output requires
extra normalization: narrower/broader-style transcriptions collapse a
vowel+r into a single rhotic ligature (`ɝ`/`ɚ`), which then has to be
decomposed before it can be compared against a lexical-set table's
decomposed target (e.g. NURSE's `ɜɹ`). ARPABET (and BEEP's MRPA) don't
have this problem — a vowel nucleus is always a single discrete token
(e.g. `AA`, `ER`), with no ligature collapsing to undo. The question:
should nucleus matching operate on the pre-translation ARPABET/MRPA
phoneme tokens, or on the translated IPA output?

## Decision Drivers

* Avoids ligature-decomposition normalization
* Keeps IPA purely presentational

## Considered Options

* ARPABET/MRPA tokens (pre-translation)
* Translated IPA output

## Decision Outcome

Chosen option: "ARPABET/MRPA tokens (pre-translation)", because nucleus
matching only has to compare single discrete phoneme tokens instead of
decomposing rhotic IPA ligatures, and collapsing to one on-disk file
(`ga_rp.tsv`) keeps IPA strictly a derived, presentational format rather
than a second thing that has to be built and kept consistent with the
raw data.

### Positive Consequences

* Nucleus/lexical-set matching logic gets simpler — direct token
  comparison, no ligature-decomposition normalization step
* Single source of truth (`ga_rp.tsv`) — no risk of the raw data and a
  derived IPA file drifting out of sync
* IPA becomes a clearly-scoped, purely presentational concern — any
  consumer needing it derives it the same way, from the same raw tokens

### Negative Consequences

* Every consumer that wants IPA output now pays an ARPABET/MRPA→IPA
  encode step at read time instead of reading a pre-computed value off
  disk
* This reverses part of US-017's already-drafted design (which wrote
  `ga_rp_ipa.tsv` with pre-translated IPA columns as the on-disk format)
  — US-017 will need to be revised to match: build `ga_rp.tsv` with raw
  tokens instead, and move IPA encoding into the read path (e.g.
  `load-rp-ga-dict`/`lookup-rows`)
* Anything that inspects the TSV file directly (by eye, or with external
  tools) now sees ARPABET/MRPA tokens instead of human-readable IPA,
  which is less immediately legible

## Pros and Cons of the Options

### ARPABET/MRPA tokens (pre-translation)

* Good, because nucleus is always a single discrete token — no ligature
  collapsing, no decomposition step needed
* Good, because it's the same representation CMUdict/BEEP already
  store, so no extra transformation before matching
* Good, because there's only one on-disk file (`ga_rp.tsv`) — no second
  IPA file to build or keep in sync; IPA becomes a purely runtime-
  derived representation, encoded from the raw tokens on demand by
  whatever consumer needs it (e.g. `ipa-lookup`)
* Bad, because every consumer that wants IPA output (not just nucleus
  matching) now pays the ARPABET/MRPA→IPA encode cost at read time
  instead of reading a pre-computed value off disk

### Translated IPA output

* Good, because it matches directly against an already-written file —
  no encode step needed at read time
* Bad, because rhotic ligatures (`ɝ`/`ɚ`) require normalization/
  decomposition before comparing to a lexical-set table's decomposed
  target, per investigation-001 finding 4

## Links

* [[FEAT-002]] — the story this decision revises (needs updating to build
  `ga_rp.tsv` with raw tokens instead of `ga_rp_ipa.tsv` with
  pre-translated IPA)
* [[investigation-001-lexical-sets-dictionary-comparison]] — source of
  the rhotic-ligature normalization finding (finding 4) motivating this
  decision
* [[0002-switch-cmudict-beep-primary-dictionary]] — the ADR this one
  builds on (CMUdict+BEEP as the source dictionaries)
