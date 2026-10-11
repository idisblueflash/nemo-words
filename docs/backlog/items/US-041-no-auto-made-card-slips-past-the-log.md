---
id: US-041
type: story
parent: E01
status: idea
---
# US-041 No auto-made card slips past the log

As Flash, I want every auto-made card to have its log row and runner-ups, and to be told when anything about that logging went wrong, so that US-031's swap and US-033's kept-count never silently miss a card.

**Scope (follow-ups from US-039's QA):**
- **A story with no keyword at all never becomes a card.** Today a picked story where no chunk got a keyword is carded and synced (exit 0), but `log-card` refuses the row (`anchor_unit: empty; keyword: empty`), so there's no log row and no alternates entry. Fix upstream, not by loosening `_logan`'s schema: `check_stories` treats "no chunk anchored" as a hard-gate failure, so `pick_story` takes the next candidate, or the run stops at the existing no-pick path. A story with *some* chunks unanchored (no perfect-IPA match, per word-workflow.md) still passes.
- **The missing-tags note survives a sync stop.** When Jev is unreachable *and* the Anki sync fails, the run stops at `sync` and the `report` step never runs, so nothing says the row was logged with `technique: []`. The stop message should still carry it.
- **Duplicate candidate sentences don't drop a runner-up silently.** The runner-up filter compares sentences only, so a candidate with the picked sentence but different pivots disappears too. Decide whether it counts as a runner-up (minor).

**Before refining:** how often the no-keyword case happens with the real dictionary is unknown — `_qa` only hit it with mock data. A quick `_david` count on real words would say whether the first bullet is urgent.
