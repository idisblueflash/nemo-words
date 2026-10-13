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

## Running the card pipeline (Dagu, EN-036 / US-028)

```bash
node scripts/card.js <word>
```

The one-word command: one general-English word in, a synced story card out, with nothing
asked along the way (US-028). Steps, in order: `normalize` → `route` → `judge-route` →
`ipa` → `syllabify` → `define` → `gloss` → `chunk` → `find-keywords` → `draw-arm` → `compose-stories` →
`check-stories` → `judge-stories` → `pick-story` → `story` → `write-row` → `sync` →
`report`. `normalize` lowercases the word, so `WARY` or `Wary` is carded, routed and
judged as `wary`. `judge-stories` (US-038) has Jev judge each story that passed the hard
gates against `scripts/story-rubric.json` (judgment gates + three 1–3 score axes, kept as
decimals); `pick-story` cards the story that passed every gate with the best total (ties:
shorter, then alphabetical) and notes `pick: total N (…)` in the report. If Jev fails, the
first story that passed the hard gates is carded and the report says it wasn't judged.
When `route` finds a logged story for the word (`data/mnemonics/log.jsonl`), the drafting
and judging steps are skipped and the logged story is carded. Stops (exit 1) to expect:
`already carded … current story: …`, the word-part path (`_etta_mology`), `couldn't be routed
automatically`, `no-pick: …` with every candidate's reasons, and `sync failed … re-run
later` (the row stays written; the failure is in `anki/sync.log`), and `no sound anchor found`
(US-041/US-046, below).

`find-keywords` gives each chunk the most frequent common word with exactly its GA IPA
(US-041). When the stressed chunk (`ˈ`; a one-chunk word's only chunk) has none, it falls
back to a rhyme (US-046, `scripts/lib/rhyme.js`): the most frequent one-syllable word with
the same rime, a non-empty onset, a frequency of at least 5e-7, not the headword and not a
function word (drown → `down`, critique's `tik` → `speak`). Other chunks never get a rhyme.
A rhyme line has a 4th column, `ipa\tkeyword\tfreq\trime`. `compose-stories` marks it
`(rhymes)` in the prompt, `check-stories` compares rimes for it instead of the whole sound
(for any of the keyword's GA forms, as `find-keywords` does: `last` is `lˈæst,lˈæs`),
and `log-card` logs `anchor_unit: rime`. A word with no exact keyword on any chunk and no
rhyme for the stressed chunk (e.g. `bulge`) stops with `no sound anchor found`.

Before both of those, `find-keywords` tries the stressed chunk as a **closed chunk**
(US-050, ADR-0025, `scripts/lib/closed-chunk.js`). The rule applies to the chunk with the
primary stress (`ˈ`) of a word with 2 or more chunks, when that chunk ends in /ɪ ɛ æ ʌ ʊ/
and the next chunk starts with a consonant. The closed chunk is the stressed chunk plus that
one consonant sound (/tʃ/ and /dʒ/ are one sound): penalty `ˈpɛ.nəl.ti` → /pɛn/. The closed
keyword is the most frequent word with exactly the closed chunk's GA IPA, a frequency of at
least 5e-7, 3 or more letters, that is not the headword, not a function word, and not a word
that the headword is an inflection of (sweating: not `sweat`). A closed keyword wins over the
open chunk's exact keyword (era: `air`, not `eh`) and over a rhyme (penalty: `pen`, not
`ye`). Its line is an exact line, 3 columns, with the closed IPA (`pɛn\tpen\tfreq`), so the
later steps treat it as an exact keyword and `log-card` logs `anchor_unit: stressed-syllable`.
The next chunk keeps the consonant (elastic: /læs/ `last`, and /stɪk/ is still `stick`), so
the number and order of the lines, and every other chunk's line, stay the same. `syllabify`
and `chunk` do not change: the card's IPA line and the log's syllables still show
`ˈpɛ.nəl.ti`. With no closed keyword (levee, aloe, dozen, paper, cottage), the stressed chunk
gets the result above: the exact keyword, then the rhyme, then none. Covered by
`test/card-us050-*.test.js`.

`draw-arm` (US-051, E02's retention experiment) puts an anchored word with no logged story
in one of two arms. The **story arm** runs the rest of the pipeline as before; its row's
Tags column is `reading-room-terms retention-story` (the `#tags` header repeated, plus the
arm tag), and the report says `story arm`. The **control arm** skips drafting, judging and
logging: its card's Back is `define`'s definition sentence (plus the gloss and IPA as usual,
no image), in deck `00 Reading Room::03 Control Definitions`, tagged `retention-control`, and
the report says `control arm: definition-only card`. The arm counts are the card file's
carded rows per tag. When one arm has 3 or more cards more than the other, the word goes to
the smaller arm; otherwise it's 50/50. `NEMO_ARM=control|story` forces the arm (any other
value: exit 2). Logged-story, no-anchor and word-part words are never drawn and get no arm
tag. Covered by `test/card-us051-*.test.js`; the test harness pins `NEMO_ARM=story` unless
a test asks otherwise.

