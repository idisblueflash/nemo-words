---
title: "US-016 investigation: kaikki dialect-tag gating fix against real data"
status: resolved
story: "[US-016](../user-stories/US-016.md)"
related_issue: "[issue-001-kaikki-dict-missing-common-words](../issues/issue-001-kaikki-dict-missing-common-words.md)"
investigated: 2026-08-23
---

## Investigation findings (2026-08-23)

Verified against the local `resources/data/kaikki-en.jsonl` (1,487,639
lines, full file, not a sample), by implementing the *current* shipped
`pickDialectIpas` and the *proposed* fixed version (gate `hasAnyRegionalTag`
and per-dialect candidates on `s.ipa` truthiness, per the Protocol's own
wording) side by side and diffing their word-level output over every
plain-word entry that has a `sounds` array (121,333 unique lowercased
words).

**Headline: old-dropped 58,439 words → new-dropped 38,705 words, i.e.
19,734 words (33.8% of the old drop set) recovered by exactly the fix
described in the Protocol.** This is a materially larger and different
number than issue-001's own hand-counted 45/188 sample, but confirms the
same direction and mechanism.

**AC1 (audio-only regional entries shouldn't block untagged fallback) —
holds, and dominates.** 34,119 raw kaikki entries (across all senses, before
word-level dedup) are old-dropped specifically because their only
region-tagged `sounds` objects lack `ipa` (audio metadata only) while an
untagged real-`ipa` entry exists — e.g. `thesaurus`, `GDP`, `pies`, `livre`.
Spot-checked issue-001's own missing-word list directly: `ship`, `the`,
`tree`, `sick`, `bridge`, `busy`, `neck`, `shelf`, `badge`, `scalp` are all
recovered by the fix. Two words from that list, **`myth` and `cancel`, are
also recovered — contradicting issue-001's claim that they're a "genuine
no-GA/RP-data" case needing Option 3 supplementation.** `cancel`'s only
tagged `sounds` entry is an audio-only `Australia` tag; `myth`'s is an
audio-only `US` tag plus a `South-Asia`-tagged real ipa entry that
`REGIONAL_TAG_RE` doesn't recognize as regional at all (see gap below) — in
both cases the untagged real ipa becomes available once audio-only noise
(and, for `myth`, an unrecognized tag) stops blocking the fallback. This
means **Option 3 (cmudict/wikipron supplementation) is very likely
unnecessary once this story lands** — worth re-checking against the full
missing-word list after the fix ships, before spending effort on it.

**AC2 (real dialect-tagged ipa should win over untagged fallback) — holds
and matters in practice, not just in theory.** 4,717 raw entries have both
an untagged real ipa and a General-American-tagged real ipa; only 121
(2.6%) are identical strings, the other 4,596 (97.4%) genuinely differ
(e.g. `word` untagged `/wɛːd/` vs GA `/wɜɹd/`; `book` untagged `/buːk/` vs
GA `/bʊk/`; `pound` untagged `/ˈpæʊ̯nd/` vs GA `/ˈpaʊ̯nd/`) — these are
real rhotic/vowel differences, not placeholder duplicates, so AC2's "still
wins" requirement is not a corner case, it's the norm whenever both are
present.

**AC3 (words with only other-region real ipa, no untagged, should stay
dropped) — holds.** 7,880 raw entries fit this shape cleanly (e.g.
`multiculturalism` UK-tagged, `abacinate` UK-tagged, `one` Singapore-tagged)
and remain correctly dropped under both old and new logic. Confirmed the
AC's own example accents (Canada/Southern-US) are real but a minority
flavor of this case — the dominant "other region" tag in practice is
plain `UK` (bare, not `RP`/`Received-Pronunciation`), which is an existing,
deliberate scope line from FEAT-001/issue-001, not a new finding.

**New edge case the ACs don't cover: real dialectal noise from a THIRD
region can still block recovery even when AC1's exact shape (untagged +
audio-only-tagged) is also present.** 1,384 raw entries (aggregating to
several dozen distinct words, incl. `month`, `Monday`, `Sunday`, `Sunday`,
`patronage`) have an untagged real ipa *and* audio-only GA/RP noise *and* a
genuinely different real-ipa entry tagged with some other region (e.g.
`month`: untagged `/mʌnθ/`, audio-only RP/GA tags, plus a real
`Ireland`-tagged `/mʊnt̪/`). Under the Protocol's stated fix (gate on
`s.ipa` presence, not tag presence), that Ireland entry still counts as a
real regional tag, so `hasAnyRegionalTag` stays true and the untagged
fallback stays blocked — `month`/`Monday`/`Sunday` remain dropped even
after the fix, despite superficially matching AC1's setup. This is
arguably correct behavior (there IS real dialectal variation, so an
"any-dialect" neutral fallback would be wrong), but the story's Protocol
prose doesn't call it out, and if `_teddy` tests only against AC1's
literal two-entries example this case will look untested. Recommend adding
a fourth scenario or at least a Protocol note: "an untagged fallback is
still blocked by any *other* real-ipa regional entry, not just a would-be
GA/RP one."

