---
id: E01
type: epic
status: active
persona: Flash
concepts: [C-001, C-004, C-017, C-019]
---
# E01 Walking skeleton: Flash types a word and a finished card lands in Anki, nothing to pick

**Outcome:** One command turns a word into a complete card (story, image, IPA, gloss) synced into Anki, with the story and image auto-picked. The PoC's two human pick gates (`/new-word-card` steps 4 and 6) become optional overrides, not required steps.
**Success signal:** Over 20 consecutive words, Flash keeps at least 70% of the auto-made cards unchanged after meeting them in Anki review.
**Assumption tested:** #2 (auto-pick is good enough) and #4 (cheap and fast enough), both in a rough first form.
**Out of scope:** Improving pick quality (E03), cost/latency tuning (E04), word-part / classical-morpheme cards, importable deck files (E05).
