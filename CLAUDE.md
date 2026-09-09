# nemo-words

## Dependency graph (DGML)

To visualize `src/nemo_words/` as a DGML dependency graph (nodes per
`def`/`defn`/`defn-`, grouped by namespace, with `Calls` edges inferred
from symbol references), run:

```
scripts/gen-dgml.sh [SRC_DIR] [OUT_FILE]
```

Defaults: `SRC_DIR=src/nemo_words`, `OUT_FILE=docs/nemo_words.dgml`.

Re-run this any time the source changes instead of hand-authoring DGML —
it's a regex-based scan (no real Clojure reader), so it won't catch macro
expansion or lexical shadowing, but it correctly distinguishes public vs.
`^:private`/`defn-` symbols, flags `-main` as an entry point, and resolves
both same-namespace bare calls and `alias/symbol` calls via each file's
`:require :as` map (linking to sibling namespaces in `SRC_DIR` when
possible, otherwise to an external-library node).

## Interactive dependency graph (rename-capable)

For a live, clickable view of the same graph — docstrings on click,
inline rename that rewrites `src/nemo_words/*.clj` on disk (def site and
every call site) — run:

```
node scripts/graph-server.js
```

then open `http://localhost:8787`. It re-scans the source on every
request (same regex heuristic as `scripts/gen-dgml.sh`, kept in sync by
hand between the two scripts) and refuses to rename `-main` or a name
that would collide with an existing def. Every rename runs a
`clojure ... :reload-all` compile check and reverts all touched files if
it fails. As with any tool that rewrites source in place, only point it
at a clean git working tree so `git diff` / `git checkout` stay your
undo button.

## Mnemonic images

To make mnemonic images for one or more vocabulary words, invoke the
`vivian-mnemonic-images` skill (or just ask — "make a mnemonic image for
<word(s)>"). It dispatches a fire-and-forget `_vivian` subagent per word
to render a 3×3 candidate grid, then handles the pick-and-crop back half
in the main thread: shows each grid, takes a cell number 1–9, and crops
the final asset with `scripts/crop-grid-cell.sh` into
`docs/mnemonics/images/<word>.png`.

`_vivian` is single-turn by design — it generates the grid, reports, and
exits; it is never resumed for the crop (a resume reloads its whole
transcript for a purely mechanical step). Mnemonic sentences come from the
user or `scripts/find-mnemonic.js` — `_vivian` never writes them. House
style is fixed (brush-pen comic line art + light gouache); see ADR-0008
and ADR-0009 in `docs/decisions/`.

## The word / mnemonic agents

The recurring task here is **explaining a word and saving it** — a plain-language
definition and a pronunciation worked out in chat, a sound+meaning mnemonic, and (once a
human picks one) a 🎭 story. Only the story is carded: `anki/reading-room-terms.txt` is
`Front` = word, `Back` = the story sentence, plain text. The structured record (with the
sound/anchor/technique fields) lives in the mnemonic log (`docs/mnemonics/log.jsonl`).
Read `.claude/rules/word-workflow.md` before doing that work; `.claude/rules/scripts.md`
covers the helper scripts.

The explain step for a general-English word with no classical morpheme structure is just
the `english-word-explainer` skill, invoked directly in the main loop (word-workflow.md
steps 1–2) — there is no dedicated agent for it. The `update-anki-story` skill is the
save path once a story is picked (writes the row + syncs + logs via `_logan`).

- **`_etta_mology`** (`.claude/agents/_etta_mology.md`) — decomposes any word built from
  classical Greek/Latin morphemes (or an INN drug stem), medical or general, into its
  parts and writes each part to `anki/medical-word-parts.txt`. Domain doesn't gate her —
  "adjoining" (ad- + join) is as much hers as "nephrectomy"; morpheme structure does. No
  sound/story axis for these. She spot-checks parts against the `dictionaries/` CLIs.
- **`_nemo`** (`.claude/agents/_nemo.md`) — brainstorms alternative one-sentence 🎭 story
  candidates for a word that's already been explained (pronunciation + definition in
  hand). Suggests only; never explains from scratch, never saves.
- **`_logan`** (`.claude/agents/_logan.md` + `_logan/reference-tables.md`) — scribe for
  `docs/mnemonics/log.jsonl`. Structures a picked story + its anchor/technique fields
  into one validated JSON row and appends it. Does no linguistic work itself.

When the user hands over several words at once, work through them inline — don't fan out
one subagent per word. See `word-workflow.md`.

## Ad-hoc IPA/rhyme lookups

When Flash asks something like "words starting with /pə/" or "words with /kɑmp/" — a
phonetic pattern search, not a specific word's pronunciation — always search the offline
CMU dictionary via the `nemo-words` CLI instead of answering from memory (recalled
spellings drift from real IPA). Typical calls:

```bash
nemo-words ipa-lookup --ga "<ipa fragment>"                    # substring match, prints word\tRP\tGA
nemo-words ipa-lookup --ga "<ipa fragment>" | awk -F'\t' '$3 ~ /^<pattern>/'   # anchor to word-start
```

This is the same tool `_nemo` uses for mnemonic sound-anchor candidates (see
`.claude/rules/word-workflow.md` step 2 / `_nemo.md`) — reuse it directly rather than
guessing words and their pronunciations by hand. For rhyme/near/onset/prefix queries use
`~/.claude/skills/english-word-explainer/rhyme/rhyme.py`; for word frequency use
`node scripts/word-freq.js <word>`.

## Ad-hoc corpus / concordance lookups

When Flash wants to see how a word or phrase is *actually used* — attested example
sentences, a KWIC concordance, collocates, or how frequent one phrasing is vs another —
use the **`_corpus_search`** skill (`.claude/skills/_corpus_search/`). It searches a
local Tatoeba English corpus (2M sentences, encoded with CWB/`cqp`) via
`scripts/corpus-search.sh` and prints an aligned concordance. Reporting only — it never
writes Anki or the mnemonic log.

## Rules

| Read... | ...when you're about to |
|---|---|
| [`.claude/rules/word-workflow.md`](.claude/rules/word-workflow.md) | handle an "explain \<word\>" request (the main loop) |
| [`.claude/rules/scripts.md`](.claude/rules/scripts.md) | run `anki-sync.js`, `find-mnemonic.js`, `classify-word.js`, or a `dictionaries/` CLI |

## Prerequisites for the word agents

- Node.js 18+ (stdlib only; `node:test` needs 18+).
- The `nemo-words` CLI on `PATH` (`~/.local/bin/nemo-words`, JVM 11+, no network).
- Anki desktop running locally with AnkiConnect on `127.0.0.1:8765`, if a task touches
  `anki/*.txt` or runs `scripts/anki-sync.js`.
- The classical dictionary data + vendored repos under `dictionaries/` are gitignored —
  on a fresh clone run each `dictionaries/*/download.sh` then `build-index.js` once
  before `_etta_mology`'s Part 1.5 dictionary spot-check works (see
  `dictionaries/README.md`).
