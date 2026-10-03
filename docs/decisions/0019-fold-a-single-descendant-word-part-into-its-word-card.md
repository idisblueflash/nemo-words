---
status: accepted
deciders: Flash Hu
date: 2026-09-28
---

# 0019. A word-part row whose only carded descendant is one word gets folded into that word's card

## Context and Problem Statement

`omin-` and `ominous` were carded separately: `omin-` as an `_etta_mology`
word-part row (`00 Reading Room::01 Medical Terms`, tagged `medical-word-parts`,
carrying a hand-added 🎭 mnemonic plus the origin/meaning/examples block and an
`omin-.png` image), and `ominous` as an ordinary vocabulary row in
`00 Reading Room::Terms`. Both stories pivoted on the same sound anchor —
*almond* — so the two cards drilled one hook twice in two decks:

| | `ominous` | `omin-` |
|---|---|---|
| Back | `Ommen watches Venus over almond trees, warning of a storm.` | `🎭 An almond tree under a black cloud is a storm sign.<hr><i>Latin</i><br>sign, omen (from omen, ominis)<br>…e.g. ominous, abominable` |

ADR-0017's test for investing a sound/story axis in a word part is that the part
be *foundational* — "reused across dozens of downstream words (`val-` as in
valor, value, valid, prevail, invalid, ambivalent)". `omin-` yields *ominous*,
*abominable* and *omen*, and only `ominous` was carded at all (measured Google
Ngram relative frequency: `ominous` 3.25e-6, `omen` 1.40e-6, `abominable`
1.37e-6 — the whole word is more than twice as frequent as either sibling). So
the part row's entire teaching value was already contained in the word's card,
and it failed the criterion the repo had written down for itself.

Separately, `scripts/anki-sync.js` was upsert-only (findNotes →
updateNoteFields, else addNote). Removing a row from `anki/*.txt` had no effect
on the live collection, so any merge like this one left an orphaned note in
rotation that could only be cleared by hand in the Anki app.

## Considered Options

* **Keep both cards.** Zero work, but reviews the *almond* hook twice and keeps a
  medical-deck row for a general-English word that isn't medical at all.
* **Keep `omin-`, drop `ominous`.** Rejected: the part's story anchors only the
  first chunk (ˈɑm‑), whereas the word's story rebuilds the whole word
  (*Ommen* → ˈɑmən, *Venus* → ‑nəs, verified against the GA column of
  `nemo-words ipa-lookup`). *ominous* is also the form actually met in reading.
* **Fold the part into the word, and give `anki-sync.js` an explicit delete
  verb.** Chosen.
* **Give `anki-sync.js` a prune mode** (delete any note in the deck absent from
  the file) instead of a named delete. Rejected as far too blunt: the file is not
  the whole truth about these decks, so a prune would silently destroy anything
  added directly in Anki.

## Decision Outcome

Chosen option: **fold the part row into the word's card, and make the removal a
first-class, guarded operation.**

The general rule this sets: **a `medical-word-parts` row whose only carded
descendant is the single word it was extracted from is redundant — delete the
part row and move its assets onto the word's card.** A part keeps its own row
when it has (or is expected to have) multiple carded descendants, per ADR-0017.

Applied to `omin-`:

1. Row 386 (`omin-`) deleted from `anki/reading-room-terms.txt`.
2. `images/mnemonic/omin-.png` renamed to `ominous.png` and set as the `ominous`
   row's `Image` — the almond-tree-under-a-black-cloud scene illustrates the
   storm-warning story directly.
3. The `ominous` row's empty `IPA` filled with `ˈɑm.ə.nəs` (GA, from
   `nemo-words ipa-lookup`; the log's `ˈɒm` was the RP vowel, against this
   repo's US-American rule in `word-workflow.md` step 2).
4. `data/mnemonics/log.jsonl`'s `omin-` row retargeted to `ominous`. It had
   always been half-pretending to be the word — its `syllabification` was
   already the *whole word's* — and the surviving story was never logged at all,
   so the row now records that story (`anchor_unit: whole-word`, `technique:
   ["chunked-sound-anchor", "scene-depicts-meaning"]`, pivots
   *Ommen/Venus/almond/warning/storm*), with the Latin origin preserved in
   `sense`.
5. `scripts/anki-sync.js` gained `--delete <front> [--deck <deck>]`: it names one
   Front on the command line, **refuses if that Front is still a row in the
   file** (so it can only ever remove something already un-carded), searches the
   header deck plus every row-level `Deck` override when no `--deck` is given,
   reports each note removed and its deck, and treats "already absent" as
   success. Six tests in `test/anki-sync-delete.test.js` cover it, the guard
   included. `scripts/anki-sync-terms.sh` forwards the flag.

### Positive Consequences

* One card per hook — the *almond* anchor is drilled once, on the form that
  actually appears in reading, now with the image, IPA and gloss the part row
  couldn't carry (word-part rows have no `IPA`/`Gloss`, ADR-0018).
* A general-English word stops occupying the medical-terms deck.
* The upsert-only asymmetry is fixed: removing a row from the file now has a
  supported path to the live collection, for this merge and every future one.
* `log.jsonl` gains a real `ominous` row where it had a mislabelled `omin-` one.

### Negative Consequences

* **The Latin origin (`omen, ominis`) is no longer on the card.** ADR-0018 caps
  `Gloss` at one plain-English clause and explicitly bars etymology, and the
  plain-story `Back` shape has no room for the `<i>Origin</i>` block — so the
  origin now lives only in `log.jsonl`'s `sense`. Accepted: the card's job is
  recall of sound + meaning, not etymology.
* If `abominable` or `omen` is ever carded, the shared root has no card of its
  own to hang off, and re-extracting `omin-` means re-running `_etta_mology`.
* `--delete` is a genuinely destructive verb against the live collection (a
  note's review history goes with it). The file guard and the explicit named
  Front are the whole of its safety; there is no dry-run.

## Links

* [ADR-0017](0017-word-parts-get-a-dedicated-mnemonic-via-new-word-card.md) (the
  "is this part foundational?" test this decision applies in the negative)
* [ADR-0016](0016-merge-medical-word-parts-into-reading-room-terms.md) (the
  one-file/two-decks row format being edited)
* [ADR-0018](0018-reading-room-card-carries-an-optional-gloss-column.md) (why the
  etymology can't move into `Gloss`)
* [.claude/rules/scripts.md](../../.claude/rules/scripts.md)
