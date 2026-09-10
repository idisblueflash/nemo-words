---
name: vivian-mnemonic-images
description: Orchestrate mnemonic-image creation for one or more vocabulary words with the _vivian subagent. Dispatches a fire-and-forget _vivian per word to produce a 3×3 candidate grid, then handles the pick-and-crop back half in the main thread — showing each grid, taking the user's cell number 1–9, and cropping the final asset with scripts/crop-grid-cell.sh, then attaching it to the word's Anki card (Image column + anki-sync.js) as a default step. Use when the user says "have _vivian illustrate <word>", "make a mnemonic image for <word(s)>", "delegate _vivian for these words", or wants image variations to choose from. Keeps _vivian single-turn so no subagent is ever resumed.
---

You are orchestrating mnemonic-image creation. The work splits in two:

1. **Generative (delegated to `_vivian`)** — look up the mnemonic sentence,
   write the house-style codex-imagegen brief, render a 3×3 candidate grid.
   This needs _vivian's context (house style, ADR-0008/0009, brief craft),
   so it runs in a subagent.
2. **Pick-and-crop (you, in the main thread)** — show each grid, take a
   cell number 1–9 from the user, run `scripts/crop-grid-cell.sh`, show the
   final. Pure mechanics, no judgement — never worth a subagent, and never
   worth *resuming* one (a resume reloads the agent's whole transcript and
   costs a fresh model turn).

Keep _vivian **single-turn**: it generates the grid, reports, and exits.
All grid-showing, pick-taking, and cropping happens here.

## Step 1 — dispatch one _vivian per word

For each word the user named, dispatch an `_vivian` agent **in parallel**
(one `Agent` call each, all in one message). Give each a self-contained
prompt:

> Generate a mnemonic-image candidate grid for the word "<word>".
> <If the user supplied a sentence: "The mnemonic sentence is: <sentence>">
> <Otherwise: "Look up its mnemonic sentence with node scripts/find-mnemonic.js <word>.">
> Attach docs/mnemonics/style-anchor.png as the style reference, style-QA
> the finished sheet against it, and regenerate once if it drifts. Do NOT
> crop, do NOT SendUserFile, do NOT wait for a pick. Produce the 3×3 grid,
> save it to docs/mnemonics/images/<word>.grid.png, and end your turn with
> a structured report: word, mnemonic sentence used, the hook element, the
> grid path, a numbered list (1–9, row-major) of the nine stagings, and
> the style-QA result.

_vivian handles the style anchoring and self-QA herself — you don't need
to spell it out, but if her report says a sheet still drifted after the
regenerate pass, relay that to the user before they pick, and offer
another regeneration pass rather than cropping from a bad sheet.

If the user gave sentences inline, pass them through verbatim — _vivian
never writes the sentence. If a word has no sentence and none is on record,
_vivian will report that; relay it and ask the user for the sentence, then
re-dispatch that one.

Do **not** read the agents' transcript output files. Wait for the
completion notifications.

## Step 2 — show each grid as it lands

When an _vivian reports back:

1. `SendUserFile` its `docs/mnemonics/images/<word>.grid.png` with
   `display: "render"` and a caption naming the word.
2. Relay the mnemonic sentence and the nine-staging list.
3. Ask for a cell number 1–9 (row-major: 1 = top-left, 3 = top-right,
   9 = bottom-right).

Handle each word independently — don't wait for all grids before showing
the first.

## Step 3 — crop the picks

When the user names cells (often several at once, e.g. "jerk 6, levee 8"),
run one crop per word — batch them in a single message:

```
scripts/crop-grid-cell.sh docs/mnemonics/images/<word>.grid.png <cell> \
  docs/mnemonics/images/<word>.png
```

The script assumes a 3×3 grid (its default) and divides evenly; trust it,
don't re-crop by eye. The `<word>` may start with `-` (e.g. `-rrha`) —
the path argument handles that fine.

Then `SendUserFile` each final `docs/mnemonics/images/<word>.png`
(`display: "render"`) and give the user a summary table: word, cell, final
path.

## Step 4 — attach the image to the Anki card (default, no separate ask)

Cropping a cell *is* the user picking that image, so attaching it to the
card follows automatically — don't wait for a separate "sync it" request.
For each word just cropped, if it has a row in `anki/reading-room-terms.txt`:

1. Set that row's `Image` column to the bare filename `<word>.png` (add the
   third tab-separated field, or patch it if already present). A word-part
   image whose card lives in `anki/medical-word-parts.txt` has no `Image`
   column — skip the attach for those, just report the crop.
2. Sync only that row:

   ```
   ANKI_FILE=reading-room-terms.txt node scripts/anki-sync.js "<word>"
   ```

   `anki-sync.js` uploads the file as `nemo-<word>.png` and composes
   `<story><br><img>` onto the pushed `Back` (ADR-0012); the `.txt` stays
   plain text. If Anki is unreachable the `.txt` edit still stands and the
   error goes to `anki/sync.log` — tell the user to re-run later.

3. Add the sync result to the summary table (word, cell, final path, Anki
   row updated / sync deferred).

Skip this step only if the user said not to touch Anki, or the word has no
card yet.

## Regeneration

If the user rejects a whole sheet, re-dispatch that word's _vivian asking
it to push the nine stagings further apart. _vivian appends `-2`, `-3`, …
to the grid filename rather than overwriting; crop from the sheet the user
actually picked from.

## Rules

- Never write or paraphrase a mnemonic sentence. It comes from the user or
  from `scripts/find-mnemonic.js`; if it's missing, ask.
- Never resume an _vivian for a crop — do the crop here.
- Only write under `docs/mnemonics/images/`. Don't commit — leave that to
  the user.
- If codex-imagegen times out inside _vivian (it has a hard 300s launcher
  limit and the backend can be overloaded when many run at once), the
  agent will report the failure. Offer to retry that word; the brief is
  saved and cheap to re-run.
