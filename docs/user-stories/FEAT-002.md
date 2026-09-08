# FEAT-002. Build the CMUdict (GA) + BEEP (RP) pronunciation dictionary

## Background

[ADR-0002](../decisions/0002-switch-cmudict-beep-primary-dictionary.md) chose CMUdict (GA) + BEEP (RP) over Kaikki as the project's
primary pronunciation dictionary — 92.9% composite agreement against the
Lexical Sets Table (100% coverage) vs. Kaikki's post-US-016 58.7%, per
[investigation-001-lexical-sets-dictionary-comparison](../investigations/investigation-001-lexical-sets-dictionary-comparison.md).
[0003-match-nucleus-against-arpabet-mrpa-tokens](../decisions/0003-match-nucleus-against-arpabet-mrpa-tokens.md) then decided the
on-disk format: raw ARPABET/MRPA phoneme tokens in a single file
(`resources/data/ga_rp.tsv`), not pre-translated IPA — nucleus/lexical-
set matching should compare discrete phoneme tokens directly (no rhotic-
ligature decomposition needed), and IPA becomes a derived, presentational
format rather than a second file to build and keep in sync.

This feature is the "do it for real" follow-through neither ADR's PoC
covered — building the actual `ga_rp.tsv` file every downstream story
reads, plus the conversion functions its display path needs. It was
originally drafted as a single story (US-017), then split into five for
parallel implementation once the build/read-path/conversion boundaries
became clear:

- **[US-017](US-017.md)** and **[US-018](US-018.md)** are independent brand-parsing
  additions to `nemo-words.ipa` — `:cmudict-raw` (raw ARPABET tokens from
  CMUdict) and `:beep-raw` (raw MRPA tokens from BEEP), respectively.
  Different source files, no shared state; buildable in parallel.
- **[US-020](US-020.md)** and **[US-021](US-021.md)** are independent, file-I/O-free
  conversion-function additions — bidirectional ARPABET↔IPA and
  MRPA↔IPA, respectively. Also buildable in parallel, and in parallel
  with US-017/US-018.
- **[US-019](US-019.md)** is the union point: it depends on US-017 and US-018 both
  landing, and builds `resources/data/ga_rp.tsv` plus the renamed raw-
  token loader (`load-ga-rp-dict`). It does not depend on US-020/US-021
  for its own ACs (build + load only assert raw tokens, no IPA), but the
  end-to-end display path (loading the file, then rendering IPA) needs
  all of US-017/US-018/US-019/US-020/US-021 together.
- **[US-022](US-022.md)** is the closing piece, not optional cleanup: US-019
  renaming `load-rp-ga-dict` to `load-ga-rp-dict` and swapping its
  output from `{:rp :ga}` (IPA) to `{:ga-tokens :rp-tokens}` (raw
  tokens) breaks every existing caller of `lookup-rows`/`word-matches?`
  — including `populate-lexical-sets` — unless this story lands too.
  Depends on US-019, US-020, and US-021 all landing first.
- **[US-023](US-023.md)** is the display-side counterpart, optional but real: once
  US-019/US-022 land, the `ipa-lookup` CLI subcommand would otherwise
  regress from showing IPA to showing raw ARPABET/MRPA tokens. Wires
  US-020/US-021's conversion functions into that subcommand's output.
  Depends on US-019, US-020, US-021, and US-022 (lands last — touches the
  same `core.clj` subcommand US-022 edits).

**Revision history**: what's now US-017 originally specified writing
pre-translated IPA to `ga_rp_ipa.tsv` (itself a rename of the Kaikki-era
`en_US_RP_ipa.tsv`, referenced in [FEAT-001](FEAT-001.md)'s "Why Kaikki" section).
[0003-match-nucleus-against-arpabet-mrpa-tokens](../decisions/0003-match-nucleus-against-arpabet-mrpa-tokens.md) changed that to
raw-token storage with IPA moved to the read path; the story was then
split first into a/b/c, then further into five (US-017/018/019/020/021)
once the token↔IPA conversion logic was recognized as its own
independent, parallelizable unit of work.

## Must have

- [x] [US-017](US-017.md) Add a `:cmudict-raw` brand for raw ARPABET token parsing
- [x] [US-018](US-018.md) Add a `:beep-raw` brand for raw MRPA token parsing
- [x] [US-019](US-019.md) Build `ga_rp.tsv` and rename the raw-token loader (depends on US-017 + US-018)
- [x] [US-020](US-020.md) Bidirectional ARPABET ↔ IPA conversion
- [x] [US-021](US-021.md) Bidirectional MRPA ↔ IPA conversion
- [x] [US-022](US-022.md) Migrate `lookup-rows`/`word-matches?` to token-based matching (depends on US-019 + US-020 + US-021)
- [x] [US-023](US-023.md) Display IPA in the `ipa-lookup` CLI subcommand (depends on US-019 + US-020 + US-021 + US-022)

## Follow-up (out of scope in the stories above, tracked separately)

- Re-run `clojure -M -m nemo-words.core populate-lexical-sets` against
  `resources/data/ga_rp.tsv` (same follow-up US-016 flagged) and
  re-check whether [US-015](US-015.md)'s `lexical-sets-table` needs any
  re-seeding, given the dictionary underneath it has changed sources and
  format entirely. **Done (2026-08-26)**: the re-run surfaced two real
  bugs, both filed and fixed — [bug-003](bug-003-mrpa-vowel-mapping-shift.md) (BEEP's
  `oh`/`ao`/`ow`/`aw` MRPA table was shifted/missing an entry) and
  [bug-004](bug-004-lookup-rows-word-case-sensitive.md) (case-sensitive word lookup dropped
  capitalized seed words like "Boston"/"Chelsea"). What's left after both
  fixes — `poor`/`scampi`/`catalpa`'s genuine data-limitation drops plus
  `lettER`'s composed-vs-decomposed GA target — is scoped as
  [US-024](US-024.md).
- A concretely-scoped story to translate the Lexical Sets Table's
  IPA-authored targets into ARPABET/MRPA nucleus tokens directly (rather
  than converting per query at lookup time, as [US-022](US-022.md) does), if
  per-query conversion proves too slow in practice.

