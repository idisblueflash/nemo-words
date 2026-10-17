# nemo-words

## How to write to Flash

Write all text to Flash about 80% of the way to ASD-STE100 (Simplified Technical
English). This includes answers, questions, choice labels, and summaries of
subagent reports. Use short sentences, active voice, one idea per sentence and
simple words. Keep technical names (IPA, file names, IDs, commands) as they are.

Specifically:
- Use each word only as its normal part of speech. Write "makes a card for",
  not "cards".
- Write noun stacks out in full. Write "a rule that allows names as anchors",
  not "name rule".
- Complete each comparison. Write "0 more than today", not "0 more".
- Rewrite subagent findings in plain words. Do not copy them as they are.
- Cut words that add nothing, but keep words that show the structure:
  "that", "because", "than <what>", and the subject of each sentence.

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
`images/mnemonic/<word>.png`. Picking 3–4 cells instead means a comic: they're
composed 2×2, in the order given, with `scripts/compose-comic.sh` into
`images/mnemonic/<word>.comic.png` (ADR-0020/0021/0022), and that file is what
goes in the card's `Image` column.

For the comic pick there's also a clickable picker: `node scripts/comic-picker.js <word>`
(→ `http://localhost:8788`). It shows every `images/mnemonic/<word>*.grid.png` as a
clickable 3×3 on the left (so a follow-up grid for a missing beat, e.g.
`<word>.noodles.grid.png`, can be mixed in) and the 2×2 comic redrawing live on the
right. **Confirm** runs `compose-comic.sh` (which accepts `PATH:N` cells from other
grids) and, unless unticked, attaches the comic to the card the same way.

For a single-image pick there's the matching `node scripts/image-picker.js <word>`
(→ `http://localhost:8789`): click one candidate per grid row (the row's other two cells
dim), then click one of the three candidates as the final (the other two dim).
**Output** runs `crop-grid-cell.sh` to `images/mnemonic/<word>.png` and, unless
unticked, attaches it to the card the same way. Both pickers share their server
plumbing in `scripts/picker-common.js`.

Picking a cell counts as choosing that image, so attaching it to the Anki
card is a **default step, not a separate request**: right after the crop,
set the `Image` column of the word's row in `anki/reading-room-terms.txt`
to `<word>.png` and run
`ANKI_FILE=reading-room-terms.txt node scripts/anki-sync.js "<word>"` —
`anki-sync.js` uploads it as `nemo-<word>.png` and composes the `<img>`
onto the pushed `Back` at sync time (ADR-0012). Skip only if the user opts
out of Anki or the word has no card. Word-part rows (`Tags` column =
`medical-word-parts` in `anki/reading-room-terms.txt`, ADR-0016) can carry an
`Image` too, same column — but they have no `IPA` or `Gloss` column, since they have no
sound/story axis and their `Back` already states the meaning (see below).

`_vivian` is single-turn by design — it generates the grid, reports, and
exits; it is never resumed for the crop (a resume reloads its whole
transcript for a purely mechanical step). Mnemonic sentences come from the
user or `scripts/find-mnemonic.js` — `_vivian` never writes them. House
style is fixed (brush-pen comic line art + light gouache); see ADR-0008
and ADR-0009 in `docs/decisions/`.

## The word / mnemonic agents

The recurring task here is **explaining a word and saving it** — a plain-language
definition and a pronunciation worked out in chat, a sound+meaning mnemonic, and (once a
human picks one) a 🎭 story. The story is the card, plus two optional derivatives:
`anki/reading-room-terms.txt` is `Front` = word, `Back` = the story sentence (plain
text), an optional `Image` column naming a mnemonic image under `images/mnemonic/`
(ADR-0012), an optional `IPA` column carrying a stress-marked transcription
(ADR-0015), and an optional `Gloss` column carrying a one-clause plain-English meaning,
60 chars max (ADR-0018) — `anki-sync.js` attaches all three to the card at sync time. The structured
record (with the full sound/anchor/technique fields) lives in the mnemonic log
(`data/mnemonics/log.jsonl`).
Read `.claude/rules/word-workflow.md` before doing that work; `.claude/rules/scripts.md`
covers the helper scripts.

