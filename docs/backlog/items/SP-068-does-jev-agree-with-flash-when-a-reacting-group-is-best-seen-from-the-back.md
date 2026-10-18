---
id: SP-068
type: spike
parent: E01
status: ready
timebox: 1d
depends_on: [SP-066]
concepts: [C-049, C-050, C-052, C-053, C-054]
---
# SP-068 Does Jev agree with Flash's image pick when a reacting group is best seen from the back?

**Question:** When the people in a story only react to a cause (appeal's crowd and the bells), the cause is the main subject and the people are onlookers. If the must-see step names the cause as the main subject, does Jev pick Flash's cell?

**Why now:** In CASE-001 Flash picked cell 9, where the crowd is seen from the back. SP-066 made the crowd the main subject and gives a back view its lowest view score, so cell 9 ranks 4th. US-030 and US-032 wait on an image pick that works.

## Done when
- Which of the 20 tuning words get a new main subject. Only these words have cached answers.
- For each of those words: the rank of Flash's cell before, in run A (new main subject) and in run B (run A plus the faces part).
- 0 other words change their pick.
- Go when appeal's cell 9 ranks 1 and no word with a new main subject moves away from Flash's cell. The faces part is kept only when run B ranks Flash's cell higher than run A and moves no word away from Flash's cell.

## Approach
- Copy `spikes/sp-066/` and reuse its cached answers.
- Add the rule to the must-see prompt: when the people only react to a cause, the cause is the main subject, even when it is an object, and the people are onlookers (C-049, C-054). Make the 20 must-see lists again (20 text calls). Take only the main subject from the new answer, and keep the cached items and other fields.
- A word whose main subject changes gets a new caption (one image call for each grid). The other words keep their cached captions and Jev answers.
- The view part stays as it is and scores the new main subject, also an object: front or three-quarter 3, side 2, back or from above 1.
- Run A: the new main subject. Run B: run A plus a faces part for the onlookers that only react: no faces seen, or faces small or turned away 3; a few large front faces 2; many large front faces 1. Each run is one Jev request for each word with a new main subject.
- The run takes a word list and caches its answers.

## Open questions
- [ ] Appeal's margin may be small and within Jev's noise. The scene part also scores cell 9 low, and this spike leaves the scene part as it is.
- [ ] If only appeal gets a new main subject, each decision rests on one word.
- [ ] The faces part counts the same as each clarity part. That is a guess.
- [ ] A cause that is a person (a juggler) also becomes the main subject. If none of the 20 words has one, this spike doesn't test that case.
