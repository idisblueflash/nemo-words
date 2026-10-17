---
status: accepted
deciders: Flash Hu
date: 2026-10-17
backlog: [SP-064, US-030, US-032, C-039]
---

# 0033. A mnemonic image uses a normal camera angle, not an extreme one; vivid comes from the scene

Technical Story: SP-064 (analysis of the word exotic, 2026-10-17)

## Context and Problem Statement

A card's image helps an ESL learner anchor the story's scene, so the word comes back
with the picture. The learner sees the card for a few seconds in a review, and must
find each story object and link it to a word of the story.

SP-064's rubric (`spikes/sp-064/image-rubric.json`) gives the top *vivid* level to
"an extreme close-up or a strong camera angle", and the lowest to "a flat, distant or
ordinary shot at eye level". For exotic ("The exhibit's robotic guide described foreign
artifacts."), the pick was cell 4, a high angle from above with the artifacts small.
Flash picked cell 1, an eye-level medium shot with every object large and clear. Vivid
alone made the difference (2.41 against 1.07); with the vivid weight at 0, cell 1 wins.
Across the run, Flash picked cell 1 (usually the flat eye-level shot) in 28 of 82 words,
and vivid alone gets 6% exact, below the chance rate. Which camera angle should a
mnemonic image use, and what should "vivid" reward?

## Decision Drivers

* The learner must recognize each story object fast, in a review of a few seconds.
* Each story object must be large and whole, so it maps to its word in the story.
* The image must still be memorable.
* The auto-pick should agree with Flash's own picks.

## Considered Options

* A normal camera angle by default (eye level, medium shot, every story object large and whole); vivid comes from the scene's content
* An extreme angle or an extreme close-up, as SP-064's vivid axis rewards it

## Decision Outcome

Chosen option: "A normal camera angle by default; vivid comes from the scene's
content", because objects are recognized fastest from a familiar view (the "canonical
view", Palmer, Rosch and Chase, 1981), and the memory gain of an image comes from its
content: story objects that act on each other (Bower's interactive imagery) and, less
reliably, an unusual scene (the bizarreness effect). No known research shows that a
camera angle helps a learner remember a word. Flash's own picks agree.

Two exceptions keep an unusual angle:
* the story is about a view (looking down from a ridge, something that looms over a person);
* the story has one main object, and a close-up of it is the clearest picture.

What this means:
* The vivid axis rewards the scene, not the camera: 3 = the story objects are large and act on each other clearly; 2 = they are clear but don't act on each other; 1 = they are small, far away or apart.
* A camera angle counts against a cell only when it makes a story object hard to see, and that check belongs to must-see clarity, not to vivid.
* `_vivian`'s briefs can ask for eye-level, medium shots as the base, except for the two cases above.

### Positive Consequences

* The pick's vivid axis stops working against Flash's picks.
* Story objects stay large and whole, so the learner links them to the story faster.
* Must-see clarity and vivid stop pulling in opposite directions.

### Negative Consequences

* Cards may look more alike, which can make one card's scene harder to tell from another's; the scene's content has to carry the difference.
* The new vivid axis needs object size and object interaction in the captions, which SP-064's captions don't give yet.
* A grid with fewer varied angles gives less choice among 9 cells.
* The decision rests on one sample word, Flash's pick counts and general research, not on a measured re-run; a follow-up spike has to measure it.

## Pros and Cons of the Options

### A normal camera angle by default; vivid comes from the scene's content

* Good, because familiar views are recognized fastest.
* Good, because every story object stays large and whole.
* Good, because it matches Flash's picks (cell 1 in 28 of 82 words).
* Bad, because cards can look alike.

### An extreme angle or an extreme close-up

* Good, because each picture looks more different from the others.
* Bad, because the learner needs more time to understand the view.
* Bad, because close-ups cut objects off and strong angles make them small (exotic cells 2, 4, 5, 6).
* Bad, because it scores against Flash's picks (vivid alone: 6% exact, below chance).

## Links

* `docs/backlog/reports/SP-064-must-see-image-pick.md`
* `spikes/sp-064/image-rubric.json` (the vivid axis this decision changes for later work)
* ADR-0008 and ADR-0009 (house style of the images)
* ADR-0032 (the must-see gate checks item names only)
