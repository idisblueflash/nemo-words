---
id: US-062
type: story
parent: E02
status: idea
concepts: [C-016, C-018, C-028, C-029]
---
# US-062 See whether story cards lapse less often than control cards

As Flash, I want to compare my story-arm cards with my control-arm cards from my real Anki reviews, so that I learn whether mnemonic cards really outlast definition cards (VISION.md assumption #1).

**Scope:** the comparison that US-051 left for E02's next story. It finds the cards by the two arm tags, `retention-story` and `retention-control`, and compares the arms on two measures: the lapse rate, and the share of cards that reach a 21-day interval. It gives a verdict only when each arm has at least 30 cards with enough review time. Today the card file has 0 rows with either arm tag, so this story can't give a verdict yet.
