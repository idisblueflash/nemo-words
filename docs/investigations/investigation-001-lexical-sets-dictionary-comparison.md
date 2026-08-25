---
title: "PoC: scoring candidate pronunciation dictionaries against the Lexical Sets Table"
status: findings-recorded
story: "[[FEAT-001]]"
related_issue: "[[issue-001-kaikki-dict-missing-common-words]]"
related_issue_2: "[[investigation-002-us-016-kaikki-dialect-tag-gating]]"
investigated: 2026-08-25
---

## Goal

FEAT-001 committed to Kaikki as "the" dictionary based on a five-criteria
comparison (stress marks, RP+GA coverage, downloadable local file, IPA→word
substring search). This PoC asks a narrower, empirical question: **for the
27 rows of the Lexical Sets Table (24 Wells sets + happY/lettER/commA, 155
total example-word instances), which candidate dictionary's actual RP/GA
transcriptions agree with the table's RP/GA cells most often?**

Method: for each row, for each example word, look the word up in the
candidate's GA source and RP source; count a match if the table's RP target
substring appears in the word's RP transcription and the GA target substring
appears in its GA transcription (both after normalizing rhotic notation —
`r` vs `ɹ`, and decomposing r-colored ligatures `ɝ`→`ɜɹ`/`ɚ`→`əɹ` so they
count as matching the table's decomposed "vowel+r" form). Scripts and full
per-row output live in scratchpad (not checked in); the results below are
the durable summary.

## Candidates evaluated

| Dict | GA source | RP source | Note |
|---|---|---|---|
| Kaikki | `resources/data/en_US_RP_ipa.tsv` (own GA column) | same file (own RP column) | already-chosen source per FEAT-001 |
| ipa-dict | `resources/data/en_US.txt` | `resources/data/en_UK.txt` | same project, but known US/UK stress-placement mismatch (FEAT-001 background) |
| WikiPron | `resources/data/wikipron_us_broad.tsv` | `resources/data/wikipron_uk_broad.tsv` (downloaded, CUNY-CL/wikipron `eng_latn_uk_broad.tsv`) | same project, broad transcription |
| CMUdict + BEEP | `resources/data/cmudict.dict` (ARPABET→IPA) | `resources/data/beep_uk.dict` (downloaded, [OpenSLR-14](https://www.openslr.org/14/), British English Example Pronunciation dict, MRPA/ARPABET-style scheme) | same phonemic-transcription tradition (flat ARPABET-family), unlike pairing CMUdict with an unrelated project's RP file |

An earlier pass paired CMUdict's GA with ipa-dict's `en_UK.txt` for RP —
that was a mistake (crossing two unrelated dictionary projects' notation
conventions) and has been superseded by the CMUdict+BEEP pairing below.

**BEEP license note**: BEEP's README states "commercial use is prohibited"
(derived in part from Oxford Text Archive data, research-use license). Fine
for this evaluation; would need re-checking before use as an actual
downstream dependency.

## Results

| Dict | Coverage (word found) | Quality-of-found (both RP+GA match) | Coverage-adjusted score (both / 155) |
|---|---|---|---|
| **CMUdict (GA) + BEEP (RP)** | **100%** | **92.9%** | **92.9%** |
| WikiPron (us_broad + uk_broad) | 96.8% | ~88.0% | 85.2% |
| ipa-dict (en_US + en_UK) | 94.2% | 77.4% | 72.9% |
| Kaikki (en_US_RP_ipa.tsv) | 78.1% | 75.2% | 58.7% |

## Findings

1. **CMUdict+BEEP is the strongest match to the table by a wide margin**,
   on both raw score and coverage (every one of the 155 target words was
   found in both). Same-methodology pairing (both flat ARPABET-family
   phonemic schemes) avoids the notation clashes that hurt the other three
   pairings.

2. **Kaikki's shortfall is a coverage problem, not a transcription-quality
   problem.** Once a word is present, Kaikki's match quality (75.2%) is
   close to ipa-dict's (77.4%) and not far off the others. But 22% of
   target words are simply missing as headwords — this is the exact defect
   [[issue-001-kaikki-dict-missing-common-words]] already root-caused
   (`build-kaikki-ipa-dict.js`'s `pickDialectIpas` dropping words whose only
   regional-tagged `sounds` entries are audio-only, no `ipa` field) and
   [[US-016]] is the in-flight fix for. **[[investigation-002]] found that
   fix recovers 33.8% of Kaikki's currently-dropped words and explicitly
   flagged that cmudict/wikipron supplementation ("Option 3") is "very
   likely unnecessary once [[US-016]] lands."** This PoC's Kaikki score
   should be re-measured after US-016 ships, before treating 58.7% as
   Kaikki's ceiling — it's a pre-fix number.

3. **FORCE fails almost everywhere, dict-independently.** CMUdict, Kaikki,
   and WikiPron all transcribe FORCE words (`four`, `wore`, `sport`,
   `porch`, `borne`, `story`) identically to NORTH (`ɔɹ`/`ɔr`), never
   producing the table's `or`/`oɹ` target. This is evidence the table's
   FORCE `ga` cell may be assigned backwards relative to real GA data (or
   that the NORTH-FORCE merger is now the GA default across mainstream
   sources) — worth a targeted re-check independent of which dictionary is
   chosen.

4. Rhotic-vowel sets (NURSE, NEAR, SQUARE, CURE) are a universal weak spot
   across dicts *before* ligature normalization — narrower/broader-style
   dicts collapse vowel+r into a single glyph (ɝ/ɚ) rather than the table's
   decomposed form. Once normalized for that, it resolves cleanly; this is
   a query-notation gap, not a real disagreement.

## Open question for the team

CMUdict+BEEP scores highest today, but Kaikki's score is measured
*pre*-US-016-fix, and FEAT-001's original choice of Kaikki was driven by
criteria this PoC doesn't re-litigate (single self-consistent RP+GA file,
substring-searchable, already fully downloaded). Whether to adopt
CMUdict+BEEP, wait for US-016 and re-measure Kaikki, or keep Kaikki
regardless of this score gap is an open decision — see the ADR being
drafted alongside this investigation.
