---
status: accepted
deciders: Flash Hu
date: 2026-10-17
backlog: [SP-066, C-049, C-050, C-051]
---

# 0040. SP-066's main subject is a person, an animal, a group or the actor

Technical Story: SP-066 (staged run, after the second stage 5, 2026-10-17)

## Context and Problem Statement

ADR-0039 added the main subject's view as a part of must-see clarity, and the must-see list named "the one person or object that the story is about". In the second run of stages 1–5, the list named an object in 3 of 5 words: anomaly's "irregular tile", period's "pier" and sweep's "broom". A tile, a pier or a broom has no clear front or back, so the captioner called their view "above" or "back", and Jev's view scores for the same "above" ran from 1.02 to 1.92. For a person the part worked: surgeon ranked cell 1 (three-quarter) over cell 8 (side) over cell 5 (from above), in Flash's order. In ventilator, the list named the newborn, which only receives the action and lies still in 7 of 9 cells, while the nurse acts and her view changes from cell to cell.

## Considered Options

For what can be the main subject:
* A person, an animal or a group of them, never an object
* One person or one animal only (a group is never the main subject)
* Any item, as in ADR-0039

For a story that names no person (sweep: "grab the broom"):
* The person who does the action is the main subject (the actor), and the gate doesn't check it
* The actor is a must-see item, gated as any other item
* No main subject

For a story with more than one person:
* The one that does the action
* The one that the list call thinks the story is about (as in ADR-0039)

## Decision Outcome

Chosen options: "A person, an animal or a group of them, never an object", "The person who does the action is the main subject (the actor), and the gate doesn't check it" and "The one that does the action", because only a figure that acts has a front, a side and a back that tell the viewer something, and Flash's view order was set on such a figure.

The must-see list gives `mainSubject` as `{name, actor}` or null. A non-actor main subject is one of the items. An actor is not an item: the gate never checks it, a cell that doesn't show it stays in, and its view part gets the lowest level. The rest of ADR-0039 stays: clarity is the mean of its parts, and code caps nothing.

### Positive Consequences

* The view part no longer scores the view of a tile, a pier or a broom.
* sweep gets a view part for the woman who does the action, which Flash's cell 2 shows.
* ventilator's view part follows the nurse, whose view changes from cell to cell.
* The gate is unchanged (ADR-0032), so an actor that a cell leaves out never takes the cell out.

### Negative Consequences

* The must-see list prompt changes, so the 20 lists, the captions of words whose main subject changes and the 5 Jev requests are made again, and the stages start again at 1.
* Code can't tell a person from an object, so the rule rests on the list call; the stage summary prints each main subject to check it.
* "The one that does the action" comes from 5 words; a story where two people act equally can still give either one.
* A word with no person and no action (period) loses the view part.

## Pros and Cons of the Options

### A person, an animal or a group of them, never an object

* Good, because each of these has a view with a meaning, and a group (anomaly's family) also faces the viewer or turns away.
* Bad, because a story about one object has no view part.

### One person or one animal only

* Good, because the view is clearest for one figure.
* Bad, because anomaly's family would give no view part.

### Any item, as in ADR-0039

* Good, because every story gets a view part.
* Bad, because the view of an object is noise (anomaly, period, sweep).

### The actor is the main subject, not gated

* Good, because sweep gets a view part, and the gate stays as it was.
* Bad, because a cell can win without the actor; it only loses on the view part.

### The actor is a must-see item, gated

* Good, because a picked cell always shows the person who acts.
* Bad, because it adds an item that the story doesn't name, and the gate takes out more cells.

### No main subject for a story that names no person

* Good, because it is the simplest rule.
* Bad, because sweep loses the view of the woman, which Flash uses to pick.

### The one that does the action

* Good, because the acting figure's view changes from cell to cell (ventilator's nurse), and it gives the same result as before for surgeon.
* Bad, because the rule comes from 5 words.

### The one the list call thinks the story is about

* Good, because it needs no new rule.
* Bad, because it chose the newborn, which lies still and says little about the cell.

## Links

* Refines ADR-0039 (the main-subject part of must-see clarity)
* ADR-0032: the must-see gate checks item names only (still true; an actor is not an item)
