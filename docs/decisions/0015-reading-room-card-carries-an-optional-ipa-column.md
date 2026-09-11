---
status: accepted
deciders: Flash Hu
date: 2026-09-11
---

# 0015. The reading-room Anki card carries an optional IPA column

## Context and Problem Statement

ADR-0011 fixed the `Back` field to just the 🎭 story sentence — no `say:`/`def:`,
no `🔊`/`📖` axes, nothing but the story. That's deliberate: the story is supposed to
let the reviewer reconstruct the word's sound from anchors baked into the sentence.
In practice, Flash found the sentence alone under-specifies stress — a sound anchor
can nail the segments of a syllable without telling you which syllable of the *word*
carries the stress, and that's exactly the piece that's hardest to guess back
correctly on review.

The stress-marked transcription already exists: `_logan`'s `syllabification` field
(`data/mnemonics/log.jsonl`, e.g. `["ˈɑm","ə","nəs"]` for *ominous*) captures it for
every logged word, one syllable per array element with the stressed one marked. It's
just never surfaced back onto the card.

## Considered Options

* **Do nothing** — keep pronunciation entirely as build-time scaffolding, matching
  ADR-0011's principle that the Back is the story and nothing else. Leaves the
  stress-recall gap unresolved.
* **Put the IPA on the `Front` instead of `Back`.** Rejected — showing the answer
  before the recall attempt defeats the exercise; the story is supposed to be
  reconstructed from anchors first.
* **Add a fourth `IPA` column, composed onto `Back` at sync time** — same shape as
  ADR-0012's `Image` column. The `.txt` file's `Back` field itself stays plain-text
  story; `anki-sync.js` appends a small muted `/ipa/` line last, when building the
  field it actually pushes to Anki.

## Decision Outcome

Chosen option: **the fourth `IPA` column**, composed onto `Back` last, after the
image and the story. This reaches the goal (the transcription is visible on review,
after the recall attempt, with correct stress) without touching ADR-0011's "the story
is the card" principle for the `.txt` file's own `Back` column — the IPA is sync-time
composition, never text baked into the story.

Mechanics:

* Header gains `#columns:Front\tBack\tImage\tIPA`.
* `IPA` is a plain string, syllables dot-separated, stress marked (e.g.
  `ˈɑm.ə.nəs`) — or empty. It's the word's `syllabification` array (already
  collected in word-workflow.md step 3, alongside the story candidates, for
  `_logan`) joined with `.`, so it's never re-derived by hand; `update-anki-story`
  fills it from the same fields it's about to hand `_logan`.
* `anki-sync.js`: `parseFile` reads the optional fourth field; `composeBack` now
  assembles the pushed `Back` in review order — `<img>` (if attached), then the
  story, then `<small style="opacity:0.6">/<ipa>/</small>` (if given) — joined with
  `<br>`, each piece skipped when absent. This also flips ADR-0012's original
  story-then-image order to image-then-story (see the note added to ADR-0012), so
  the image reads first and the IPA reads last, right after the story it confirms.
  The idempotency check compares against the *composed* Back, same as the image.
* Backfilled the ~41 already-logged words' `IPA` column from their existing
  `syllabification` rows in `data/mnemonics/log.jsonl`; the other ~230 carded words
  (no log row yet) get an empty `IPA` column.
* `medical-word-parts.txt` is unaffected — no `IPA` column, no sound/story axis for
  those words.

### Positive Consequences

* Stress is recoverable on review without needing to remember it or re-derive it from
  the story's anchors alone
* Reuses data that already exists (`_logan`'s `syllabification`) — no new authoring
  step, no schema change to `log.jsonl`
* `Back`'s `.txt` value stays plain-text story, matching ADR-0011/ADR-0012's pattern

### Negative Consequences

* The card `Back` field in Anki now composes two independent transcluded pieces
  (image + IPA) on top of the story — slightly more moving parts at sync time
* `IPA` is a display-only derivative of `log.jsonl`'s `syllabification` — the two can
  drift if one is edited without the other; nothing enforces they match
* One more column to keep filled correctly on new saves; most of the back-catalog
  (~230 words) has it empty until logged

## Links

* Builds on [ADR-0011](0011-reading-room-card-is-story-only.md) and
  [ADR-0012](0012-reading-room-card-carries-an-optional-mnemonic-image.md)
* [scripts/anki-sync.js](../../scripts/anki-sync.js)
* [.claude/rules/word-workflow.md](../../.claude/rules/word-workflow.md)
* [.claude/skills/update-anki-story/SKILL.md](../../.claude/skills/update-anki-story/SKILL.md)
