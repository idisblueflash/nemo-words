---
title: "scripts/anki-sync.js fails to add a note when a different deck already has the same Front text"
status: fixed
original_story: "(migrated from reading-room alongside scripts/anki-sync.js)"
ac: 1
found: 2026-08-07
closed: 2026-08-07
---

## Bug

`scripts/anki-sync.js`'s `addNote` upsert path failed whenever a row's Front text
already existed as a note in a *different* Anki deck on the same notetype. AnkiConnect's
`addNote` duplicate check defaults to notetype-wide scope (not deck-scoped), so it
rejected the add even though the target deck had no such note — even though this repo's
decks legitimately reuse Front text across `anki/medical-word-parts.txt` and
`anki/reading-room-terms.txt`.

Concrete instance: syncing a new `germane` row in `anki/reading-room-terms.txt` failed
because another deck already had an unrelated `germane` note on notetype Basic (recorded
in `anki/sync.log`, 2026-08-07T08:51:34Z; earlier `agog` / `secus` entries show the same
mode).

## Root cause

`syncRow()`'s `addNote` call (the branch taken when the deck-scoped `findNotes` lookup
finds no note in the target deck) omitted `note.options.duplicateScope`, so AnkiConnect
fell back to its default notetype-wide duplicate check instead of scoping it to
`deckName`. The `findNotes` lookup was already deck-scoped — the mismatch is what let an
absent-from-target-deck note still be rejected as a "duplicate".

## Fix

`addNote` now passes `options: { duplicateScope: "deck" }`, matching the deck-scoped
`findNotes` lookup. Same-target-deck collisions are still caught earlier by `findNotes`
(which takes the `updateNoteFields` branch and never reaches `addNote`).

## Acceptance criteria

- `addNote` is called with `options: { duplicateScope: "deck" }`.
- A row whose Front collides with a note in a *different* deck (same notetype) adds
  successfully instead of failing.
- A row whose Front genuinely exists in the same target deck still updates in place.
- No change to `duplicateScopeOptions` (`checkAllModels` stays `false`).

## Status

Fixed. Regression test: `test/anki-sync-cross-deck-duplicate.test.js` runs the real
script end-to-end against a mock AnkiConnect (no live Anki needed) and asserts the
`duplicateScope: "deck"` option is present on the `addNote` request. `node --test`
picks it up.
