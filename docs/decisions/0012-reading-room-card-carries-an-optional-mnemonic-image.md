---
status: accepted
deciders: Flash Hu
date: 2026-09-09
---

# 0012. The reading-room Anki card carries an optional mnemonic image, via an Image column

## Context and Problem Statement

ADR-0011 reduced each `anki/reading-room-terms.txt` card to a story-only `Back` —
plain text, no HTML. Separately, the repo generates mnemonic images per word
(`_vivian` / `vivian-mnemonic-images`, saved to `docs/mnemonics/images/<word>.png`),
but those assets never reach the flashcard — they only live on disk and are
gitignored. Flash wanted the mnemonic image to show on the card back alongside its
story, without giving up the properties that make the flat `.txt` file worth keeping
(version history, greppable, works with no live Anki, survives a lost collection).

The options for *where* image data lives and *how* the card gets it:

## Considered Options

* **Redirect `anki-sync.js` to read `docs/mnemonics/log.jsonl` and delete
  `reading-room-terms.txt`.** Single source of truth. But `log.jsonl` has only 61
  rows against ~269 carded words, mixes reading-room stories with `_etta_mology`
  word-part entries, and carries no deck/notetype routing — a redirect would silently
  drop ~200 cards and misroute word parts. Needs a full backfill + schema migration
  first.
* **Drop the `.txt` entirely; treat the live Anki collection as the store.** The only
  copy of ~269 hand-built mnemonics would then be an un-versioned SQLite blob on one
  machine — exactly the failure mode the `anki/*.txt` convention exists to prevent. No
  diff, no PR review, no offline write path, empty on a fresh clone.
* **Keep `reading-room-terms.txt` as the Anki card spec; add an optional third
  `Image` column and a `#media-dir:` header directive; leave `log.jsonl` untouched.**
  `anki-sync.js` uploads the named file as `nemo-<basename>` via `storeMediaFile` and
  composes `<story><br><img …>` onto the pushed `Back` at sync time. The `Back` column
  in the file stays plain-text story.

## Decision Outcome

Chosen option: **the third `Image` column**. It is the smallest change that reaches
the goal: the file stays the version-controlled source of truth, the `Back` column
stays human-readable plain-text story (ADR-0011's principle survives — the story is
still the card), and `log.jsonl` keeps its role as the rich structured record written
by `_logan`. The `<img>` HTML is a sync-time composition, never stored in the `.txt`.

Mechanics:

* Header gains `#media-dir:docs/mnemonics/images` and `#columns:Front\tBack\tImage`.
* `Image` is a bare basename (e.g. `regional.png`) or empty. Explicit, not
  convention-based: a word can be carded with no image, and a crop can be swapped by
  editing the cell.
* `anki-sync.js`: `parseFile` reads the optional third field; `composeBack` uploads
  `<media-dir>/<basename>` as `nemo-<basename>` (prefix avoids collisions in the
  shared `collection.media/` folder) and returns `story + "<br>" + <img>`. The
  idempotency check compares against the *composed* Back. A declared-but-missing image
  file is a row-level failure (logged, run continues), not a silent drop.
* `medical-word-parts.txt` has no `#media-dir` and two columns — unaffected.

### Positive Consequences

* Mnemonic images finally reach the card, where they reinforce the story at review time
* `reading-room-terms.txt` stays the single reviewable, greppable, offline source of truth
* `log.jsonl` and its `_logan` workflow are untouched — no backfill, no migration
* The `.txt` `Back` column stays plain text; HTML exists only transiently at sync

### Negative Consequences

* The card `Back` field in Anki is now HTML again (an `<img>` tag) when an image is
  attached — ADR-0011's "no HTML on the card" no longer holds, though the *file* stays plain
* Images are gitignored, so a fresh clone syncs cards with broken `<img>` until the
  images are regenerated — the story still shows
* One more column to keep filled correctly; a typo'd basename fails that row's sync
* `nemo-` prefixed files accumulate in `collection.media/` with no cleanup path for
  renamed/removed words

## Links

* Supersedes [ADR-0011](0011-reading-room-card-is-story-only.md)
* [scripts/anki-sync.js](../../scripts/anki-sync.js)
* [.claude/rules/word-workflow.md](../../.claude/rules/word-workflow.md)
* [.claude/skills/update-anki-story/SKILL.md](../../.claude/skills/update-anki-story/SKILL.md)
