---
status: accepted
deciders: Flash Hu
date: 2026-08-28
---

# 0005. Per-word override table for 5 ambiguous syllable-split shapes, MOP+legal-onsets as default elsewhere

## Context and Problem Statement

Splitting a GA cell's ARPABET token string into per-syllable
onset/nucleus/coda requires deciding how a medial consonant cluster
divides between the previous syllable's coda and the next one's onset.
The Maximal Onset Principle (longest legal word-initial cluster becomes
the onset) handles most cluster shapes correctly. `_david`'s
investigation (3,774 candidate words across 22 cluster shapes,
cross-referenced against `kaikki-en.jsonl`'s orthographic
`hyphenations` field where available — 377 words) found 5 shapes that
MOP plus a whitelist can't settle reliably: `S T R` (majority splits
`s.tr`, opposite of `S K R`'s `.scr`), `N D R` (near coin-flip), and
`N CH`/`K S T`/`N S P` (the orthographic proxy itself breaks down for
these — yod-coalescence, single-letter digraphs, prefix-dominated
samples). We need a way to handle these 5 shapes without corrupting
the algorithmic default that works fine for every other cluster shape.

## Considered Options

* Pure algorithmic (MOP + legal-onsets) for all shapes, accept the
  known errors on the 5 ambiguous shapes
* Full hand-curated whitelist covering every cluster shape, not just
  the 5 ambiguous ones
* Adopt Kyle Gorman's `syllabify` (Python, ARPABET-native MOP +
  legal-onset table) instead of hand-rolling `legal-onsets`
* Use CELEX as a gold-standard pre-syllabified lexical database
* Orthographic hyphenation tools (pyphen / Hyphenator.js / TeX Liang
  patterns) as a syllable-boundary proxy
* Per-word override table scoped to only the 5 data-ambiguous shapes;
  algorithmic default everywhere else

## Decision Outcome

Chosen option: "per-word override table scoped to only the 5
data-ambiguous shapes; algorithmic default everywhere else", because
it's the only option that fixes the actual ambiguity (`_david`'s data
shows MOP genuinely can't settle these 5 shapes) without either the
unbounded cost of full curation or inheriting the same failure from
prior-art tools/data sources, all of which were surveyed and found to
either not solve the problem (Gorman's `syllabify` is MOP-only and
inherits the same ambiguity) or be unviable/unreliable (CELEX
licensing, orthographic proxies breaking down on the exact shapes that
need them).

### Positive Consequences

* Correct splits on the 5 known-hard shapes once populated
* Algorithmic path stays simple, auditable, and correct for the vast
  majority of shapes
* No new runtime dependency

### Negative Consequences

* `S T R` itself ships with a known-wrong algorithmic default until
  overridden per-word (accepted gap per US-027)
* Override table requires ongoing hand-entry against a real
  pronouncing dictionary, currently only seed-populated

## Pros and Cons of the Options

### Pure algorithmic, accept errors

* Good, because zero maintenance, no manual data-entry burden
* Bad, because it systematically produces wrong splits on `S T R`/
  `N D R` (near coin-flip data), degrading syllable search precision
  for those shapes

### Full hand-curated whitelist (every shape)

* Good, because it offers maximum accuracy everywhere
* Bad, because it requires unbounded manual effort for shapes MOP
  already handles correctly, with no evidence of ambiguity to justify
  the cost

### Adopt Gorman's `syllabify`

* Good, because it's proven ARPABET-native prior art, useful for
  cross-checking `legal-onsets`
* Bad, because it's MOP-only and inherits the same ambiguity on the 5
  hard shapes — doesn't actually solve the problem; adds a Python
  dependency to a Clojure project

### CELEX

* Good, because it offers gold-standard pre-syllabified pronunciations
* Bad, because licensing makes it unviable as a dependency

### Orthographic hyphenation tools

* Good, because they are existing, well-tested libraries
* Bad, because letter-based boundaries don't reliably match
  pronunciation — this is the exact failure mode `_david` already
  found when using kaikki's `hyphenations` field as a proxy for
  `N CH`/`K S T`/`N S P`

### Per-word override table scoped to the 5 ambiguous shapes

* Good, because it fixes exactly the shapes with real ambiguity, using
  a real pronouncing dictionary rather than an orthographic proxy;
  keeps the algorithmic path simple and correct for the other 17+
  shapes
* Bad, because it carries a manual data-entry burden and coverage is
  incomplete until the table is populated (US-027 ships only seed
  entries)

## Links

* [US-027](../user-stories/US-027.md)
* [US-027-investigation.md](../user-stories/US-027-investigation.md)
* [US-027-external-tools-investigation.md](../user-stories/US-027-external-tools-investigation.md)
* [ADR-0003](0003-match-nucleus-against-arpabet-mrpa-tokens.md)
