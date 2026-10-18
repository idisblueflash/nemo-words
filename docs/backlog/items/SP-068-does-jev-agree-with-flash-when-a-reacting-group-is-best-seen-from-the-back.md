---
id: SP-068
type: spike
parent: E01
status: idea
timebox: 1d
depends_on: [SP-066]
concepts: [C-045, C-046, C-048, C-049]
---
# SP-068 Does Jev agree with Flash's image pick when a reacting group is best seen from the back?

**Question:** If a main subject that only reacts to a cause that is not a person (a crowd that bells attract) gets its own view question, where a back view toward the cause scores highest, and an optional faces question scores a group with few large front faces higher, does Jev move toward Flash's cell without making the pick worse on the other words?

**Why now:** Flash's review of CASE-001 (2026-10-18) gives three reasons for a back view of a reacting crowd. (1) The story reads as the cause (the sound of the bells) pulling the crowd in. In front or three-quarter views (appeal cells 1 and 6), the crowd looks interested in the old man who pulls the rope. (2) Fewer faces show, so there are fewer of the odd faces that AI images often have. (3) The reader's eye goes to what the crowd looks at (the bell). SP-066's rubric scores the opposite way: its main-subject view part gives a back view the lowest level, so appeal cell 9 gets 1.21 on that part and cells 1 and 6 get about 2.7 (`reports/SP-066-appeal-case.md`). ADR-0039 added "a back view is best" to that part's check, but Jev followed the levels instead (1.09), so the rule needs its own levels. The onlooker part can't help either: the captioner writes "looks up at the bell" for most cells, so cells 1, 5 and 9 all get 3.00. US-030 and US-032 wait on an image pick that works.

**Changes to SP-066's run (to refine):**
- The must-see call marks a main subject that only reacts to a cause that is not a person (`reacts: true`). Code, not Jev, then uses the new reacting-group view part in place of the main-subject view part.
- Reacting-group view part: 3 = seen from the back, facing the cause; 2 = side; 1 = front or three-quarter (facing the viewer, or a person who is not the cause).
- Faces part (optional, only for a group): 3 = the group's faces are small or turned away; 1 = many large faces turned to the front. It uses the views that the captioner already gives, and does not ask the captioner to find odd faces (change 5 of ADR-0039 tried that and was taken back).
- Each part is tested one at a time, as in ADR-0039.

**Risk:** of SP-066's 20 tuning words, only appeal clearly has a reacting group (anomaly's family and cocked's cat may count). The tuning words can hardly show a gain larger than noise (2 or less, ADR-0039), so the change can be kept only when it moves appeal toward cell 9 without making the others worse. The measure words are the real test. Before refining, `backlog:david` counts how many of the 82 words have a main subject that reacts.

**Done when:** for the tuning words and the measure words, we have the exact and in-three rates next to SP-066's, appeal's rank of cell 9 (CASE-001), and how many words the new parts apply to; and a keep or take-back decision for each part.