**Tag-list completeness gap (affects correctness of the fix, not just
coverage).** Of 175,748 ipa-bearing tagged `sounds` entries, 17,970
(10.2%) carry at least one tag that `REGIONAL_TAG_RE` doesn't recognize as
regional at all — common ones: `South-Asia` (1,281), `Northern-Ireland`
(891), `Southern-US` (323), `Atlantic-Canada` (357),
`General-South-African` (322), `Philippines` (613), `Multicultural-London-
English` (273), `New-York-City` (220), `Hong-Kong` (141), `California`
(104), `Malaysia` (101), `Pakistan` (82). Because the rewritten
`hasAnyRegionalTag` (correctly, per the fix) only looks at entries that
*have* `ipa` — real dialectal entries tagged with these unrecognized
strings will silently fail to block the untagged fallback, same failure
mode as `myth` above. This is a pre-existing regex-completeness issue
(exists in the old code too), but the fix increases how often the fallback
path fires, so it will be exercised ~3x more (34K+ vs previously blocked
paths) and this gap becomes more consequential than before. Recommend
`_teddy` at least note this as a known limitation, if not expand the
regional-tag list.

**Separate, unrelated coverage gap noticed while sampling (flagging, not
in scope for AC1-3): RP-equivalent data hiding under a newer 3-tag
convention.** 2,823 ipa-bearing entries carry the exact tag combo
`["British", "Southern", "Standard"]` — Wiktionary's newer name for the
Standard Southern British / RP accent — and 224 of those have *no*
separate `RP`/`Received-Pronunciation`-tagged entry for the same word
(e.g. `thesaurus`, `because`, `absolute`, `counterfeit`, `Wales`), so
`RP_RE` currently misses real RP-equivalent ipa data kaikki already has
for those words. This is orthogonal to the audio-only bug this story
fixes and not mentioned in any AC — worth a follow-up ticket, not a
blocker for this one.

**Other `sounds`-array shapes checked, none broke the ACs' assumptions:**
- Entries with a single `ipa` tagged with *multiple* regions at once (e.g.
  `["General-American", "Received-Pronunciation"]` on one `trade` entry)
  occur 31,410 times; the existing `s.tags.some(t => tagRe.test(t))` check
  already handles this correctly (counts toward both dialects).
- `tags: []` (empty array) on an ipa-bearing entry: 0 occurrences — not a
  real shape in this dump, no need to special-case it.
- `ipa: ""` (empty string) on any entry: 0 occurrences.
- 243,208 `sounds` objects have no `ipa` field at all (audio/rhymes/enpr/
  homophone/note-only entries) — this is the dominant shape overall, not
  an edge case; any reimplementation should expect most `sounds` array
  elements to carry no `ipa`.
- 13,731 words have *more than one* distinct untagged real-ipa candidate
  in the same `sounds` array (e.g. `month`'s untagged `/mʌnθ/` vs. a
  separate note-tagged `/mʊnt/`). `pickBroadest`'s existing
  first-broad-wins tiebreak already handles this the same way it does
  today; since the fallback path fires far more often post-fix, this
  ambiguity will be hit more, but the tiebreak logic itself doesn't need
  to change for this story.

**Decision (post-investigation):** rather than leaving the third-region
case (`month`/`Monday`/`Sunday`/etc., Ireland-tagged) dropped as
"arguably correct", the story now treats British-Isles-adjacent tags
(`Ireland`, `Northern-Ireland`, and the newer `["British","Southern",
"Standard"]` combo) as RP candidates rather than blocking regions — see
US-016's Protocol and the two additional gherkin scenarios it added as a
result of this investigation.

