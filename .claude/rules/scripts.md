---
description: The helper scripts the word/mnemonic agents use — Anki sync, mnemonic-log lookup, word classification, the classical dictionaries.
---

# Word-agent helper scripts

## Looking up an existing mnemonic

```bash
node scripts/find-mnemonic.js <word>
```

Prints the logged story sentence + `pivot_words` for a word if `data/mnemonics/log.jsonl`
has a row for it (exit 0), or exits 1 if not. This is the fast "does this word already
have a story?" check — use it before re-brainstorming or re-explaining. Pair it with
`grep -i "^<word>\b" anki/reading-room-terms.txt` for the carded story sentence (the
card's `Back` column is the story, plain text; an optional 3rd `Image` column names a
mnemonic image under `images/mnemonic/` that `anki-sync.js` attaches at sync
time — see ADR-0012 — and an optional 4th `IPA` column carries a stress-marked
transcription that `anki-sync.js` appends the same way — see ADR-0015).

## Classifying a word (medical vs. general)

```bash
node scripts/classify-word.js <word>
```

A cheap heuristic pre-filter — prints a `**Verdict:**` line (`medical` / `ambiguous` /
`no`) plus the matched parts. Used by `/prepare-words` to route a word to `_etta_mology`
vs. the `english-word-explainer` explain step before spending a full agent turn. Not
authoritative — the real call is made downstream.

## Pushing an `anki/*.txt` row into the live Anki collection

After editing a row in an `anki/*.txt` export file (a word-part card, or a
`reading-room-terms.txt` vocabulary card), push just that row into the live collection
via AnkiConnect with `scripts/anki-sync.js` — an upsert (findNotes → updateNoteFields,
or addNote if absent) that patches only the Back field and leaves scheduling/review
history alone:

```bash
# defaults to anki/medical-word-parts.txt
node scripts/anki-sync.js "-nomy"

# sync a row in a different anki/ file — ANKI_FILE is a filename under anki/, not a path
ANKI_FILE=reading-room-terms.txt node scripts/anki-sync.js "ubiquitous"

# no <front> arg syncs every row in the file
ANKI_FILE=reading-room-terms.txt node scripts/anki-sync.js
```

Deck/notetype/tags/columns are read from the target file's own `#` header lines each
run, not hardcoded. Requires Anki running locally with AnkiConnect listening on
`127.0.0.1:8765` (override via `ANKI_CONNECT_URL`). If it can't reach Anki, the file
write still stands — log the connection error to `anki/sync.log` and re-run later.

Regression coverage: `test/anki-sync-cross-deck-duplicate.test.js` runs the real script
end-to-end against a mock AnkiConnect (no live Anki needed) — `node --test` picks it up.

## The classical dictionaries (`_etta_mology` Part 1.5)

Offline, no network. See `dictionaries/README.md`.

```bash
node dictionaries/lsj/search.js <part>            # Greek (LSJ), query by transliteration
node dictionaries/lewis-short/search.js <part>    # Latin (Lewis & Short) headword entry
python3 dictionaries/open-words/search.py <part>  # Latin: identify headword + grammatical form
```

## IPA / rhyme / frequency

Not in `scripts/` — see `CLAUDE.md` "Ad-hoc IPA/rhyme lookups" for the `nemo-words` CLI,
`scripts/word-freq.js` for Google-Ngram frequency, and
`~/.claude/skills/english-word-explainer/rhyme/rhyme.py` for rhyme/near/onset/prefix.
