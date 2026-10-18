---
status: accepted
deciders: Flash Hu
date: 2026-10-18
backlog: [SP-068, C-049, C-050, C-052, C-054]
---

# 0042. SP-068 makes the cause the main subject when the people only react

Technical Story: SP-068 (refine, 2026-10-18)

## Context and Problem Statement

In CASE-001 (appeal, "A peal of bells attracts a curious crowd.") Flash picked cell 9, where the crowd is seen from the back. SP-066's must-see step made the crowd the main subject, so the main-subject view part scores the crowd's back view lowest, while the onlooker part rewards the same back view. Cell 9 ranks 4th. A first draft of SP-068 kept the crowd as the main subject and added a reacting-group view part that scores a back view highest, plus a faces part. Flash's review: the crowd is an onlooker and the bells are the main subject. ADR-0040 says an object is never the main subject, so the rule had to change, and SP-068 had to be reshaped around it: which words it runs on, how it finds the words with a reacting group, whether an object's view counts, and how the faces part is tested.

## Decision Drivers

* Fix the mistake where it is made (the must-see step), as the real pipeline will.
* Spend few calls: reuse SP-066's caches, and keep the 62 measure words unused for the pick after SP-068.
* Measure only what the change can move.

## Considered Options

For the main subject when the people only react:
* The reacting group stays the main subject, with its own view part (back 3, side 2, front, three-quarter or from above 1)
* The cause is the main subject, also when it is an object, and the group is an onlooker

For the view of an object that is the main subject:
* The view part doesn't count for an object
* The view part counts, as for a person

For the words the spike runs on:
* The 20 tuning words and the 62 measure words
* Only the 20 tuning words, which have cached answers

For finding the words with a reacting group:
* One `claude -p` call for each word answers `reacts`
* Jev yes-or-no questions (group, only reacts, cause not a person), combined by the lowest p
* The must-see prompt applies the new rule, and a word whose main subject changes is a word with a reacting group

For the faces part:
* Use it only when the main subject alone doesn't rank Flash's cell 1
* Always run both: run A without it and run B with it

## Decision Outcome

Chosen options: "The cause is the main subject", "The view part counts, as for a person", "Only the 20 tuning words", "The must-see prompt applies the new rule" and "Always run both" (Flash, 2026-10-18).

The crowd is an onlooker, and the onlooker part already scores it. An object has views too, and a three-quarter view of the bells is easier to read than a side view. Only the 20 tuning words have cached must-see lists, captions and Jev answers. The rule belongs in the must-see step, where the real pipeline will use it, and then no separate `reacts` call is needed; a cause that is a person also works, so a "not a person" question would wrongly leave words out. All parts are scored in one Jev request, so the faces part can't be added "only when needed"; it is tested by comparing two runs, and kept only when run B ranks Flash's cell higher than run A and moves no word away from Flash's cell.

### Positive Consequences

* The run makes 20 text calls for the must-see lists, one image call for each word whose main subject changes, and 2 Jev requests for each of those words. The other words keep their cached answers.
* No new view part: the existing view and onlooker parts do the work.

### Negative Consequences

* A new must-see answer can differ in other fields through Claude's normal variation; the run takes only the main subject from it to keep the other caches valid.
* If only appeal gets a new main subject, each decision rests on one word.
* No rate over all words is measured.
* A cause that is a person needs that person's view from a new caption; if no tuning word has one, it isn't tested.

## Pros and Cons of the Options

### The reacting group stays the main subject, with its own view part

* Good, because it reuses every cached caption.
* Bad, because it treats an onlooker as the main subject and needs a view part that reverses the normal one.

### The cause is the main subject

* Good, because it matches Flash's reading and the existing onlooker part.
* Bad, because it changes ADR-0040's rule and needs new captions for the changed words.

### The view part doesn't count for an object / counts as for a person

* Doesn't count: Good, because it needs no view of an object. Bad, because a readable view of the object matters.
* Counts: Good, because a three-quarter view of an object reads better. Bad, because the changed words need new captions to get the object's view.

### 82 words / 20 tuning words

* 82: Good, because it compares directly with SP-066's numbers. Bad, because the 62 measure words have no cache and would be used up.
* 20: Good, because they are cached. Bad, because few words may change.

### A Claude call, Jev questions, or the must-see prompt

* A Claude call per word: Good, because it is simple. Bad, because it adds 82 calls and a step the pipeline doesn't have.
* Jev questions: Good, because they need no `claude -p` call. Bad, because the rule then lives outside the must-see step.
* The must-see prompt: Good, because the rule lives where the pipeline uses it. Bad, because it makes 20 text calls.

### Faces part only when needed / both runs

* Only when needed: Bad, because one Jev request scores all parts, so there is no "only when needed".
* Both runs: Good, because it shows whether the faces part helps or hurts. Bad, because it doubles the Jev requests for the changed words.

## Links

* Refines ADR-0040 (main subject is a person, animal, group or the actor)
* Refines ADR-0041 (change 3, the main subject for a group that reacts)
* Refines ADR-0039 (the clarity parts)