An `ambiguous` classifier verdict (weak suffix matches only, e.g. `wary`'s `-ary`) doesn't
stop `route`: `judge-route` (US-040) asks Jev whether the word is built from classical
Greek/Latin morphemes or an INN stem, and routes by its p word-part. At 0.3 or below it's
carded as general, and the run report notes `judgment call → general (p word-part 0.12)`.
At 0.7 or above it stops on the word-part path, `— judgment call, p 0.84`. In between it
stops as `couldn't be routed automatically — judgment call unsure, p 0.55`. A logged
story, a `medical` verdict and a no-match word skip the judgment, with no Jev call. If
Jev is unavailable (no key, unreachable, an error or an unusable answer), the run fails
(exit 2) at `judge-route` with `routing failed: judgment service unavailable (…); re-run
later`, and nothing is written. Jev needs `TYPESAFE_API_KEY` in the repo's gitignored
`.env` (or the env file `NEMO_JEV_ENV_FILE` names), and from a CN address a proxy
(`HTTPS_PROXY` etc., forwarded by `card.js`); without one it answers HTTP 451.

Env overrides `ANKI_FILE`, `ANKI_CONNECT_URL`, `ANKI_SYNC_LOG`, `NEMO_MNEMONIC_LOG`,
`NEMO_CLAUDE_BIN`, `NEMO_WORDS_BIN`, `NEMO_WORD_FREQ_BIN`, `NEMO_ARM` work as usual: Dagu doesn't
pass the caller's environment to steps, so `card.js` forwards the set ones as DAG params
(declared in `dags/card.yaml`, exported to every step).

This starts `dags/card.yaml` under Dagu by path, so it needs `dagu` on PATH (`brew install dagu`).
Don't copy the DAG into Dagu's config folder, and don't start it by name: the global
`dags_dir` points at another project. Exit codes and output:

- `0`: succeeded (the last step ran). The last step's result, the run report, goes to stdout.
- `1`: a step stopped cleanly. Prints `stopped at <step>: <reasons>` (reasons joined by `; `).
- `2`: a step failed or crashed, or Dagu is missing or can't run the DAG. Prints
  `failed at <step>:` plus that step's stderr, on stderr.

stderr also names the run and gives the command to inspect it,
`dagu status --run-id <id> <path>/dags/card.yaml`. That command shows each step's
status and its own separate stdout and stderr logs.

Step CLIs follow the step contract in
`docs/backlog/items/EN-036-dagu-runs-the-card-pipeline-as-small-step-clis.md`. Steps
get earlier results as file paths (`${<step>.stdout}` in the DAG; a plain value is read
out with `"$(cat …)"`), and should `require("./lib/step-contract")` so a crash exits 2,
not 1. Dagu step ids must match `^[a-zA-Z][a-zA-Z0-9_]*$`, so hyphenated steps use an
underscore `id` plus a hyphenated `name` (what `dagu status` and `stopped at` show).
Covered by `test/card-pipeline.test.js` (EN-036's ACs, real Dagu, throwaway
`DAGU_HOME`), `test/card-ac*.test.js` + `test/card-logged-story.test.js` (US-028's ACs
end to end through `card.js`), and `test/card-steps.test.js` /
`test/card-dag-steps.test.js` (the step CLIs), and `test/card-us038-*.test.js` (US-038's
scored pick; mock Jev answers story-judging calls from `fixture.judge`). All run against fake `claude` /
`nemo-words` / `word-freq` and a mock AnkiConnect (`test/helpers/card-harness.js`).
`test/card-us040-*.test.js` cover `judge-route` and the lowercasing against a mock Jev.

### Checking Jev's routing accuracy (US-040)

```bash
node scripts/route-accuracy.js [report-path]
```

Puts a labelled set of words to Jev with `judge-route`'s own question and cut-offs, and
writes a Markdown report, by default `docs/backlog/reports/US-040-route-accuracy.md`. The
set is US-028's QA misses, every whole-word row of the card file as general, and every
`e.g. …` example word on its word-part rows as word-part. A word with both labels is left
out and listed. The report gives right / wrong / unsure counts per label at 0.3 / 0.7,
every misrouted word with its p, the words Jev couldn't answer (unjudged, not counted),
and ends with a conclusion on whether the cut-offs hold. It makes one real Jev call per
word (about 500, roughly a minute), with the same `.env` key and proxy needs as
`judge-route`. When every word of one label is unjudged, the report says that label has
no judged words and draws no conclusion on the cut-off it decides (general decides the
lower 0.3, word-part the upper 0.7): that cut-off is held at its current value and only
the other is searched and concluded on. With no argument the default path is used; an
argument that's given but empty or only whitespace (`""`) is refused, not treated as the
default, so a stray empty variable can't overwrite the saved report. Before any word goes to Jev, the report path
(given or default) is checked without creating or touching anything: it must not be a
directory, an existing file must be writable, and for a new file the nearest existing
folder above it must be a writable folder (missing folders are still created when the
report is written). Exit codes: `0` when at least one word was judged
(including the one-label case); `1` (a clean stop) when the report path is empty —
stderr says `report path is empty`, and Jev is never called — or when it can't be
written — stderr says `report path can't be written: <path> (<why>)`, and Jev is never
called — or when Jev couldn't answer for any word:
**no report is written**, to the default path or a given one, so the saved real-Jev
report is never overwritten by an empty run; stderr says no words were judged and that
there is no conclusion on the cut-offs; `2` on a crash. Covered by
`test/card-us040-ac6`–`ac8` and `ac10`–`ac14` against a mock Jev.

### Counting the auto-picked cards Flash kept (US-033)

```bash
node scripts/kept-count.js
```

Reads every `picked_by: "auto"` row of the mnemonic log (the latest row per word), looks
up each word's live card through AnkiConnect, and reports how many auto-picked stories
are still on their cards. Read-only: it writes nothing to Anki or to disk. Each word gets
a kept verdict: `kept` (the story now equals the auto-picked sentence), `overridden` (any
difference, even one typo fix), `removed` (no note; counts as overridden, shown as
`card removed`), or `not-met` (every card of the note has 0 reviews). The window is the
20 most recently auto-picked words that aren't `not-met`:

```
kept 15 of 20 (75%)
meets E01's 70% target
not met yet: 3
overridden:
- wary
    auto-picked: <the auto-picked sentence>
    now: <the story on the card now>
- drown (card removed)
    auto-picked: <the auto-picked sentence>
    now: (card removed)
```

Line 2 is `below E01's 70% target` under 14 kept, and `N more needed for a verdict` (no
verdict) while fewer than 20 words are reviewed. The card is found with `anki-sync.js`'s
own query (`noteQuery`: the row's `Deck` override or the file's `#deck`, plus the exact
`Front`), and the story now is read out of the live `Back` with `storyFromBack`, the
reverse of `composeBack` — both live in `anki-sync.js`. It drops the image, gloss and IPA
pieces and what Anki's editor adds (`<div>`, `&nbsp;`), so those aren't false overrides.
The log sentence is plain text, so only its whitespace is cleaned: a literal `<` or `>` in
it is story text, never a tag.
Exit codes: `0` report printed; `1` (clean stop) `no reviewed auto-picked cards yet` —
also for an empty log or one with no auto rows; `2` `can't reach Anki; re-run with Anki
open`, or `can't read the mnemonic log: …` (missing file, or a line that isn't JSON), with
no count on stdout. Honours `NEMO_MNEMONIC_LOG`, `ANKI_CONNECT_URL` and `ANKI_FILE`.
It takes no options. `--help` / `-h` print a usage text (exit 0); any other argument fails
with `unknown argument: <arg>` plus the usage text (exit 2). Either way nothing is read.
Covered by `test/kept-count-us033-*.test.js` against a mock AnkiConnect
(`test/helpers/kept-count-harness.js`).

## IPA / rhyme / frequency

Not in `scripts/` — see `CLAUDE.md` "Ad-hoc IPA/rhyme lookups" for the `nemo-words` CLI,
`scripts/word-freq.js` for Google-Ngram frequency, and
`.claude/skills/english-word-explainer/rhyme/rhyme.py` for rhyme/near/onset/prefix.
