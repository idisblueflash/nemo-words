# US-027 external-tools investigation

Not a data investigation (see [US-027-investigation.md](US-027-investigation.md)
for that, by `_david`) — this is a prior-art survey of existing
syllabification approaches/tools, done in response to a question about
whether medial-consonant-cluster splitting has been solved elsewhere
before this story hand-rolls `legal-onsets` + `syllable-overrides.edn`.

## Linguistic principles behind almost every approach

- **Maximal Onset Principle (MOP)** — give a medial cluster to the
  following syllable's onset as far as the language's phonotactics
  allow (`extra` -> `ɛk.strə`, not `ɛks.trə`, since `/str/` is a legal
  English onset). This is the principle the story's Protocol already
  adopts.
- **Sonority Sequencing Principle (SSP)** — find sonority troughs
  (local minima) in the segment string; syllable boundaries fall there.
  A more general, derivable version of MOP rather than a lookup table.
- **Legality Principle** — a candidate onset/coda must match an
  attested onset/coda cluster in the language's inventory (this is what
  `legal-onsets` implements directly).

None of these three resolve the story's actual hard cases (`S T R` vs.
`S K R` splitting oppositely, `N D R` as a near coin-flip) — they're
the same principles the story's Background already tried and found
insufficient for those five shapes, confirming a curated override
table is the right fallback rather than a missing algorithmic rule.

## Existing tools/libraries surveyed

- **`syllabify` (Kyle Gorman)** — a Python package built specifically
  for ARPABET input (same notation `ga_rp.tsv` uses), implementing MOP
  + a legal-onset table for English, used in the CMU/festival
  ecosystem. Closest prior art to this story's `syllable.clj`; worth
  reading its onset-legality table for cross-checking `legal-onsets`,
  but it does not appear to special-case `S T R`/`N D R` either — it's
  a MOP-only implementation, so it would inherit the same ambiguous
  cases this story is solving with overrides.
- **`pyphen` / Hyphenator.js / TeX hyphenation patterns (Liang's
  algorithm)** — solve *orthographic* hyphenation via statistical
  per-language pattern files, not phonological syllabification.
  Boundaries are letter-based and won't reliably match pronunciation
  (this is exactly the failure mode the Background found when using
  kaikki's `hyphenations` field as a proxy for `N CH`/`K S T`/`N S P`).
- **Festival / eSpeak** — both TTS engines solve this internally to
  place stress/timing; open source, rule sets could be grepped for
  English-specific cluster-splitting decisions, but neither was
  actually pulled and diffed against this story's five ambiguous
  shapes.
- **CELEX** — a lexical database shipping pre-syllabified
  pronunciations for a large English wordlist; a source of
  gold-standard boundaries rather than an algorithm, but licensing
  makes it unlikely to be viable as a dependency here.

## Conclusion

No surveyed tool resolves the five genuinely ambiguous shapes
(`N D R`, `S T R`, `N CH`, `K S T`, `N S P`) any better than this
story's own per-word override table — they either don't attempt those
cases (MOP-only implementations inherit the same ambiguity) or solve a
different problem (orthographic hyphenation, not phonemic
syllabification). This corroborates the Background's decision to hand
those five shapes off to `syllable-overrides.edn` rather than looking
for a smarter algorithmic rule. `syllabify` (Gorman) is worth a direct
read for cross-checking `legal-onsets`' table contents, but not as a
drop-in replacement.
