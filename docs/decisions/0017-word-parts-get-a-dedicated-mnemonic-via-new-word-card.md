---
status: accepted
deciders: Flash Hu
date: 2026-09-26
---

# 0017. A word part can get its own dedicated sound/story mnemonic via `/new-word-card`

## Context and Problem Statement

ADR-0016 still described word parts as having "no 🎭 story/sound axis" while noting,
in the same paragraph, that many `medical-word-parts` rows already carry inline 🎭
mnemonic sentences in `Back` — `build-word-part-anki`'s `SKILL.md` documents the
format (`🎭 sentence<hr><i>Origin</i>...`) but frames it as a rare, hand-added
exception ("most word parts have no story axis at all... add a mnemonic section only
when one already exists for that part"). There was no path that *deliberately*
produced one: `/new-word-card` hard-stopped the moment a word classified as a word
part or already had a `medical-word-parts` row, routing it to `_etta_mology` only —
an agent that decomposes and cards origin/meaning/examples but never builds a
sound/story mnemonic.

That gap stops mattering for an arbitrary word part, but a handful of parts are
foundational — reused across dozens of downstream words (`val-` as in *valor,
value, valid, prevail, invalid, ambivalent*) — and are worth the same investment
as a whole vocabulary word: a real pronunciation anchor and a story that makes the
part itself stick, not just its origin/meaning gloss.

## Considered Options

* **Do nothing** — keep routing every word part to `_etta_mology` only; a
  word-part mnemonic stays a rare thing added by hand, off the standard pipeline.
* **Give word parts their own new command/agent** for the mnemonic pipeline,
  parallel to `/new-word-card`. Duplicates nearly all of steps 2–6 of the existing
  pipeline (explain → `_nemo` brainstorm → human pick → save+log → `_vivian`
  illustrate) for a difference that's really just "what does the definition come
  from and where does the story get written." Rejected as needless duplication.
* **Extend `/new-word-card` with a word-part branch.** Same four-step human-gated
  pipeline, but: the "definition" step reads (or first creates, via
  `_etta_mology`) the part's `medical-word-parts` row instead of running
  `english-word-explainer`; the save step writes the picked sentence into that
  row's `Back` using `build-word-part-anki`'s existing `🎭 sentence<hr>...` format
  instead of `update-anki-story`'s plain-story `Back` (which still hard-refuses
  `medical-word-parts` rows — unchanged, since it writes a different `Back` shape
  entirely); `_logan` logs the part to `data/mnemonics/log.jsonl` the same as any
  whole word (already anticipated by `word-workflow.md` step 4's note). Chosen.

## Decision Outcome

Chosen option: **extend `/new-word-card`**. A word part is no longer a hard stop —
it's a variant target through the same pipeline:

1. Existing-work check now also treats "already has a `medical-word-parts` row" as
   a valid, continuable state (not just a duplicate-card trap) — `/new-word-card`
   proceeds against that row instead of refusing.
2. If the part isn't carded yet, `/new-word-card` dispatches `_etta_mology` (or
   runs the underlying decomposition + `build-word-part-anki` skills directly)
   first, to get the origin/meaning/examples row the mnemonic step needs as its
   "definition." Bound morphemes have no standalone usage sentence, so the row's
   own example words stand in for that context when briefing `_nemo`.
3. `_nemo` is told explicitly the target is a bound morpheme, not a free word, so
   candidates evoke the part's example words for meaning rather than inventing a
   free-standing sense for it.
4. The save step, for a word part, edits `anki/reading-room-terms.txt` directly —
   prepending `🎭 <picked sentence><hr>` ahead of the existing
   `<i>Origin</i><br>meaning<br><span class="examples">...</span>` block, replacing
   any prior hand-added mnemonic line(s) rather than accumulating them, since this
   is now a deliberate, single picked story — then re-syncs and logs via `_logan`
   exactly as a whole-word save does. `update-anki-story`'s own hard stop for
   `medical-word-parts` rows is untouched: it still refuses, because it writes the
   plain-story `Back` shape that only applies to ordinary vocabulary rows; the
   word-part branch never calls it.
5. `_vivian`/crop/Image-column steps are unchanged — they already work on any row
   in `reading-room-terms.txt` regardless of which kind it is.

This does not change `_etta_mology`'s own behavior — she still never produces a
sound/story axis herself; the mnemonic is a separate, opt-in layer added on top by
`/new-word-card`, only when a human decides a given part is worth it.

### Positive Consequences

* Foundational parts (reused across many downstream words) can get a real
  pronunciation anchor + story, not just an origin/meaning gloss.
* No new agent or command — reuses `_nemo`/`_logan`/`_vivian` and the existing
  `build-word-part-anki` `Back` format verbatim.
* `update-anki-story`'s existing duplicate-card guard (bug-005 / the `para-`
  incident) is untouched — the word-part branch never routes through it.

### Negative Consequences

* `/new-word-card` now carries a branch (word vs. word part) instead of a single
  straight-line pipeline, adding a small amount of read complexity to that command.
* The `🎭 sentence<hr>...` format now has two producers (a rare hand-added edit, and
  this deliberate pipeline) that must stay compatible — a future format change to
  one has to be checked against the other.

## Links

* [ADR-0016](0016-merge-medical-word-parts-into-reading-room-terms.md) (the row
  format this decision writes into)
* [.claude/commands/new-word-card.md](../../.claude/commands/new-word-card.md)
* [.claude/skills/build-word-part-anki/SKILL.md](../../.claude/skills/build-word-part-anki/SKILL.md)
* [.claude/skills/update-anki-story/SKILL.md](../../.claude/skills/update-anki-story/SKILL.md)
* [.claude/rules/word-workflow.md](../../.claude/rules/word-workflow.md)