The explain step for a general-English word with no classical morpheme structure is just
the `english-word-explainer` skill, invoked directly in the main loop (word-workflow.md
steps 1–2) — there is no dedicated agent for it. The `update-anki-story` skill is the
save path once a story is picked (writes the row + syncs + logs via `_logan`).

- **`_etta_mology`** (`.claude/agents/_etta_mology.md`) — decomposes any word built from
  classical Greek/Latin morphemes (or an INN drug stem), medical or general, into its
  parts and writes each part to `anki/reading-room-terms.txt`, tagged
  `medical-word-parts` and routed to the `00 Reading Room::01 Medical Terms` deck
  (ADR-0016 — word parts and whole-word terms share one file now, distinguished by the
  row's `Deck`/`Tags` columns). Domain doesn't gate her — "adjoining" (ad- + join) is as
  much hers as "nephrectomy"; morpheme structure does. No sound/story axis for these
  (no `IPA` column; an `Image` is still optional). She spot-checks parts against the
  `dictionaries/` CLIs.
- **`_nemo`** (`.claude/agents/_nemo.md`) — brainstorms alternative one-sentence 🎭 story
  candidates for a word that's already been explained (pronunciation + definition in
  hand). Suggests only; never explains from scratch, never saves.
- **`_logan`** (`.claude/agents/_logan.md` + `_logan/reference-tables.md`) — scribe for
  `data/mnemonics/log.jsonl`. Structures a picked story + its anchor/technique fields
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
`.claude/skills/english-word-explainer/rhyme/rhyme.py`; for word frequency use
`node scripts/word-freq.js <word>`.

## Ad-hoc corpus / concordance lookups

When Flash wants to see how a word or phrase is *actually used* — attested example
sentences, a KWIC concordance, collocates, or how frequent one phrasing is vs another —
use the **`_corpus_search`** skill (`.claude/skills/_corpus_search/`). It searches a
local Tatoeba English corpus (2M sentences, encoded with CWB/`cqp`) via
`scripts/corpus-search.sh` and prints an aligned concordance. Reporting only — it never
writes Anki or the mnemonic log.

## Building backlog items

Planning and building go through the `backlog` plugin (`backlog@blueflash`): stories live in
`docs/backlog/items/`, and `/backlog:implement <ID>` builds a `ready` one in its own worktree
with the plugin's `teddy` / `qa` / `buzz` agents, then opens a PR. `/backlog:next` says what to
do next. The stack, test commands and bug-numbering rule those agents need are in
`.claude/rules/build.md`. Before `/backlog:refine` sets an item that changes a story
step's rules to `ready`, have `backlog:david` measure it on real data first (see `build.md`).

## Rules

| Read... | ...when you're about to |
|---|---|
| [`.claude/rules/word-workflow.md`](.claude/rules/word-workflow.md) | handle an "explain \<word\>" request (the main loop) |
| [`.claude/rules/scripts.md`](.claude/rules/scripts.md) | run `anki-sync.js`, `find-mnemonic.js`, `classify-word.js`, or a `dictionaries/` CLI |
| [`.claude/rules/build.md`](.claude/rules/build.md) | refine, implement, QA or bug-fix a backlog item (`/backlog:refine`, `/backlog:implement`) |

## Prerequisites for the word agents

- Node.js 18+ (stdlib only; `node:test` needs 18+).
- The `nemo-words` CLI on `PATH` (`~/.local/bin/nemo-words`, JVM 11+, no network).
- Anki desktop running locally with AnkiConnect on `127.0.0.1:8765`, if a task touches
  `anki/*.txt` or runs `scripts/anki-sync.js`.
- The classical dictionary data + vendored repos under `dictionaries/` are gitignored —
  on a fresh clone run each `dictionaries/*/download.sh` then `build-index.js` once
  before `_etta_mology`'s Part 1.5 dictionary spot-check works (see
  `dictionaries/README.md`).
