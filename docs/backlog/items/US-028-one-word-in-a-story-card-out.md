---
id: US-028
type: story
parent: E01
status: in-progress
qa_status: passing
---
# US-028 One word in, a story card out

As Flash, I want to type one word and get a synced Anki card whose story, IPA and gloss were auto-picked, so that I get a usable card without choosing anything.

Thin first slice: no Jev yet. The pick is the first candidate that passes the hard gates; judging by the story rubric is US-038, logging is US-039, ambiguous routing is US-040.

Routing in this slice is only as good as `classify-word.js`'s word lists: a classical-root or INN word it doesn't recognise (e.g. ibuprofen, conduct) is routed general and carded, and some everyday words it over-matches (e.g. trial, period) are stopped as word-part. Catching those is US-040's job (Jev second-checks the classifier's verdict), not this story's.

## Acceptance criteria

```gherkin
Given  a general-English word with no card and no logged story
  - When  Flash runs the one-word command with that word
    - Then  a new card appears in the 00 Reading Room::Terms deck
    - And   its back shows a story sentence, a gloss of 60 characters or fewer, and an IPA line
    - And   Flash isn't asked anything during the run
```

```gherkin
Given  the candidate stories for a word
  - When  the command picks one automatically
    - Then  the picked story has 10 words or fewer and does not contain the word or any inflection of it
    - And   it contains the word's primary sense word
    - And   its sound anchors appear in the word's syllable order, each matching its chunk's US (GA) IPA exactly
```

```gherkin
Given  a word that already has a card with a story
  - When  Flash runs the one-word command with that word
    - Then  the existing card is left unchanged
    - And   the command reports that the word is already carded and shows its current story
```

```gherkin
Given  Anki is not running
  - When  Flash runs the one-word command with a new word
    - Then  the word's row is still written to the card file
    - And   the command reports that the sync failed and that it can be re-run later
    - And   the failure is recorded in the sync log
```

```gherkin
Given  a word that classify-word.js recognises as built from classical Greek/Latin morphemes or an INN drug stem
  - When  Flash runs the one-word command with that word
    - Then  no card is made
    - And   the command says the word belongs to the word-part path (_etta_mology)
```

```gherkin
Given  a word the classifier can't place (an ambiguous verdict)
  - When  Flash runs the one-word command with that word
    - Then  no card is made
    - And   the command says the word couldn't be routed automatically
```

```gherkin
Given  no candidate story passes the hard gates
  - When  the command tries to pick one
    - Then  no card is made and no redraft is attempted
    - And   the command reports why each candidate was rejected
```

## Logic sketch
- **Approach:** the existing agents and skills (`english-word-explainer`, `_nemo`, `update-anki-story`) are reference specs only. Each step is a small CLI run by Dagu (EN-036), implemented as plain code, a Jev decision, or a `claude -p` call. This slice uses code and `claude -p` only.
- **Entities:**
  - Word: text, route (general | word-part | ambiguous), carded, hasStory
  - Explanation: ipa (GA), syllables (stress-marked), senses[], primarySense, gloss (≤60 chars)
  - Chunk: ipa, anchorUnits[], keyword? (none = taught by IPA only)
  - StoryCandidate: sentence, pivot_words, rejectReasons[]
  - Card: the `anki/reading-room-terms.txt` row (Front, Back = story, IPA, Gloss; Image empty, see US-030)
  - SyncResult: ok | failed(reason)
