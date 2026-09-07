---
status: accepted
deciders: Flash Hu
date: 2026-08-28
---

# 0004. Require two-source agreement for GA/RP cross-ref backfill in ga_rp.tsv (US-026)

Technical Story: [US-026](../user-stories/US-026.md)

## Context and Problem Statement

`resources/data/ga_rp.tsv` has a large gap of missing GA/RP cells.
US-026's cross-ref backfill plan fills a missing cell from other dicts
already in `resources/data/` (`wikipron-us`, `wikipron-uk`, `en-uk`;
`kaikki-us`/`kaikki-rp` were considered but dropped as a source — the
Wiktionary dump they'd come from isn't committed to the repo and isn't
reliably available). The original selection rule filled a cell from a
single covering source when no other source disagreed with it. Sampling
in `US-026-investigation.md` found that `wikipron_uk_broad.tsv` contains
a handful of noisy/low-confidence entries (e.g. "lue", "wor", "utz",
"resh", "comly") for words that are genuine cmudict/beep headwords
already present in `ga_rp.tsv`. A single-source fill has no second
source to catch a bad transcription for cases like these.

## Considered Options

* Keep single-source fills, add a separate plausibility filter for
  wikipron's crowd-sourced noise
* Require at least two covering sources to agree before filling a cell;
  a lone covering source leaves the cell empty

## Decision Outcome

Chosen option: "Require at least two covering sources to agree before
filling a cell", because the two-source agreement check already doubles
as a noise filter for exactly the failure mode observed in sampling,
without needing to build and maintain a separate plausibility filter.

### Positive Consequences

* No separate plausibility/noise filter needed for wikipron's
  crowd-sourced entries — agreement-checking already screens them out.
* Fewer wrong pronunciations silently land in `ga_rp.tsv` from a single
  bad source.

### Negative Consequences

* Shrinks the addressable backfill slice well below the originally
  estimated ~6.9% (15,631/226,140 cells). With `kaikki-us`/`kaikki-rp`
  dropped, GA has only **one** candidate cross-ref source
  (`wikipron-us`), which can never satisfy a two-source rule alone — so
  **GA backfill is out of scope for US-026 entirely**, not merely
  reduced. RP keeps two candidate sources (`en-uk`, `wikipron-uk`), so
  RP-only backfill on agreement is what this story actually does.

## Links

* Supersedes the single-source-fill rule previously written into
  [US-026.md](../user-stories/US-026.md)'s Decisions/Protocol/Acceptance
  Criteria (now updated in place to require two-source agreement).
