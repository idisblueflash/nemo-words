---
id: E07
type: epic
status: active
persona: Flash
concepts: [C-003, C-018, C-022, C-023, C-024]
---
# E07 Flash's cards get their sounds and meanings from one US dictionary

**Outcome:** Every IPA string, syllable split and sound-anchor match comes from the macOS New Oxford American Dictionary (NOAD), in one canonical US format, so exact-IPA matching is consistent.
**Success signal:** On the card file, the mnemonic log and a word sample, the NOAD tool finds at least as many exact sound anchors as the CMU-based tools, and every IPA difference between the two is explained. SP-052's go bar (at least 95% as many) is only the gate for starting the epic. "At least as many" is the bar for the finished epic, and US-055's inflections should help close the gap.
**Assumption tested:** #3 (each story step's rules need research on real data; the exact-IPA rule left 14 of 40 sample words with no anchor).
**Out of scope:** Switching the Dagu card pipeline over to NOAD (a later story, after the comparison); personal names (they stay with the old tools); RP pronunciations. The NOAD extract is local only: never committed, never in the release jar. Decision: Claudepot 39feb3d3.
