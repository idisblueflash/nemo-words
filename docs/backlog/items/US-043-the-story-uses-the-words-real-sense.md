---
id: US-043
type: story
parent: E01
status: idea
concepts: [C-001, C-002, C-014]
---
# US-043 The story uses the word's real sense

As Flash, I want the story drafted for the sense the word is actually used in, checked against real example sentences, so that the card doesn't teach a rare or wrong meaning.

**Scope (split from US-038):** corpus context for the word (`scripts/corpus-search.sh`), then Jev locks the primary sense word from it, replacing `define`'s guess.
