---
name: update-anki-story
description: |
  The save path for a picked 🎭 story. Takes a word plus a final story sentence — a
  literal pick from Nemo's candidates, something composed from them, or a story the user
  wrote — and makes it that word's card: writes the row in `anki/reading-room-terms.txt`
  (`Front` = word, `Back` = the story, plain text — appending the row if the word isn't
  carded yet, patching it if it is), pushes it live via `scripts/anki-sync.js`, and logs
  the pick to `data/mnemonics/log.jsonl` via `_logan` if it isn't there yet. Use when the
  user says "save", "save it", "update the Anki story for `<word>` to: `<text>`",
  "finalize story for `<word>`: `<text>`", or hands over a final story after reviewing a
  word's card in the Anki app. Lightweight — no subagent dispatch for the write itself,
  no re-explanation. General-vocabulary words only: `_etta_mology` words never have a
  story and their cards live in a different file. Not for picking or brainstorming a
  story (see `_nemo`) — the story must already be decided when this skill runs.
---

# Update Anki Story

## Trigger examples

<example>
Context: The user picked one of Nemo's story candidates for "ubiquitous" and said "save it".
user: "save it"
assistant: "I'll save ubiquitous's story — write the row in reading-room-terms.txt, sync to Anki, and log it via _logan."
<commentary>
The human decided; this skill just writes it. First-time save and re-finalize are the
same write.
</commentary>
</example>

<example>
Context: `/prepare-words` auto-saved a Nemo top-pick story for "roster". Flash reviewed the card in the Anki app against the sidecar alternates and prefers a different one.
user: "update the Anki story for roster to: The foster home posted who's on kitchen duty tonight."
assistant: "I'll finalize roster's story with that text — rewrite the row, re-sync, and log the pick."
</example>

## Scope

One thing only: given `<word>` + a final story text already in hand, make that story the
word's card everywhere it lives — the row in `anki/reading-room-terms.txt`, the live
Anki collection, and the mnemonic log. It never decides the story itself (that's `_nemo`
brainstorming + a human pick, or the human composing their own).

## Steps

1. **Find the word's row** in `anki/reading-room-terms.txt` by exact `Front` match.

2. **Write the `Back` field** to the story text, verbatim (apply only a tiny grammar fix
   the user asked for — e.g. "need" → "needs"). The row is `Front\tBack\tImage\tIPA`,
   tab-separated:
   ```
   <word>	<story sentence, plain text>	<image basename or empty>	<IPA or empty>
   ```
   No `<b>`/`<br>`, no `🎭` prefix, nothing but the sentence in `Back`. The third
   `Image` column (ADR-0012) is an optional basename under `images/mnemonic/`
   (e.g. `regional.png`) — set it only if the user gives a mnemonic image to attach,
   otherwise leave it empty. The fourth `IPA` column (ADR-0015) is an optional
   stress-marked transcription, syllables dot-separated (e.g. `ˈɑm.ə.nəs`) — fill it
   from the word's `syllabification` array (word-workflow.md step 3 collects this
   alongside the story candidates; join the array with `.`), so it's never
   re-derived by hand. The `<img>` tag and the `/ipa/` line are both composed by
   `anki-sync.js` at sync time; never put HTML in the `.txt`. If no
   row exists for the word, **append one**. If a row exists, patch it in place — don't
   duplicate it. If the old row still carries the legacy multi-segment HTML back
   (`say:`/`def:`/🔊/📖 or a `<b>mnemonic:</b>` candidate list), replace the whole
   `Back` with just the story.

3. **Push it live:**
   ```bash
   ANKI_FILE=reading-room-terms.txt node scripts/anki-sync.js "<word>"
   ```
   If AnkiConnect can't be reached, log the connection error but don't treat it as a
   failure of steps 1–2 — the file write already succeeded; sync can be re-run later.

4. **Log, don't narrate.** Append one line to `anki/sync.log` (shared with
   `_etta_mology`): timestamp, `term=<word>`, file status (added/patched), sync result.
   The chat report is one short confirmation line, not a restatement of the row.

5. **Record it in the mnemonic log** if it isn't already there — check
   `node scripts/find-mnemonic.js <word>`; if there's no row (or the row's `sentence`
   differs from the final text), dispatch `_logan` with the word, the final sentence,
   `sense`, and the anchor/technique fields (`syllabification`, `anchor_unit`,
   `keyword`, `pivot_words`, `technique`) to append it to `data/mnemonics/log.jsonl`.

## What this skill doesn't do

- Doesn't brainstorm or pick a story — the caller must already have decided it.
- Doesn't run for `_etta_mology`-path words — they have no story and their Anki rows
  live in `anki/medical-word-parts.txt`, a different shape entirely.
- Doesn't push, open a PR, or share anything further without explicit go-ahead.
