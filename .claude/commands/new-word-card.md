---
description: One-word mnemonic pipeline — explain, brainstorm via _nemo, pick, save+log, illustrate
argument-hint: <word>
---

Parse `$ARGUMENTS` as a single word or short phrase (trim whitespace). If empty, ask
Flash for a word instead of proceeding.

This command is the interactive, single-word version of the main loop in
`.claude/rules/word-workflow.md` — it still needs a human to pick the final story (step
3 below can't be automated), so run it directly in this conversation, not via the
`Workflow` tool.

## 1. Check for existing work first

```bash
node scripts/find-mnemonic.js "<word>"                 # story already logged?
grep -i "^<word>\b" anki/reading-room-terms.txt         # already carded (either kind)?
grep -i "^<word>\b.*\bmedical-word-parts$" anki/reading-room-terms.txt   # already a word-part card?
node scripts/classify-word.js "<word>"                  # medical/INN vs general?
```

If `classify-word.js` says `medical` (or `ambiguous` and a quick judgment call agrees),
**or** the second grep (matching rows tagged `medical-word-parts`, ADR-0016) already
finds a row, stop here and say so —
route to `_etta_mology` instead, per word-workflow.md; this command is for
general-vocabulary words with a sound/story axis only. This is a hard stop, not a soft
flag — a word already carded as a classical-morpheme part does not also get a
whole-word story card (see `para-`'s duplicate-card incident). If the word already has a
logged story or a non-empty carded `Back` in `reading-room-terms.txt`, show it and
confirm with Flash whether he wants to proceed anyway (re-brainstorm) before continuing.

## 2. Explain + gather dispatch context for _nemo

`_nemo` requires the word already explained (pronunciation + definition in hand) — never
skip straight to dispatching him cold. Get:

- Pronunciation: `nemo-words ipa-lookup --word "<word>"` (GA column; verify any g2p flag).
- A plain-language definition and dominant sense — run the `english-word-explainer`
  skill's steps 1–3 if the word hasn't been explained yet this session.

Don't run `_corpus_search` yourself here — `_nemo` runs it himself once dispatched.

## 3. Dispatch _nemo

Dispatch the `_nemo` agent with the word, its GA IPA, and its definition/dominant sense.
Ask him to run the `_corpus_search` skill himself on the word for attested usage
(sample sentences, dominant sense, common collocates) so his candidates track real
usage, and to include, per candidate, the full `_logan` row fields per
word-workflow.md step 3: `syllabification`, `anchor_unit`, `keyword`, `pivot_words`,
`technique`.

## 4. Suggest, then wait for the human pick

When Nemo's candidates come back, present all of them numbered, plus **your own
recommendation** (not just his) with a one- or two-sentence reason — judge on IPA-anchor
precision, meaning-carry, and how well it matches the corpus's dominant sense (a rare
technical sense the candidates over-indexed on is a reason to *not* just default to
Nemo's own top pick). Then stop and wait for Flash to give you a number (or ask for an
edit/variant). Do not save anything yet — this is the same "human always picks" gate as
the main workflow's step 3.

If Flash asks for a variant/edit of a candidate rather than picking one outright,
re-derive the `_logan` row fields for the edited sentence before moving on — don't carry
over the original candidate's tags unchecked.

## 5. Save + log, and illustrate — in parallel

Once Flash confirms a final sentence number (or edited text):

- Run the `update-anki-story` skill with the word + final story text. It writes the row
  in `anki/reading-room-terms.txt`, pushes it live via `scripts/anki-sync.js`, and logs
  the pick to `data/mnemonics/log.jsonl` via `_logan` (hand it the `_logan` fields
  already collected in step 3/4 so it doesn't re-ask).
- At the same time, dispatch `_vivian` with the word and the exact final story sentence
  to render the 3×3 mnemonic-image grid. Don't wait for her before reporting the
  save — she runs single-turn and reports back independently.

Report back once both the save and the image dispatch are underway; don't block one on
the other.

## 6. When Vivian's grid comes back, wait for the human pick, then crop

Show the grid. Stop and wait for Flash to give you a cell number 1–9 (or ask for a
different word/sentence if none of the nine land). Do not crop anything until he gives
that number — this is the same human-picks-the-image gate as the
`vivian-mnemonic-images` skill's normal flow.

Once he picks a cell:

```bash
scripts/crop-grid-cell.sh <grid-path> <cell-number> images/mnemonic/<word>.png
```

Then attach it to the card as a default step (skip only if Flash opts out or the word
has no card): set the `Image` column of the word's row in
`anki/reading-room-terms.txt` to `<word>.png` and run
`ANKI_FILE=reading-room-terms.txt node scripts/anki-sync.js "<word>"`.
