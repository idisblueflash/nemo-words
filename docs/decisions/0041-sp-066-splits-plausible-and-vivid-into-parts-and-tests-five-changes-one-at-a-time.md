---
status: accepted
deciders: Flash Hu
date: 2026-10-17
backlog: [SP-066, C-048, C-049, C-050, C-051, C-052, C-053]
---

# 0041. SP-066 splits plausible and vivid into parts, and tests five changes one at a time

Technical Story: SP-066 (staged run, after stage 20 of the ADR-0040 run, 2026-10-17)

## Context and Problem Statement

Stage 20 after ADR-0040 gave exact 6 of 20 (30%) and in-three 10 of 20 (50%), below the go bar (45% and 70%, ADR-0031). Flash looked at the 4 words where Jev's pick was furthest from Flash's cell:

* overreach ("Hanging over a peach tree, he stretches too far, falls."): Flash's cell 1 shows the hanging and the stretch; Jev's cell 8 shows only the fall. Flash: the image is an anchor, so more of the story's actions in one cell is better, and the reader imagines the result.
* flustered ("Flipping the mustard, the waiter fumbles, red-faced and nervous."): Flash's cell 6 shows the mustard in the air and a customer seen from the back; Jev's cell 9 shows the mess after. Flash: the customer's back makes the red face and the nerves stronger, and the result needn't be drawn.
* appeal ("A peal of bells attracts a curious crowd."): the list made the crowd the main subject, so the view part scored the crowd's faces (Flash's cell 9, the crowd's back: view 1.18; Jev's cell 6: 2.71). Flash: the main actor is the old man who pulls the bell rope, and the crowd is the onlooker; the back of the crowd leads the eye to him and hides the odd faces of cell 6. The captions list no drawing error for those faces.
* cottage ("Rain caught us on the ridge, by a tiny house."): Flash's cell 3 is a wide view of the ridge, where the house looks tiny next to it (vivid 1.81, because vivid's lowest level says "small, far away"). Jev's cell 8 draws the tiny house large.

Plausible and vivid are each one Jev question today, so a cell's actions, its setting and its drawing errors share one score, and an onlooker has no place to count.

## Decision Drivers

* Each change should be tested on its own, so a change that makes the pick worse can be found and taken back.
* The weight search stays at 3 axes, because 20 tuning words are too few for more weights (ADR-0039).

## Considered Options

For the axes:
* Plausible and vivid scored in parts, as must-see clarity is (ADR-0039): each axis is the mean of its parts
* More axes, each with its own weight
* Keep one question per axis and add the new rules to its check

For how to apply the changes:
* One change at a time on the 20 tuning words; keep it when the pick gets better, take it back (and try another way) when it gets worse
* All five changes in one refine, then the stages once

## Decision Outcome

Chosen options: "Plausible and vivid scored in parts" and "One change at a time", because parts give each rule its own question without new weights, and one change at a time shows which change helps (Flash, 2026-10-17: "one change after one is better").

The five changes, in this order:

1. Plausible has 3 parts: setting (clues to where the scene happens), drawing (a drawing error on a must-see item / on another object / none) and story actions (one action or only the result / some actions / the beginning actions in the story's order; the result can be left out, but when the word names the result, a cell that shows it is good).
2. Vivid has 2 parts: scene (today's vivid question) and onlooker (C-052: a person who draws the eye away / no such person / a person who watches or reacts and makes the feeling stronger). The caption lists the onlookers: who, what they do, and their view.
3. The main subject (C-049) is the one who does the story's action; a group that only reacts (a crowd that the bells attract) is an onlooker; when an object does the action and a person works it (bells that ring), the main subject is that person, the actor (C-051).
4. A size word: an item that the story calls small (tiny) is in its state only when it looks small next to another story item, and vivid and size don't count such an item as "small, far away"; a wide shot that shows the whole place is good for it.
5. The captioner also lists odd faces and hands (a face or a hand drawn wrong) as drawing errors (C-048).

A change is better when, at the start weights (2·1·1), exact plus in-three on the 20 tuning words goes up; at an equal count, when the mean rank of Flash's cell goes down. It is worse when that count goes down. Equal with no better rank is kept only when it fixes the miss it was made for. A change that is worse is taken back (the code and the cached answers), and one other way is tried. The measure words don't run until Flash has seen the result.

### Positive Consequences

* overreach, flustered, appeal and cottage each get a rule that Flash's reason supports.
* The weights stay 3, so the weight search doesn't change.
* Each change's effect on the 20 tuning words is known.

### Negative Consequences

* A Jev request has about 3 more questions per cell (plausible 3 parts, vivid 2 parts): about 7,000 Score questions in all, not 6,000.
* Changes 2, 3 and 5 change the caption or must-see prompt, so the 20 lists or the 180 captions are made again each time; a caption made again can differ from the last one, so some of a change's effect is noise.
* The rules come from 4 words that Flash looked at; the tuning words test them, and the measure words show if they hold.
* Testing a change on the tuning words and keeping the best fits the rules to those 20 words more than one change would.

## Pros and Cons of the Options

### Plausible and vivid scored in parts

* Good, because each rule has its own question, and one part can't pull the whole axis down.
* Bad, because the parts count equally, which is a guess.

### More axes

* Good, because each rule gets its own weight.
* Bad, because 20 tuning words give too little data for 6 or more weights.

### One question per axis with longer checks

* Good, because a Jev request stays the same size.
* Bad, because Jev mixes the rules in one score, as stage 20 showed for overreach (vivid and plausible both favoured the fall).

### One change at a time

* Good, because a change that makes the pick worse is found and taken back.
* Bad, because each change pays for its own Jev requests, and for its own captions when it changes a prompt.

### All five at once

* Good, because it costs one set of calls.
* Bad, because a worse result can't be traced to one change.

## Links

* Refines ADR-0039 (parts for must-see clarity; now also for plausible and vivid)
* Refines ADR-0040 (the main subject)
* Refines ADR-0038 (drawing errors)
* Refines ADR-0033 (vivid scores the scene)
