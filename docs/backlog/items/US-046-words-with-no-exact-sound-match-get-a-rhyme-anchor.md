---
id: US-046
type: story
parent: E01
status: idea
---
# US-046 Words with no exact-sound match get a rhyme anchor

As Flash, I want a word whose chunks have no exact-sound keyword to still get an anchor (a rhyme like crown→drown, or a chunk split like bulb / judge), so that the one-word command cards it instead of stopping at "no sound anchor found".

**Scope (split from US-041, 2026-10-12):** on a 40-word sample, 16 words had no exact-IPA keyword on any chunk and now stop at `no-anchor` (US-041). Flash's own cards for them used rhymes (`anchor_unit: rime`), proper names or chunk splits. Fall back to one of these only when no exact match exists, keeping word-workflow.md's "perfect IPA match" rule for the chunks that have one.
