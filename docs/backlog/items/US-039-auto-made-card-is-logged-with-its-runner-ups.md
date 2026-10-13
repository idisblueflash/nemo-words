---
id: US-039
type: story
parent: E01
status: done
qa_status: passing
concepts: [C-001, C-002, C-004, C-005, C-006, C-010, C-013, C-015, C-021, C-024]
---
# US-039 The auto-made card is logged with its runner-ups

As Flash, I want each auto-made card's story and its runner-up candidates recorded, so that I can swap in an alternate later (US-031) and see what I kept (US-033).

**Scope (from US-028's split):** Jev picks `technique` tags from `_logan`'s controlled list; code builds and validates the `data/mnemonics/log.jsonl` row and writes the alternates entry.

## Acceptance criteria

```gherkin
Given  the one-word command has just written a new card's row
  - When  the run finishes
    - Then  the mnemonic log gains one row for the word with its story, sense, syllables, anchor unit, keyword and pivot words
    - And   the row says the story was auto-picked, not chosen by Flash
    - And   the row's technique tags are one or two values from the controlled list
```

```gherkin
Given  the candidate stories drafted for the word
  - When  the card is logged
    - Then  the runner-ups list records every other candidate with its pivot words
    - And   each runner-up that failed a hard gate carries its reject reasons
    - And   the picked story itself is not among the runner-ups
```

```gherkin
Given  the sync to Anki failed
  - When  the run finishes
    - Then  the log row and the runner-ups are still recorded
```

```gherkin
Given  Jev can't be reached while choosing technique tags
  - When  the card is logged
    - Then  the row is written with no technique tags
    - And   the run report says the tags are missing
```

```gherkin
Given  a word that already has a logged story
  - When  the one-word command runs and stops without making a card
    - Then  no new log row and no runner-ups entry are written
```

## Logic sketch
- **Approach:** two new step CLIs after `write-row` in US-028's Dagu flow: `tag-technique` (Jev) and `log-card` (code). Both follow EN-036's step contract. `log-card` runs whether `sync` succeeded or failed.
- **Entities:**
  - LogRow: the `_logan` schema (`.claude/agents/_logan/reference-tables.md`) plus a new field `picked_by`: `auto` | `flash` (a row without it counts as `flash`)
  - StoryCandidate (from US-028): sentence, pivot_words, rejectReasons[]
  - AlternatesEntry: word, chosen, picked_by, date, alternates[] (StoryCandidates), one line in `data/mnemonics/alternates.jsonl`
  - TechniqueTag: one of `_logan`'s 14 values, with its Jev probability
- **States:** adds `written → logged`, reached from both `synced` and `sync-failed`. The stop exits (already-carded, word-part, ambiguous, no-pick) never reach `log-card`.
- **Contracts:**
  - `tag-technique <word> <sentence> <pivots> <chunk-keywords-file>` → one line per tag, `tag	p`, sorted by p descending; exit 2 if Jev fails. One `systemOne` call with 14 Noul questions, one per tag, each worded from the tag's definition in `_logan`'s table.
  - `log-card <word> <picked-file> <candidates-file> <checks-file> <tags-file|-> <run-dir>` → appends one `alternates.jsonl` line and one `log.jsonl` row; `-` for tags means Jev failed. Exit 1 with reasons on stdout if validation fails, and then nothing is written.
- **Rules:**
  - Tags: keep the top tag, plus the second only if its p ≥ 0.5. `story-chain` only when there are 3+ pivot words (enforced in code). Jev failure → `technique: []` and a note in the run report.
  - Row fields: `sense` from `define`; `syllabification` from `syllabify`; `keyword` = the anchored chunks' keywords joined with ` / `; `anchor_unit` = `whole-word` if one chunk covers the word, otherwise the stressed chunk's unit if it is anchored, otherwise the first anchored chunk's unit; `recall_check` null; `date` today; `picked_by` `auto`.
  - Validate before any write: `anchor_unit` and every tag in the controlled vocabulary, no headword or inflection in the sentence, required fields non-empty.
  - Runner-ups = every candidate except the picked one, each with its reject reasons (US-031 offers only those with none).
  - Write order: alternates line, then log row. A crash in between leaves an orphan alternates line, which is harmless because lookups are by word.
- **Edge cases:** only one candidate drafted → `alternates: []`; a `g2p`-flagged IPA is logged as is; no existing `alternates.jsonl` (the file doesn't exist yet), so there's no old string-shaped format to migrate.

## Open questions
- [ ] `picked_by` must be added to `_logan`'s reference table and its validation, as part of this story.
- [ ] `/prepare-words` writes runner-ups as plain strings; assumed it moves to this object shape when it moves onto the pipeline (see US-028's open question).
- [ ] The tag rule (top 1, plus a second at p ≥ 0.5) is tunable; only the chosen tags are logged, not the raw probabilities.