- **States:** received → routed → explained → drafted → checked → picked → written → synced; exits routed → stopped(word-part | ambiguous | already-carded), checked → stopped(no-pick); written → sync-failed.
- **Steps:**

  | Step CLI | Source spec | Executor |
  |---|---|---|
  | `normalize` | — | code |
  | `route` | `classify-word.js`, `update-anki-story` §1, `find-mnemonic.js` | code (wraps) |
  | `ipa` | explainer Step 2 | code (wraps `nemo-words ipa-lookup`) |
  | `syllabify` | explainer Step 2, `_logan` schema | code |
  | `define` | explainer Step 1 | `claude -p` |
  | `gloss` | word-workflow.md card shape | `claude -p` + code length check |
  | `chunk` | `_nemo` process §0 | code |
  | `find-keywords` | `_nemo` §1, "Finding anchor candidates", keyword-frequency check | code (wraps `nemo-words`, `rhyme.py`, `word-freq.js`) |
  | `compose-stories` | `_nemo` §2, "The core technique" | `claude -p` |
  | `check-story` | `_nemo` "Before you return" hard gates, sense lock | code |
  | `pick-story` | — | code |
  | `write-row` | `update-anki-story` §2 | code |
  | `sync` | `anki-sync.js`, `update-anki-story` §3–4 | code (wraps) |

- **Contracts for the CLIs with new logic** (Node scripts in `scripts/`; plain output per EN-036's step contract: result on stdout, one record per line, tab-separated fields, comma-separated lists; notes on stderr; exit 0 ok / 1 stopped with reasons on stdout / 2 error):
  - `syllabify <ipa>` → syllables joined with `.`, stress from CMU. e.g. `syllabify ˈtraɪəl` → `ˈtraɪ.əl`. A g2p-flagged IPA passes through with a stderr warning.
  - `define <word>` → line 1: primarySense (one word); line 2: definition; line 3: all senses, comma-separated.
  - `gloss <word> <primarySense> <definition>` → one line, ≤60 characters; exit 1 if longer.
  - `chunk <syllables>` → one line per chunk: `ipa	anchorUnits` (comma-separated, from `_logan`'s controlled vocabulary).
  - `find-keywords <syllables>` → one line per chunk: `ipa	keyword	frequency`, keyword = exact GA IPA match with the highest frequency above the threshold, or `-` when none. e.g. `find-keywords ˈdʒɝ.ˈmeɪn` → `dʒɝ	-` / `meɪn	main	…`.
  - `compose-stories <word> <primarySense> <chunk-keywords-file>` → 5 lines: `sentence	pivot,pivot`, two-clause shape (anchors first, meaning second). Strips tabs/newlines from model text.
  - `check-story <word> <primarySense> <sentence> <pivots> <chunk-keywords-file>` → exit 0, no output, on pass; exit 1 with one reason per line (e.g. `headword: conceded`) on fail.
  - `pick-story <candidates-file> <checks-file>` → the first passing `sentence	pivots` line, or exit 1 with every candidate's reasons.
- **Rules:**
  - Hard gates (`check-story`): no headword or inflection (case-insensitive, whole word); 10 words or fewer; primarySense word (or its inflection) present; pivots appear in chunk order; each keyword's GA IPA equals its chunk's IPA.
  - A chunk with no exact-IPA keyword stays unanchored and is taught by the IPA line, never by a near match.
  - IPA column = syllables joined with `.`.
  - Write order: row → sync; a failed sync leaves the row written and logs to `anki/sync.log`.
  - No step prompts Flash; no redraft round when nothing passes.
- **Edge cases:** empty or multi-word input is rejected by `normalize`; Front match is case-insensitive; a row with an empty Back counts as "no story" and is patched, not duplicated; a `g2p-synthesized` IPA still runs the anchor check and is flagged in the run report; concurrent runs on one word are out of scope (single user).

## Open questions
- [ ] Frequency threshold for `find-keywords`: assumed a fixed `word-freq.js` cutoff, tuned on a few known words during build.
- [ ] Word logged but not carded: assumed the logged story wins (it was a human pick) and only the card is written.
- [ ] `/prepare-words` assumed to stay as is for now and move onto this pipeline later.
- [ ] Record the stack (Dagu, one small CLI per step, Jev / `claude -p` / code per step) and the `judge-story` rubric move as ADRs. Decided; just not recorded.
