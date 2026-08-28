# US-027 data investigation

Done by `_david`.

294,407 rows in `ga_rp.tsv`; 56,509 (≈19%) contain a medial 2-3
consonant cluster between two vowel tokens — common enough that the
onset whitelist affects a real fifth of the dictionary, not a corner
case. 1,164 distinct cluster shapes exist, heavily skewed toward ~30
common ones. Cross-referencing the 22 largest/most-relevant cluster
shapes (3,774 candidate words) against kaikki's `hyphenations` field
(only 377 words had a usable entry — coverage is thin) found:

- Naive MOP + a standard whitelist already gets the right answer, once
  prefix/compound/spelling-artifact false positives are filtered out,
  for: `M P L`, `N K L`, `N F L`, `M B L`, `N D L`, `N T L`, `M B R`,
  `M P R`, `N T R`, `S K R`.
- `S T R` and `N D R` are genuinely data-ambiguous:
  - `S T R` (a valid absolute word-initial cluster, so naive MOP would
    keep it whole) actually splits `s.tr` — S staying in the *previous*
    syllable's coda — in 41/57 sampled words (`ministry`, `Australia`,
    `nostril`, `forestry`). That's the *opposite* whitelist decision
    from the superficially similar `S K R`, which splits `.scr` (the
    whole cluster as onset, matching naive MOP) in 9/11 sampled words
    (`describe`, `manuscript`, `prescribed`).
  - `N D R` is closer to a genuine coin flip: 10/17 sampled words split
    `n.dr` (`hundredth`, `syndrome`, `scoundrel`) but 5/17 split `nd.r`
    (`hundred`, `fundraiser`, `husbandry`) — and `hundred` and its own
    derived form `hundredth` disagree with *each other*.
- `N CH`, `K S T`, and `N S P` looked ambiguous in the raw split counts,
  but the orthographic-hyphenation proxy breaks down for them
  specifically: `N CH` is dominated by words where the phonetic /tʃ/ is
  spelled "t(u)" (yod-coalescence: `century`, `venture`), not a literal
  "ch"; `K S T` is dominated by words spelling /ks/ as a single letter
  "x" (`sixty`, `exterior`), so the orthographic hyphen can't align with
  a 2-phoneme cluster spelled as one letter; `N S P` is dominated by
  `trans-`-prefix and compound words, i.e. morphology, not phonology —
  none of these three are usable evidence either way.

Full investigation notes (scratch scripts, per-cluster counts, word
lists) are not part of this repo; the findings above are the durable
summary. Conclusion: the five cluster shapes (`N D R`, `S T R`, `N CH`,
`K S T`, `N S P`) need a manually curated per-word override table rather
than a static whitelist rule — see the story's Protocol.

## Follow-up investigation (2026-08-28): is a hybrid better than ADR-0005's per-word override table?

