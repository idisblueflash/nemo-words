---
status: accepted
deciders: Flash Hu
date: 2026-09-28
---

# 0018. The reading-room Anki card carries an optional Gloss column

## Context and Problem Statement

ADR-0011 fixed the card's `Back` to the 🎭 story sentence alone, on the principle that
the story lets the reviewer reconstruct the word from anchors rather than reading an
answer. ADR-0012 added an image and ADR-0015 an IPA line on top of it, both composed at
sync time.

That leaves an asymmetry. After ADR-0015 the reviewer can check their *pronunciation*
recall against something concrete — the stress-marked transcription. There is nothing on
the card that states the word's *meaning*. Flip `confound` and you get a picture, *"A con
man found twins, mixing up nametags."*, and `/kən.ˈfaʊnd/`. If your recalled meaning was
wrong or fuzzy, nothing corrects you; you have to re-decode the scene and hope you read
it the way it was built.

The `english-word-explainer` skill already concedes the underlying point in its own
Step 5: the mnemonic gets you the word and its rough flavour, not its precise boundaries.
Those boundaries (*confound* is stronger than *confuse* and carries defeat-of-expectation)
are worked out at explain time and then discarded as build-time scaffolding.

The usual objection to putting a definition on a flashcard — it destroys retrieval
practice — does not apply to the `Back`. The `Back` is the answer side; retrieval has
already happened by the time it's visible. A gloss there changes the *feedback*, not the
*test*. That's the same reasoning ADR-0015 used for rejecting IPA-on-`Front` while
accepting IPA-on-`Back`.

## Considered Options

* **Do nothing** — keep meaning entirely as build-time scaffolding. Leaves the
  meaning-recall check with nothing to verify against, which is the gap Flash hit.
* **Derive the gloss from `log.jsonl`'s `sense` field**, the way `IPA` derives from
  `syllabification`. Rejected on measurement: across the 102 logged rows `sense` averages
  ~95 characters and carries etymology, corpus notes and bookkeeping (*"bound word-part
  row (medical-word-parts)"*). It is the source material for a gloss, not a gloss.
* **Put the full Step-1 plain explanation on the card.** Rejected — two to three
  sentences on the `Back` buries the story it's supposed to support and turns the card
  into a dictionary entry.
* **A fifth `Gloss` column, hand-authored short, composed onto `Back` at sync time** —
  same shape as ADR-0012's `Image` and ADR-0015's `IPA`.

## Decision Outcome

Chosen option: **the fifth `Gloss` column**, capped at 60 characters, composed between
the story and the IPA.

Mechanics:

* Header becomes `#columns:Front\tBack\tImage\tIPA\tGloss\tDeck\tTags`. `Gloss` is
  inserted *ahead* of ADR-0016's `Deck`/`Tags` overrides so the content columns stay
  grouped and the overrides stay last; the 88 existing word-part rows were migrated with
  an empty `Gloss` field, and `parseFile` now reads `Deck`/`Tags` at positions 6 and 7.
* `Gloss` is one clause of plain English — **60 characters max**, no etymology, no usage
  notes, no examples. `confound` → `to baffle, or to mix two things up`.
* It is **authored fresh at save time, not derived.** `update-anki-story` enforces the
  cap and explicitly forbids pasting `log.jsonl`'s `sense`.
* `composeBack` pushes, in review order: `<img>`, story,
  `<small style="opacity:0.75"><i>gloss</i></small>`, `<small
  style="opacity:0.6">/ipa/</small>` — each piece skipped when absent, joined with
  `<br>`. Italic distinguishes the gloss from the IPA line at a glance; the gloss sits
  before the IPA so ADR-0015's "transcription last, confirming the pronunciation" order
  survives.
* Word-part rows (`medical-word-parts`, ADR-0016) leave it empty — their `Back` already
  states the morpheme's meaning.
* `confound` is the first row carrying one.

### Positive Consequences

* Meaning recall is verifiable on review, closing the gap symmetric to the one ADR-0015
  closed for pronunciation
* The word's usage boundary (the thing the mnemonic provably doesn't teach) gets a
  permanent home instead of evaporating with the explain step
* No change to `Back`'s plain-text-story rule, and no schema change to `log.jsonl`
* The 60-char cap is a real constraint, not a style note — it's what keeps this from
  drifting into ADR-0011's rejected multi-segment back

### Negative Consequences

* A third hand-maintained piece composed onto `Back` — more moving parts at sync time
* Unlike `IPA`, the gloss has no upstream source of truth, so it can't be regenerated or
  checked against the log; a wrong gloss is only caught by reading the card
* One more column to fill on new saves, and the back-catalog starts at 1 of ~270 filled
* Inserting a column mid-row rewrote 88 existing rows and shifted `Deck`/`Tags`
  positions — a one-time migration, but anything outside this repo parsing those
  positions would break

## Links

* Builds on [ADR-0011](0011-reading-room-card-is-story-only.md),
  [ADR-0012](0012-reading-room-card-carries-an-optional-mnemonic-image.md),
  [ADR-0015](0015-reading-room-card-carries-an-optional-ipa-column.md) and
  [ADR-0016](0016-merge-medical-word-parts-into-reading-room-terms.md)
* [scripts/anki-sync.js](../../scripts/anki-sync.js)
* [test/anki-sync-gloss-field.test.js](../../test/anki-sync-gloss-field.test.js)
* [.claude/rules/word-workflow.md](../../.claude/rules/word-workflow.md)
* [.claude/skills/update-anki-story/SKILL.md](../../.claude/skills/update-anki-story/SKILL.md)
