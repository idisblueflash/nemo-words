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
finds a row, this is a **word part**, not a whole word — it still gets the full
explain → brainstorm → pick → save → illustrate pipeline below (ADR-0017), but through
a different branch (marked **[word part]** in each step from here on), not a hard
stop. A word already carded as a classical-morpheme part still never *also* gets a
whole-word story card (see `para-`'s duplicate-card incident) — the mnemonic lands on
the existing word-part row, never a new one.

**[word part] Get the origin/meaning row first:**
- If the word-part grep already found a row, that row's `Back` (the text before any
  `<hr>`, or the whole thing if there's no `<hr>` yet) is the origin/meaning/examples
  — read it as this word part's "definition" for step 2.
- If no row exists yet, dispatch `_etta_mology` (or run `explain-greek-latin-blocks` /
  `explain-inn-drug-stem` + `build-word-part-anki` directly) to decompose and card it
  first — the mnemonic step needs that origin/meaning in hand before it can proceed.

If the word already has a logged story or a non-empty carded `Back` in
`reading-room-terms.txt` (whole-word case), show it and confirm with Flash whether he
wants to proceed anyway (re-brainstorm) before continuing.

## 2. Explain + gather dispatch context for _nemo

`_nemo` requires the word already explained (pronunciation + definition in hand) — never
skip straight to dispatching him cold. Get:

- Pronunciation: `nemo-words ipa-lookup --word "<word>"` (GA column; verify any g2p
  flag). **[word part]** strip the leading/trailing hyphen for the lookup argument
  (e.g. `val-` → `val`); if the bare form isn't a real word, judge the part's
  pronunciation from its example words instead (`nemo-words ipa-lookup --word
  "<example word>"`) and isolate the relevant piece.
- A plain-language definition and dominant sense — run the `english-word-explainer`
  skill's steps 1–3 if the word hasn't been explained yet this session. **[word part]**
  skip `english-word-explainer` entirely — the origin/meaning already read from the
  row (or just written by `_etta_mology`) is the definition; there's no standalone
  usage-example sentence for a bound morpheme, so use the row's own example words
  (e.g. *valor, value, valid*) as the dominant-sense context instead.

Don't run `_corpus_search` yourself here — `_nemo` runs it himself once dispatched.
**[word part]** skip this too — there's no corpus usage for a bound morpheme on its
own; the example words already stand in for context.

## 3. Dispatch _nemo

Dispatch the `_nemo` agent with the word, its GA IPA, and its definition/dominant sense.
Ask him to run the `_corpus_search` skill himself on the word for attested usage
(sample sentences, dominant sense, common collocates) so his candidates track real
usage, and to include, per candidate, the full `_logan` row fields per
word-workflow.md step 3: `syllabification`, `anchor_unit`, `keyword`, `pivot_words`,
`technique`. **[word part]** tell him explicitly the target is a bound morpheme, not a
free word — candidates should still never spell out the part itself, but should evoke
one or more of its example words to carry meaning (a bound morpheme has no meaning
outside those), and skip asking him to run `_corpus_search` (nothing to search for).

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

- **[whole word]** Run the `update-anki-story` skill with the word + final story text.
  It writes the row in `anki/reading-room-terms.txt`, pushes it live via
  `scripts/anki-sync.js`, and logs the pick to `data/mnemonics/log.jsonl` via `_logan`
  (hand it the `_logan` fields already collected in step 3/4 so it doesn't re-ask).
- **[word part]** Do *not* run `update-anki-story` — it hard-refuses `medical-word-parts`
  rows on purpose (it writes the plain-story `Back` shape, which doesn't apply here).
  Instead, edit the part's row in `anki/reading-room-terms.txt` directly (ADR-0017): in
  its `Back` field, prepend `🎭 <final sentence><hr>` ahead of the existing
  `<i>Origin</i><br>meaning<br><span class="examples">...</span>` block, per
  `build-word-part-anki`'s documented format — replace any prior hand-added `🎭 ...<hr>`
  section entirely rather than appending to it, since this is now the one deliberately
  picked story. Then push it live with `ANKI_FILE=reading-room-terms.txt node
  scripts/anki-sync.js "<part>"`, and dispatch `_logan` to log it to
  `data/mnemonics/log.jsonl` exactly as a whole-word pick (word = the part, e.g.
  `val-`; sense = the origin/meaning already gathered in step 1/2; hand it the same
  `syllabification`/`anchor_unit`/`keyword`/`pivot_words`/`technique` fields from
  step 3/4).
- At the same time, dispatch `_vivian` with the word (or part) and the exact final
  story sentence to render the 3×3 mnemonic-image grid. Don't wait for her before
  reporting the save — she runs single-turn and reports back independently.

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