**Recommendation:** AC1-AC3 as written hold against real data and the
proposed Protocol fix (gate on `s.ipa` presence) implements them
correctly. Before `_teddy` starts, consider: (1) adding a 4th
gherkin scenario for the "blocked by a genuinely different real-region
entry" case identified above, since it's easy to get subtly wrong if
implemented as "does ANY OTHER dialect column have a real value" instead
of "does any OTHER entry with ipa carry a regional tag"; (2) re-running
issue-001's Option-3-supplementation question after this lands, since
`cancel` and `myth` (issue-001's own examples for why supplementation was
needed) turn out to be fixed by Option 1 alone.

## Cross-dictionary agreement PoC against the Wells table (2026-08-23)

Separate, informal PoC (not the code path this story ships, no test
suite — plain scratch scripts run against FEAT-001's 27-row Wells table
and its original example-word lists), done to sanity-check the untagged-
fallback fix's value and see how the other local dicts under
`resources/data/` compare as an RP/GA source. Method: for each Wells row,
look up every example word in a dict, check whether its transcription
contains the row's claimed RP and/or GA symbol; **coverage** = words
found / words attempted, **agreement** = matches / checks among found
words, **composite** = coverage × agreement.

| Dict | Coverage | Agreement | Composite |
|---|---|---|---|
| `en_US_RP_ipa.tsv`-style tagged-only extraction (current shipped script) | 98.1% | 66.6% | 65.3% |
| Same raw `kaikki-en.jsonl`, with untagged-IPA fallback for both columns | 98.1% | 89.7% | **88.0%** |
| `en_UK.txt` (RP only) | 96.8% | 85.2% | 82.5% |
| `en_US.txt` (GA only) | 98.1% | 84.1% | 82.5% |
| `wikipron_us_broad.tsv` (GA only) | 97.4% | 85.3% | 83.1% |
| `cmudict.dict` (GA only, ARPAbet) | 98.1% | 100.0%\* | 98.1%\* |
| BEEP (downloaded, RP, not in this repo) + `cmudict.dict` (GA) | 100.0% | 100.0%\* | 100.0%\* |

\* CMUdict's ARPAbet inventory can't distinguish some Wells-set pairs at
all (STRUT/commA and NURSE/lettER collapse to the same phoneme, split
only by stress digit) — its perfect score reflects that this particular
155-word list doesn't happen to expose that collision, not that the
ambiguity is gone. Treat the CMUdict-involving rows as an upper bound,
not a clean win.

**This directly corroborates the fix's direction and size**: applying
just the untagged-fallback logic to raw Kaikki jumps composite agreement
from 65.3% (current shipped extraction) to 88.0% — a bigger relative
gain than switching to any of the single-accent alternative dicts
(`en_US.txt`/`en_UK.txt`/`wikipron_us_broad.tsv`, all ~82-83%), and
already close to CMUdict's inflated ceiling. Reinforces the
recommendation above that Option 3 (cmudict/wikipron supplementation) is
unlikely to be worth doing once this story lands — the untagged-fallback
fix alone captures most of the available gain.

**BEEP+CMUdict's 100% is a useful reference ceiling, not a recommended
source swap**: BEEP (Cambridge's RP counterpart to CMUdict, ARPAbet-like,
`https://openslr.org/14/`) was purpose-built with dedicated phonemes for
exactly the RP/GA distinctions Wells' sets need (separate `oh`/`ao` for
LOT-CLOTH vs. THOUGHT-NORTH-FORCE, separate `ah`/`ax` for STRUT vs.
commA, dedicated `ia`/`ea`/`ua` diphthongs for NEAR/SQUARE/CURE) and,
being non-rhotic RP, never hits the composed-vs-decomposed r-colored-
vowel notation problem that affects Kaikki, `en_US_RP_ipa.tsv`, and
WikiPron. It is **not** a candidate replacement for Kaikki in this
pipeline: it's research-only/non-commercial licensed (Oxford/MRC-derived,
via OpenSLR resource 14), ARPAbet-style rather than IPA (would need
translation to stay consistent with `lexical-sets.edn`), and was only
downloaded to a scratch directory for this comparison, not added to
`resources/data/`.
