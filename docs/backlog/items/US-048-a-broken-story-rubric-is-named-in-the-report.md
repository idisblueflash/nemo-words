---
id: US-048
type: story
parent: E01
status: ready
depends_on: [US-038]
---
# US-048 A broken story rubric is named in the report

As Flash, I want the run report to say plainly when the story rubric file is broken, so that I notice the scored pick has stopped working instead of getting first-passing picks without knowing it.

**Why:** split from US-038's QA (2026-10-12). US-038's logic sketch wants a malformed `story-rubric.json` to be "loud in the report", but the note shows only the raw JSON parse error (`Expected property name or '}' in JSON at position 2`), which doesn't point at the file and reads like a bad Jev answer. Until Flash notices, every card falls back to the first story that passed the hard gates.

## Acceptance criteria

```gherkin
Given  scripts/story-rubric.json is malformed or missing
  - When  Flash runs the one-word command
    - Then  the card still gets the first story that passed the hard gates
    - And   the run report's "not judged" note names scripts/story-rubric.json and gives the reason
```

```gherkin
Given  scripts/story-rubric.json is valid JSON but a gate has no summary question or an axis lacks 3 levels
  - When  Flash runs the one-word command
    - Then  the card still gets the first story that passed the hard gates
    - And   the note names the rubric file and the missing piece
```

```gherkin
Given  the rubric file is fine but Jev is unavailable
  - When  Flash runs the one-word command
    - Then  the "not judged" note gives Jev's cause, not the rubric file, as before this story
```

## Logic sketch
- **Entities:**
  - StoryRubric (from US-038, `scripts/story-rubric.json`): gates (summary + split-out questions), axes (label + 3 levels). Unchanged.
  - RubricProblem (new, in memory only): path (repo-relative, `scripts/story-rubric.json`), reason (`not found`, the parse error, or the missing piece, e.g. `gate animal-harm has no summary question`, `axis vivid has 2 levels, needs 3`)
- **States:** uses US-038's `checked → unjudged → picked` fallback; a rubric problem takes that path before any Jev call.
- **Rules:**
  - `judge-stories` loads and shape-checks the rubric first, before any Jev call. The shape check is the same one `story-rubric.json`'s own test runs (every gate has a summary and ≥ 1 split-out question, every axis 3 levels); share it rather than duplicate it.
  - Any read, parse or shape failure → exit 2, stderr `stories not judged: can't read scripts/story-rubric.json (<reason>); picked the first that passed the hard gates`. The rest of the fallback (pick-story `-`, log-card reads the checks file) is US-038's, unchanged.
  - A rubric problem means Jev is never called.
  - Jev failures keep their current note wording; only rubric problems name the file.
- **Edge cases:** missing file → reason `not found`; empty file → the parse error; several shape problems → name the first one found (enough to point Flash at the file); a rubric problem when every story failed a hard gate → no-pick as today (nothing to judge, so the rubric isn't read — or is read and ignored; either is fine as long as the no-pick output is unchanged).

## Open questions
- [ ] Whether to stop the run instead of falling back on a broken rubric: decided no — US-038 chose fallback so a card still gets made; this story only makes the fallback visible.
