---
status: accepted
deciders: Flash Hu
date: 2026-09-24
---

# 0016. Merge `anki/medical-word-parts.txt` into `anki/reading-room-terms.txt`

## Context and Problem Statement

The repo carried two `anki/*.txt` files: `reading-room-terms.txt` (whole-word
vocabulary, `Front\tBack\tImage\tIPA`, deck `00 Reading Room::Terms`) and
`medical-word-parts.txt` (`_etta_mology`'s classical-morpheme/INN-stem rows,
`Front\tBack[\tImage]`, deck `00 Reading Room::01 Medical Terms`). The split was
meant to track a real content difference — word parts have no 🎭 story/sound axis
(ADR-0011/0015 don't apply to them) — but in practice the two files had already
converged: `medical-word-parts.txt` picked up its own `#media-dir`/`Image` column in
the same commit that gave `reading-room-terms.txt` one, and many of its rows already
carry inline 🎭 mnemonic sentences in `Back`. The only structural difference left was
`IPA` (word parts have no pronunciation axis) and which deck/tag a row belongs to.

Maintaining two files for a difference that thin was pure overhead: two sets of
header directives to keep in sync, two `grep`-the-other-file duplicate checks
sprinkled across `update-anki-story`, `_nemo`, `/prepare-words`, and
`/new-word-card` (bug-005's root cause — a soft warning in one of those checks let
`para-` get carded in both files), and two things to remember when reading or
writing this project's Anki tooling.

## Considered Options

* **Do nothing** — keep the two files, keep the cross-file `grep` guards. Cheapest,
  but leaves the two-file bookkeeping burden and the duplicate-card failure mode
  (bug-005) in place; the near-identical schemas make the split's remaining
  justification (word parts have no story axis) weaker every time it converges
  further.
* **Merge into one deck** — single file, single Anki deck, tag distinguishes word
  parts. Simplest possible schema, but collapses two review streams (whole-word
  vocabulary vs. medical morphemes) that Flash actively wants kept separate in Anki.
* **Merge into one file, keep two decks** — single file, two Anki decks (unchanged),
  distinguished per-row via new `Deck`/`Tags` override columns. Chosen.

## Decision Outcome

Chosen option: **one file, two decks**, via two new optional columns.
`anki/reading-room-terms.txt` gains a fifth `Deck` and sixth `Tags` column
(`Front\tBack\tImage\tIPA\tDeck\tTags`); empty means "use the file header's
`#deck`/`#tags`" (every existing vocabulary row). `_etta_mology`'s word-part rows set
`Deck` = `00 Reading Room::01 Medical Terms` and `Tags` = `medical-word-parts`,
routing them to the same deck/tag they had before, from the same file as ordinary
vocabulary rows. `medical-word-parts.txt` is deleted; its 82 rows were migrated
verbatim (same `Front`/`Back`/`Image`, empty `IPA`) into `reading-room-terms.txt`
with those two columns appended. Existing rows already carded in Anki are
untouched — `anki-sync.js` only sets tags on `addNote`, never on `updateNoteFields`,
so a re-sync of a migrated row just confirms it's unchanged.

Mechanics:

* `scripts/anki-sync.js`: `parseFile` reads the optional fifth/sixth fields;
  `syncRow` resolves `deckName = row.deck || ctx.deckName` and
  `tags = row.tags ? row.tags.split(/\s+/) : ctx.tags` before querying/adding, so a
  row's own `Deck`/`Tags` fully override (not merge with) the header defaults.
  `main` calls `createDeck` for the header's deck plus every distinct row-level
  `Deck` in play, so a first-run sync still bootstraps both decks.
  `ANKI_FILE` now defaults to `reading-room-terms.txt` (the old default,
  `medical-word-parts.txt`, no longer exists).
* `update-anki-story`'s bug-005 duplicate-guard now checks the matched row's `Tags`
  column for `medical-word-parts` instead of grepping a second file — same hard
  stop, one file to check.
* `_etta_mology` / `build-word-part-anki` write straight into
  `reading-room-terms.txt` now, fixing `Deck`/`Tags`/`IPA` (`IPA` always empty — no
  sound/story axis) for every row they touch.
* `/prepare-words` and `/new-word-card`'s "already a word-part card?" check becomes
  a `grep` on `reading-room-terms.txt` anchored to the `Tags` column instead of a
  second file's mere existence-of-row.
* Regression coverage: `test/anki-sync-deck-tags-override.test.js` (new) exercises
  the override resolution and the multi-deck `createDeck` call end-to-end against a
  mock AnkiConnect.

### Positive Consequences

* One file, one header, one set of columns to reason about for every Anki row this
  project writes
* The bug-005 duplicate-card failure mode is structurally harder to hit — there's
  only one place to look up "does this word already have a row"
* Word-part rows can now carry an `Image` the same way vocabulary rows do (they
  already could in practice; this just makes it uniform instead of file-specific)

### Negative Consequences

* `anki-sync.js`'s per-row model is slightly more complex — two more columns, and a
  row's deck/tags are no longer a pure function of the file's header alone
* The file mixes two `Back` shapes under one schema: a plain story sentence for
  vocabulary rows vs. `_etta_mology`'s `<i>Origin</i><br>meaning<br><span
  class="examples">…</span>` HTML for word-part rows — ADR-0011's "the story is the
  whole `Back`" principle only holds for the untagged rows now, which a reader of
  the file has to already know
* A manual **File → Import** into Anki (the legacy path in
  `build-word-part-anki/medical-word-parts-template.md`) now imports both kinds of
  row from one file, relying on Anki's own per-row `Deck` column mapping to route
  word-part rows correctly — untested against the routine `anki-sync.js`
  (AnkiConnect) path this project actually uses

## Links

* Fixes the duplicate-card failure mode from
  [bug-005](../user-stories/bug-005-anki-sync-cross-deck-duplicate-front.md)
* Builds on [ADR-0011](0011-reading-room-card-is-story-only.md),
  [ADR-0012](0012-reading-room-card-carries-an-optional-mnemonic-image.md), and
  [ADR-0015](0015-reading-room-card-carries-an-optional-ipa-column.md)
* [scripts/anki-sync.js](../../scripts/anki-sync.js)
* [.claude/rules/word-workflow.md](../../.claude/rules/word-workflow.md)
* [.claude/rules/scripts.md](../../.claude/rules/scripts.md)
* [.claude/skills/build-word-part-anki/SKILL.md](../../.claude/skills/build-word-part-anki/SKILL.md)
* [.claude/skills/update-anki-story/SKILL.md](../../.claude/skills/update-anki-story/SKILL.md)
* [.claude/agents/_etta_mology.md](../../.claude/agents/_etta_mology.md)
