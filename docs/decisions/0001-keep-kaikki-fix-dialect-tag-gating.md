---
status: superseded
deciders: Flash Hu
date: 2026-08-23
---

# 0001. Keep Kaikki as the primary dictionary; fix dialect-tag gating (US-016) instead of switching to an alternate source

Technical Story: [[US-016]]

## Context and Problem Statement

FEAT-001 chose Kaikki (`resources/data/en_US_RP_ipa.tsv`) as the project's
pronunciation dictionary. [[issue-001-kaikki-dict-missing-common-words]]
root-caused a coverage gap: `build-kaikki-ipa-dict.js`'s dialect-tag gating
drops a word entirely when its only regional-tagged `sounds` entries are
audio-only (no `ipa` field), even when an untagged real-ipa entry exists
that could be recovered. This causes common words (e.g. `ship`, `the`,
`milk`, `tree`, `bus`) to go missing from the generated TSV, undermining
downstream consumers like [[US-015]]'s `populate-lexical-sets` that rely on
Kaikki as seed data. Given this gap, does the project fix the extractor, or
replace/supplement Kaikki with an alternate dictionary?

## Decision Drivers

* Stress marks and syllable separation in the transcription, useful for
  downstream nucleus-matching tasks
* Coverage of multiple accents (RP + GA) in a single source
* Built-in native IPA support (no notation-translation layer needed)
* Availability as a downloadable local file
* IPA-based substring search against the dictionary

## Considered Options

* Kaikki as-is (status quo) — coverage gap already causing problems
* Fix Kaikki's dialect-tag gating in `build-kaikki-ipa-dict.js` (US-016)
* Reseed `lexical-sets.edn` differently, working around the gaps rather
  than fixing extraction
* Supplement Kaikki's GA column with CMUdict/WikiPron (issue-001's
  "Option 3")
* Switch entirely to CMUdict (GA) + BEEP (RP) as the primary dictionary

## Decision Outcome

Chosen option: "Fix Kaikki's dialect-tag gating (US-016)", because it
delivers the largest measured agreement gain of any option against the
Lexical Sets Table (composite 65.3% → 88.0% per investigation-002's PoC)
while fixing the actual root cause in `build-kaikki-ipa-dict.js`, preserving
a single self-consistent RP+GA source with proper stress marking and IPA
output — the properties FEAT-001 originally selected Kaikki for — and
avoiding the licensing and notation-translation costs that rule out
CMUdict+BEEP and the incomplete/one-sided fix of the GA-supplementation
option.

### Positive Consequences

* Kaikki stays the single, self-consistent RP+GA dictionary with stress
  marking and native IPA output — no new notation-translation layer needed
  downstream
* Recovers a large share of previously-dropped common words (33.8% of
  Kaikki's currently-dropped words) without a source swap
* Composite agreement against the Lexical Sets Table rises to 88.0%, close
  to the CMUdict+BEEP ceiling, without incurring BEEP's licensing risk
* Fixes the defect at its root cause, benefiting every future lookup
  through this dict, not just the Lexical Sets seed words

### Negative Consequences

* Doesn't fully close the coverage gap — ~38.7k words remain dropped even
  after the fix
* Known follow-up edge cases remain out of scope: dialect-tag list
  completeness gaps and a third-region blocking scenario
* Leaves Kaikki's FORCE-set mismatch against the table unresolved
* Defers the higher-scoring CMUdict+BEEP option entirely, accepting
  Kaikki's lower measured accuracy (88.0% vs. 92.9%) in exchange for
  staying within the existing IPA-based, commercially-usable pipeline

## Pros and Cons of the Options

### Kaikki as-is

* Bad, because it drops ~22-24% of common target words, undermining the
  bootstrapping purpose of `populate-lexical-sets`

### Fix dialect-tag gating (US-016)

* Good, because it's the root-cause fix and recovers coverage
  symmetrically for both GA and RP columns
* Good, because the ad hoc PoC shows it delivers the biggest agreement
  gain of any option (composite 65.3% → 88.0%), more than any
  alternate-dict swap
* Bad, because it doesn't fully close the gap (still ~38.7k words dropped
  afterward) and has known follow-up edge cases (tag-list completeness
  gap, third-region blocking case)

### Reseed `lexical-sets.edn` differently

* Bad, because it papers over the root cause — every future word lookup
  through this dict hits the same gap, not just the initial seed set

### Supplement GA column with CMUdict/WikiPron

* Bad, because it's GA-only, doesn't touch the RP column, and reopens the
  cross-project stress-notation mismatch FEAT-001 already ruled out
* Bad, because investigation-002 found issue-001's own motivating examples
  (`myth`, `cancel`) are fixed by the gating fix alone, undercutting the
  need for this option
* Bad, because the other dict's GA notation isn't in the same system as
  Kaikki's, reopening notation-matching problems

### Switch to CMUdict (GA) + BEEP (RP)

* Good, because it scored highest (100% coverage, 100% composite) in the
  ad hoc PoC
* Bad, because BEEP is research-only/non-commercial licensed
* Bad, because ARPAbet is not IPA — needs a translation layer, and
  CMUdict's phoneme inventory can't distinguish some Wells-set pairs
  (STRUT/commA, NURSE/lettER) at all, so the 100% score is an inflated
  ceiling, not a clean win
* Bad, because BEEP isn't part of `resources/data/` — only ad hoc
  downloaded for the comparison

## Links

* Superseded by ADR-0002
* [[US-016]] — the in-flight story implementing this fix
* [[investigation-002-us-016-kaikki-dialect-tag-gating]] — source of the
  cross-dictionary PoC and 65.3%→88.0% measurement cited in the outcome
* [[investigation-001-lexical-sets-dictionary-comparison]] — the follow-up
  PoC that reopened this question and led to ADR-0002 (superseding this
  record)
* [[issue-001-kaikki-dict-missing-common-words]] — root-caused the
  coverage defect this ADR addresses
* [[FEAT-001]] — original Lexical Sets Table / dictionary-selection story