Done by `_david`, after [ADR-0005](../decisions/0005-per-word-override-table-for-5-ambiguous-syllable-split-shapes.md)
was accepted, to check whether a context-sensitive rule, a shape-level
majority-flip, or a better orthographic-proxy substitute could resolve
some/all of the 5 shapes algorithmically instead of by hand-curation.
Re-derived candidate word lists directly from `ga_rp.tsv` (not reusing
the story's own counts): 488 `S T R`, 272 `N D R`, 357 `N CH`, 193
`K S T`, 86 `N S P` distinct medial-cluster words — 5-13x the prior
investigation's per-shape samples (57/17/dozens).

**A better proxy than orthographic `hyphenations` exists in the same file.**
`kaikki-en.jsonl`'s `sounds[].ipa` field carries actual phonemic IPA
transcriptions, many with syllable-boundary dots, and — this matters —
IPA stress marks (`ˈ`/`ˌ`) are themselves syllable-boundary markers by
convention (placed immediately before the stressed syllable's onset), so
treating them as boundaries too (not stripping them, as a naive read of
"look for the dot" would) roughly triples usable coverage over dots
alone. Matching this field against the candidate lists (lang_code `en`,
exact word match) gave informative per-shape samples of 107 (`S T R`),
27 (`N D R`), 43 (`N CH`), 39 (`K S T`), 26 (`N S P`) words — smaller
than ideal for `N D R`/`N S P`/`K S T` but a categorical improvement in
*kind* over the orthographic proxy, since it sidesteps spelling
mismatches (yod-coalescence, digraphs) entirely by searching the
pronunciation directly.

**Q4 — was the `N CH`/`K S T`/`N S P` orthographic-proxy breakdown a sample
artifact? Yes.** Scored against the phonemic-IPA proxy instead, all three
turn out to have a strong, non-coin-flip majority that *already matches*
what MOP + a standard legal-onsets table (longest legal suffix of the
cluster becomes the onset) would produce with no override at all:

| shape | MOP-default split | phonemic-majority match | n (informative) |
|---|---|---|---|
| `N CH` | `n.ch` (CH legal onset) | 36/43 = 84% | 43 |
| `K S T` | `k.st` (ST legal onset) | 33/39 = 85% | 39 |
| `N S P` | `n.sp` (SP legal onset) | 18/26 = 69% | 26 |

These rates are in the same range as the 10 shapes the original
investigation already found "MOP + whitelist already gets right." The
prior conclusion that these three were data-ambiguous rested entirely on
the orthographic proxy failing to align with spelling — it was a proxy
artifact, not evidence of real phonological ambiguity. **Recommendation:
`N CH`, `K S T`, `N S P` likely do not need `syllable-overrides.edn`
entries at all** — trusting the algorithmic default outperforms building
a hand-curated table for these three, for a fraction of the maintenance
cost. (Caveat: n=26-43 per shape, not huge; residual 15-31% minority is
real and would still misclassify words like `dexter`/`transport`.)

**`N D R` is not as close to a coin flip as the original 17-word sample
suggested.** At n=27 informative words, the phonemic-IPA majority splits
`n.dr` (MOP's own default, `D R` being a legal onset) in 16/27 (59%),
`nd.r` in 5/27 (19%), and 6/27 (22%) show no boundary marker touching the
cluster at all (uninformative, not tallied as a third outcome). That's
roughly a 3:1 favor for the algorithmic default, not 50/50 — closer to,
but still below, the confidence of the "already fine" shapes above.
**Recommendation: keep `N D R` in the override table as ADR-0005
decided** (the ~19-40% minority is real and includes exactly the
disagreeing-with-itself `hundred`/`hundredth` pair already on record),
but note the urgency/priority is lower than the Background implied,
since doing nothing already gets a majority of cases right.

**`S T R`'s claimed majority direction does not replicate at this
sample size, and may run the other way.** Original finding: 41/57 (72%)
split `s.tr`. Re-derived phonemic-IPA tally at n=107: whole-cluster-onset
(`.str`, MOP's own default) 50/107 (47%), `s.tr` 33/107 (31%), `st.r`
2/107 (2%), no boundary touching the cluster 22/107 (21%). The plurality
now favors the *algorithmic default*, not the flip the Background
describes as "the known, accepted limitation an override entry would
correct." Cross-checking the subset of 30 words that have *both* a
usable orthographic-hyphenation decision and a phonemic-IPA decision
found only 17/30 (57%) agreement between the two proxies — and 12 of the
13 disagreements were words with a Latin/Greek prefix ending in the
cluster's `s` (`distribute`, `redistribute`, `astringent`, `magistrate`,
`gastronomy`, `astrologer`, `mistral`...), where hyphenation (which tends
to preserve historical morpheme boundaries) says `s.tr` but the spoken
IPA says the whole cluster resyllabifies as one onset. This means:
(a) orthographic hyphenation and phonemic IPA are two different,
substantially disagreeing proxies for the same shape, not two
confirmations of the same signal — reinforcing ADR-0005's requirement
that the override table be sourced from "a real pronouncing dictionary,"
not either of the automated proxies used for scoping; (b) the
Background's own 41/57 number should probably be treated as an artifact
of orthographic-hyphenation's morphology bias rather than a reliable
description of speech, and re-verified before being cited further.

**Q1 — does a morphology-conditioned rule resolve `S T R`?** Tested
directly: split words into "cluster's `s` completes a recognized
Latin/Greek prefix" (`dis-`, `mis-`, `re-`, `ex-`, `sub-`, `ad-`, etc. —
21 phonemic-IPA-informative words) vs. not (82 words). If morphology
predicted the phonetic split, the prefix group should skew heavily one
way. It doesn't: prefix group is 10/21 (48%) whole-onset vs. 8/21 (38%)
`s.tr`; no-prefix group is 40/82 (49%) whole-onset vs. 22/82 (27%)
`s.tr` — both groups skew the same direction, at similar magnitude, and
individual near-identical-shaped words split oppositely within the
prefix group itself (`distract`/`distributed` → whole-onset;
`distraction`/`distrust`/`mistress` → `s.tr`). **A morphology-boundary
feature does not cleanly predict the phonetic split for `S T R`** — no
evidence a hand-written context-sensitive rule using this feature would
outperform a per-word table. Stress-conditioning and preceding-vowel
conditioning (also proposed in the dispatch) were not reached this
session; if pursued later, apply the same phonemic-IPA-proxy method
above rather than the orthographic-hyphenation proxy, given the
morphology-bias finding here.

**Q2/Q3 — net recommendation (hybrid).** The evidence supports narrowing
ADR-0005's override table, not replacing it:

- `N CH`, `K S T`, `N S P`: drop from the override table's scope; trust
  the existing MOP + `legal-onsets` algorithmic default (84-85%/85%/69%
  phonemic-majority match, comparable to shapes never flagged as
  ambiguous).
- `N D R`: keep in the override table as decided, but note the
  algorithmic default alone already gets ~59% of cases right (not a
  coin flip) — lower priority to populate than `S T R`.
- `S T R`: keep in the override table as decided — this is the one shape
  where neither "trust the default" (47%) nor "flip to `s.tr`" (31%)
  clears even a bare majority, and the two candidate proxies disagree
  with each other on the direction in ~43% of overlapping cases. No
  static shape-level rule (default or flipped) is defensible here; only
  a per-word source (or synthesizing a rule from morphology, which Q1
  found doesn't hold) could beat guessing, and morphology was ruled out
  above.

This does not change ADR-0005's chosen mechanism (per-word override
table for shapes that need it) — it's evidence toward *shrinking its
scope* from 5 shapes to 2 (`S T R`, `N D R`), which the user/ADR authors
should weigh before `syllable-overrides.edn` is populated. The ADR text
itself is left untouched per investigation discipline; this is
additional evidence alongside it, not a replacement for its Decision
Outcome.
