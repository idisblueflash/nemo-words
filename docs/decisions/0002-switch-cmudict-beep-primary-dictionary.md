---
status: proposed
deciders: Flash Hu
date: 2026-08-25
---

# 0002. Switch to CMUdict (GA) + BEEP (RP) as the primary pronunciation dictionary

Technical Story: [US-016](../user-stories/US-016.md)

## Context and Problem Statement

ADR-0001 chose to fix Kaikki's dialect-tag gating (US-016) rather than
switch dictionaries, based on investigation-002's pre-fix simulation
showing the fix would raise Kaikki's composite agreement to 88.0% against
the Lexical Sets Table — close to CMUdict+BEEP's ceiling. US-016 has since
shipped. investigation-001 re-measured agreement using the actual post-fix
data (not a simulation) and found Kaikki's real composite score is 58.7% —
coverage-limited (78.1%, still missing ~22% of target words) rather than
close to CMUdict+BEEP's 92.9% (100% coverage, 92.9% quality-of-found). The
gap the original fix was expected to close did not materialize at the
predicted size. Given this, does the project keep iterating on Kaikki, or
switch to the higher-scoring CMUdict+BEEP pairing?

## Decision Drivers

* Measured accuracy/agreement against the Wells Lexical Sets Table
  (primary driver)
* Coverage (word found at all) — weighted over stress-mark/syllable-
  separation fidelity
* License terms are explicitly not a factor for this personal open-source
  project
* Native IPA output is no longer a hard requirement — a translation layer
  (ARPAbet→IPA) is acceptable, especially given Kaikki's own IPA quality
  has proven low

## Considered Options

* Kaikki as-is (status quo, post-US-016)
* Keep iterating on Kaikki (further coverage fixes beyond US-016)
* ipa-dict (`en_US.txt` + `en_UK.txt`)
* WikiPron (`wikipron_us_broad.tsv` + `wikipron_uk_broad.tsv`)
* Switch to CMUdict (GA) + BEEP (RP)

## Decision Outcome

Chosen option: "CMUdict (GA) + BEEP (RP)", because it scores highest on
the driver that now matters most — measured agreement against the Lexical
Sets Table (100% coverage, 92.9% quality-of-found, 92.9% composite) — by a
wide margin over Kaikki's real post-fix score (78.1% coverage, 58.7%
composite), and the two properties this project no longer weights heavily
(native IPA output, single self-consistent source, commercial licensing)
are outweighed by that accuracy gap.

### Positive Consequences

* Highest measured agreement against the Lexical Sets Table of any
  candidate (92.9% composite vs. Kaikki's 58.7%), with 100% coverage —
  every target word found
* Same-methodology GA/RP pairing (both ARPAbet-family, purpose-built for
  RP/GA distinctions) avoids the notation clashes that hurt cross-project
  pairings like ipa-dict and WikiPron
* No further coverage-gap engineering needed on Kaikki's extractor beyond
  what US-016 already did

### Negative Consequences

* Requires building a new ARPAbet→IPA translation layer, replacing
  Kaikki's native-IPA extraction pipeline (`build-kaikki-ipa-dict.js`)
  with a new CMUdict+BEEP one
* CMUdict's ARPAbet inventory can't distinguish some Wells-set pairs at
  all (STRUT/commA, NURSE/lettER collapse to the same phoneme) — the
  92.9%/100% scores are an inflated ceiling on this word list, not a
  clean win
* Loses Kaikki's stress-mark/syllable-separation detail, which the
  original FEAT-001 selection valued for downstream nucleus-matching
* BEEP is not currently in `resources/data/` (only ad hoc downloaded for
  the comparison) and carries a non-commercial research-use license — not
  a blocker for this project, but worth recording for any future
  relicensing/redistribution question
* FORCE-set mismatch against the table remains unresolved even with this
  switch (investigation-001 finding 3: all dicts, including CMUdict,
  transcribe FORCE words identically to NORTH)

## Pros and Cons of the Options

### Kaikki as-is (post-US-016)

* Good, because it's already in `resources/data/`, self-consistent
  RP+GA, native IPA, with stress marks and syllable separation
* Bad, because real post-fix measurement (investigation-001) shows only
  58.7% composite agreement against the table — coverage-limited (78.1%),
  well below what the pre-fix simulation predicted

### Keep iterating on Kaikki

* Good, because it preserves the single self-consistent source and native
  IPA properties FEAT-001 originally selected Kaikki for
* Bad, because investigation-001 shows the coverage gap remaining after
  US-016 is still large, and there's no evidence a further round of
  extractor fixes would close it to CMUdict+BEEP's level

### ipa-dict (en_US + en_UK)

* Good, because it's a single project, already downloaded
* Bad, because known US/UK stress-placement mismatch (FEAT-001
  background) and measured composite is only 72.9%

### WikiPron (us_broad + uk_broad)

* Good, because best composite score (85.2%) among the non-CMUdict
  candidates
* Bad, because broad transcription loses stress-mark/syllable detail, and
  it's still well below CMUdict+BEEP's 92.9%

### CMUdict (GA) + BEEP (RP)

* Good, because it scored highest (100% coverage, 92.9% composite) in
  investigation-001's PoC
* Good, because same-methodology ARPAbet-family pairing avoids
  cross-project notation clashes
* Bad, because CMUdict's phoneme inventory can't distinguish some
  Wells-set pairs (STRUT/commA, NURSE/lettER) at all — the near-perfect
  score is an inflated ceiling, not a clean win
* Bad, because ARPAbet is not IPA — needs a translation layer
* Bad, because BEEP isn't part of `resources/data/` yet and is
  non-commercial licensed (accepted risk for this personal project)

## Links

* Supersedes ADR-0001
* [investigation-001-lexical-sets-dictionary-comparison](../investigations/investigation-001-lexical-sets-dictionary-comparison.md) — source of
  the post-fix measurement motivating this switch
* [investigation-002-us-016-kaikki-dialect-tag-gating](../investigations/investigation-002-us-016-kaikki-dialect-tag-gating.md) — source of the
  original pre-fix simulation ADR-0001 relied on
* [US-016](../user-stories/US-016.md) — the dialect-tag-gating fix whose real-world impact fell
  short of the pre-fix prediction
* [issue-001-kaikki-dict-missing-common-words](../issues/issue-001-kaikki-dict-missing-common-words.md) — root-caused the
  coverage defect both ADRs address
* [FEAT-001](../user-stories/FEAT-001.md) — original Lexical Sets Table / dictionary-selection story
