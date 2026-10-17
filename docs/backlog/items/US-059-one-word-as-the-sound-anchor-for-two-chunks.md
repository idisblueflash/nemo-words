---
id: US-059
type: story
parent: E01
status: idea
concepts: [C-003, C-005, C-024, C-025, C-038]
---
# US-059 One word as the sound anchor for two chunks

As Flash, I want one common word to be the sound anchor for two or more whole chunks next to each other (infusion → fusion, weathered → whether), so that a card has one clear anchor in place of two weak ones.

**Scope (split from US-050, 2026-10-13):** investigation-007: a span of whole chunks exists for 48 weak chunks in 28 of 316 words, and it fits 7 of Flash's own 230 anchors. It cards 0 more words than today. It needs a new keyword-line format in `find-keywords` (one keyword for two chunks), changes in `compose-stories`, `check-stories`, `judge-stories` and `log-card`, and a guard against words from the headword's own family (apprentice for apprenticeship).
