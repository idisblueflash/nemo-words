---
id: US-041
type: story
parent: E01
status: done
qa_status: passing
depends_on: [US-039]
concepts: [C-001, C-003, C-005, C-006, C-007, C-008, C-010, C-011, C-013, C-020, C-024]
---

# US-041 No auto-made card slips past the log

As Flash, I want every auto-made card to have its log row and runner-ups, and to be told when anything about that logging went wrong, so that US-031's swap and US-033's kept-count never silently miss a card.

**Scope (follow-ups from US-039's QA):**

- **A story with no keyword at all never becomes a card.** Today a picked story where no chunk got a keyword is carded and synced (exit 0), but `log-card` refuses the row (`anchor_unit: empty; keyword: empty`), so there's no log row and no alternates entry. Fix upstream, not by loosening `_logan`'s schema: `check_stories` treats "no chunk anchored" as a hard-gate failure, so `pick_story` takes the next candidate, or the run stops at the existing no-pick path. A story with *some* chunks unanchored (no perfect-IPA match, per word-workflow\.md) still passes.
- **The missing-tags note survives a sync stop.** When Jev is unreachable *and* the Anki sync fails, the run stops at `sync` and the `report` step never runs, so nothing says the row was logged with `technique: []`. The stop message should still carry it.
- **Duplicate candidate sentences don't drop a runner-up silently.** The runner-up filter compares sentences only, so a candidate with the picked sentence but different pivots disappears too. Decide whether it counts as a runner-up (minor).

**Measured (2026-10-12, refine):** `find-keywords` run on 40 logged words found no keyword for any chunk on 16 (40%) — e.g. stew, latch, drown, flux, bulge, vapor, critique, stampede. Flash's own cards for these used rhymes (crown→drown), proper names (Stu) or chunk splits (bulb / judge), which `find-keywords`' exact-IPA, most-frequent, never-the-headword rule can't produce. Keywords are found once per word before drafting, so when none exist every candidate fails together: there is no "next candidate". So the first bullet becomes an early stop, not a hard gate, and widening the anchor search is split out to US-046.

## Acceptance criteria

```gherkin
Given  a word where no syllable chunk has a common word with exactly its sound
  - When  Flash runs the one-word command with that word
    - Then  no card is made and no story is drafted
    - And   the command stops with "no sound anchor found", listing each chunk's IPA
    - And   no log row and no runner-ups entry are written
```

```gherkin
Given  a word where some chunks have a keyword and others have none
  - When  Flash runs the one-word command
    - Then  the card is made, logged and synced as before
    - And   the log row's keyword lists only the anchored chunks
```

```gherkin
Given  a word with no sound anchor that already has a logged story
  - When  Flash runs the one-word command
    - Then  the logged story is carded as before, and nothing stops it for lack of an anchor
```

```gherkin
Given  Jev can't be reached while choosing technique tags, and the sync to Anki fails
  - When  the run stops at the sync
    - Then  the stop message gives the sync failure
    - And   it also says the row was logged with no technique tags
```

```gherkin
Given  the card's row failed log validation, and the sync to Anki fails
  - When  the run stops at the sync
    - Then  the stop message also says the card was not logged, and why
```

```gherkin
Given  a drafted candidate with the same sentence as the picked story but different pivot words
  - When  the card is logged
    - Then  that candidate is not among the runner-ups
    - And   every candidate with a different sentence still is
```

## Logic sketch
- **Approach:** three small changes, no new step. (1) `find-keywords` stops the run when no chunk gets a keyword; the DAG's existing skip cascade then skips `compose-stories` → `report`, so nothing is drafted, written, logged or synced. (2) `card.js` appends `log-card`'s notes to a stop at `sync`. (3) `log-card`'s runner-up rule already drops a candidate whose sentence equals the picked one; AC6 pins that with a test and a comment. The item's original idea, a `check-stories` hard gate for "no chunk anchored", isn't needed, since the run stops before any candidate exists. `log-card`'s `keyword: empty` validation stays as a backstop.
- **Entities** (names shared with US-028 / US-039):
  - ChunkKeyword: ipa, keyword | null, frequency; one per syllable chunk from `find-keywords` (unchanged)
  - StopMessage: what `card.js` prints, `stopped at <step>: <reasons joined by "; ">`; at `sync` it also carries the run's log notes
  - LogNote: a `log-card` stderr line, either `technique tags missing: …` or `not logged: <reasons>`
  - AlternatesEntry / StoryCandidate: unchanged
- **States:** adds `chunked → no-anchor` (exit 1 at `find-keywords`), a stop exit beside already-carded, word-part, ambiguous and no-pick; like them it never reaches `write-row` or `log-card`. The logged-story path skips `find-keywords`, so it can't reach `no-anchor`. `sync-failed` is unchanged except for its message.
- **Contracts:**
  - `find-keywords <syllables> [word]`: at least one chunk anchored → exit 0, output as today. Every chunk `-` → exit 1, stdout `no sound anchor found` then the existing `ipa\t-` line per chunk, so `card.js` prints e.g. `stopped at find-keywords: no sound anchor found; kɹɪ	-; tik	-`.
  - `card.js`, on a stop at `sync`: appends every non-empty line of `log-card`'s stderr log to the reasons, after sync's own. Other stops are unchanged (`log-card` never ran before them).
- **Rules:**
  - "No sound anchor" = every chunk lacks a keyword. One anchored chunk is enough (AC2); unanchored chunks are taught by the card's IPA line (word-workflow.md).
  - A one-chunk word with no keyword (stew, latch, drown) is a no-anchor word too; the headword is still never its own anchor.
  - A runner-up is any candidate whose sentence differs from the picked sentence (exact string compare); pivot words don't count.
  - `log-card` keeps its `keyword: empty` validation; it should no longer fire on a pipeline run, but guards the CLI called directly.
- **Edge cases:**
  - A no-anchor word with a logged story is carded (AC3): already true via `find_keywords`' precondition skip; pin it with a regression test.
  - A sync stop where `log-card`'s stderr is empty (tags fine, logged fine) → stop message unchanged.
  - A sync stop where `log-card` was skipped (logged-story path): its stderr path stays unresolved, so `card.js` treats a missing log as "no notes", never a crash.
  - Two non-picked candidates with the same sentence: both kept as drafted (out of scope).

## Open questions
- [ ] Words that stop at `no-anchor` (about 40% on the sample) get no card from the pipeline until US-046 widens the anchor search; Flash cards them by hand meanwhile.
- [ ] Existing card tests whose fake `nemo-words` / `word-freq` give no keyword for any chunk will now stop at `find-keywords`; their fixtures need at least one anchored chunk.
- [ ] Duplicate sentences among the runner-ups themselves aren't deduped; revisit if US-031's swap list shows repeats.
- [ ] US-038 (ready) also edits `pick-story` / `log-card`; expect a merge conflict, not a build dependency.
