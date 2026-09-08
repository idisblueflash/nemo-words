---
name: update-anki-story
description: |
  Takes a word already carded in `anki/reading-room-terms.txt` plus a final 🎭 story text — a literal pick from Nemo's candidates, or something composed from them — and writes it as that word's canonical story: rebuilds the word's row to the standard say/def/sound/meaning/story shape (dropping any leftover "Nemo alternates" scratch block from an auto-save), pushes it live via `scripts/anki-sync.js`, and logs the pick to `docs/mnemonics/log.jsonl` via `_logan` if it isn't there yet. Use when the user says "update the Anki story for `<word>` to: `<text>`", "finalize story for `<word>`: `<text>`", or hands over a final story after reviewing a word's card in the Anki app themselves. Lightweight — no subagent dispatch for the write itself, no re-explanation, just the one field. Glossy-path words only: `_etta_mology` words never have a `story` field, so there's nothing here to finalize for them. Not for picking or brainstorming a story (see `_nemo`) — the story must already be decided when this skill runs.
---

# Update Anki Story

## Trigger example

<example>
Context: `/prepare-words` auto-saved a Nemo top-pick story for "ubiquitous" and pushed the alternates onto its Anki card. Flash reviewed the card in the Anki app and prefers a different candidate.
user: "update the Anki story for ubiquitous to: A book so common it's everywhere you look, in every nook."
assistant: "I'll finalize ubiquitous's story with that text — rebuild the Anki row without the alternates block, re-sync, and log the pick."
<commentary>
Flash already decided; this skill just writes it, the same way a `_glossy_ary` "add this story for X" patch would, but without the subagent round-trip.
</commentary>
</example>

## Scope

One thing only: given `<word>` + a final story text already in hand, make that word's
🎭 story the canonical one everywhere it lives — the word's row in
`anki/reading-room-terms.txt`, the live Anki collection, and the mnemonic log. It never
decides the story itself (that's `_nemo` brainstorming + a human pick, or the human
composing their own) and never re-runs the explanation/mnemonic skills — the other
fields (`say`/`ipa`/`def`/`sound`/`meaning`) are assumed already correct and untouched.

## Steps

1. **Read the word's current row** in `anki/reading-room-terms.txt` (find it by exact
   `Front` match). Parse its `Back` field for the current `say` / `/ipa/` / `def` /
   🔊 sound / 📖 meaning segments — these are the source of truth to preserve.

2. **Rebuild — don't append-patch — the row's `Back` field** to the file's standard
   single-line shape, with the new story:
   ```
   <b>say:</b> <CAPS> /<ipa>/<br><b>def:</b> <def><br>🔊 <sound><br>📖 <meaning><br>🎭 <story>
   ```
   Rebuilding from the parsed segments — rather than editing the existing HTML in place —
   is what discards any leftover `<br><br><i>Nemo alternates (unreviewed):</i>...`
   scratch block a prior `/prepare-words` auto-save left on the card: once a story is
   finalized, the alternates have served their purpose and the card goes back to the
   same clean shape every other word card has.

3. **Push it live:**
   ```bash
   ANKI_FILE=reading-room-terms.txt node scripts/anki-sync.js "<word>"
   ```
   If AnkiConnect can't be reached, log the connection error but don't treat it as a
   failure of steps 1-2 — the file write already succeeded; sync can be re-run later.

4. **Log, don't narrate.** Append one line to `anki/sync.log` (shared with
   `_glossy_ary`/`_etta_mology`): timestamp, `term=<word>`, file status (patched), sync
   result. Chat report is one short confirmation line, not a restatement of the row.

5. **Record it in the mnemonic log** if it isn't already there — check
   `node scripts/find-mnemonic.js <word>`; if there's no row (or the row's `sentence`
   differs from the final text), dispatch `_logan` with the word, the final sentence,
   and the anchor/technique fields to append it to `docs/mnemonics/log.jsonl`.

## What this skill doesn't do

- Doesn't brainstorm or pick a story — the caller (a human, via chat) must already have
  decided it.
- Doesn't touch `say`/`ipa`/`def`/`sound`/`meaning` — only 🎭, and only the Anki row's
  shape as a byproduct of the rebuild.
- Doesn't run for `_etta_mology`-path words — nothing to finalize; they have no story
  and their Anki rows live in a different file (`anki/medical-word-parts.txt`), a
  different shape entirely.
