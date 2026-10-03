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
time — see ADR-0012 — an optional 4th `IPA` column carries a stress-marked
transcription that `anki-sync.js` appends the same way — see ADR-0015 — and an optional
5th `Gloss` column carries a one-clause plain-English meaning, 60 chars max, composed in
between the story and the IPA — see ADR-0018).

## Classifying a word (medical vs. general)

```bash
node scripts/classify-word.js <word>
```

A cheap heuristic pre-filter — prints a `**Verdict:**` line (`medical` / `ambiguous` /
`no`) plus the matched parts. Used by `/prepare-words` to route a word to `_etta_mology`
vs. the `english-word-explainer` explain step before spending a full agent turn. Not
authoritative — the real call is made downstream.

## Pushing an `anki/*.txt` row into the live Anki collection

After editing a row in `anki/reading-room-terms.txt` (a whole-word vocabulary card, or
one of `_etta_mology`'s word-part rows — both live in this one file now, ADR-0016),
push just that row into the live collection via AnkiConnect with `scripts/anki-sync.js`
— an upsert (findNotes → updateNoteFields, or addNote if absent) that patches only the
Back field and leaves scheduling/review history alone:

```bash
# defaults to anki/reading-room-terms.txt
node scripts/anki-sync.js "-nomy"
node scripts/anki-sync.js "ubiquitous"

# no <front> arg syncs every row in the file
node scripts/anki-sync.js

# sync a different anki/ file instead — ANKI_FILE is a filename under anki/, not a path
ANKI_FILE=<other>.txt node scripts/anki-sync.js "<front>"
```

Prefer the wrapper `scripts/anki-sync-terms.sh` over the bare `node scripts/anki-sync.js`
form above — same call, but as a plain command (no leading shell variable-assignment,
and no need to name the file since it's the default) it's on the `.claude/settings.json`
allowlist and skips the manual-approval prompt that an unrecognized `VAR=value cmd`
prefix triggers under the read-outside-working-directory sandbox check:

```bash
scripts/anki-sync-terms.sh "ubiquitous"   # sync one row
scripts/anki-sync-terms.sh                # sync every row
```

### Removing a card

The sync is an upsert with no prune, so deleting a row from `anki/*.txt` leaves its note
alive in the live collection. `--delete` is the explicit cleanup verb for that (e.g.
folding a word-part row into its whole-word card, ADR-0019):

```bash
scripts/anki-sync-terms.sh --delete "omin-"                    # search every deck the file uses
scripts/anki-sync-terms.sh --delete "omin-" --deck "00 Reading Room::01 Medical Terms"
```

Remove the row from the `.txt` **first** — `--delete` refuses a `Front` that's still a
row in the file, so it can only ever remove something already un-carded. With no
`--deck` it searches the `#deck` header plus every deck named by a row-level `Deck`
override; "already absent" is success, so a re-run is safe. It is otherwise
destructive — the note's review history goes with it, recoverable only via Anki's own
in-app undo. Covered by `test/anki-sync-delete.test.js`.

Deck/notetype/tags/columns are read from the target file's own `#` header lines each
run, not hardcoded — a row's optional `Deck`/`Tags` columns override those headers for
just that row (ADR-0016), which is how word-part rows route to the medical deck/tag
from the same file as ordinary vocabulary rows. Requires Anki running locally with
AnkiConnect listening on `127.0.0.1:8765` (override via `ANKI_CONNECT_URL`). If it
can't reach Anki, the file write still stands — log the connection error to
`anki/sync.log` and re-run later.

Regression coverage: `test/anki-sync-cross-deck-duplicate.test.js`,
`test/anki-sync-image-field.test.js`, `test/anki-sync-ipa-field.test.js`,
`test/anki-sync-gloss-field.test.js`,
`test/anki-sync-delete.test.js`, and
`test/anki-sync-deck-tags-override.test.js` run the real script end-to-end against a
mock AnkiConnect (no live Anki needed) — `node --test` picks them all up.

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
`.claude/skills/english-word-explainer/rhyme/rhyme.py` for rhyme/near/onset/prefix.
