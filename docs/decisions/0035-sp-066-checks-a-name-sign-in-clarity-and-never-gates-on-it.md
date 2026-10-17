---
status: accepted
deciders: Flash Hu
date: 2026-10-17
backlog: [SP-066, C-034, C-043]
---

# 0035. SP-066 checks a name sign in must-see clarity and never gates a cell on it

Technical Story: SP-066 (staged run, after stage 2, 2026-10-17)

## Context and Problem Statement

A name anchor is a name in the story, such as "Nurse Venice". A drawing can't show a name, so SP-064 and the first SP-066 refine made the name into its visible sign: one must-see item, "nurse with a nametag that reads Venice". The nametag is how the keyword reaches the picture.

In stage 2 of SP-066's staged run, the captioner marked that item hidden whenever the nametag was too small to read. This happened in cells 1, 3 and 6 of ventilator, and the gate took all three out. Flash thinks cell 1 is the best cell: the nurse opens the door, which hints at "returns". A close-up shot, which the main action often needs, makes the nametag small. So a gate on the nametag removes good cells for a small piece of text. The card also prints the story sentence, so the name reaches Flash as text anyway.

## Considered Options

* Keep the nametag as a gate item (SP-064; Flash, earlier on 2026-10-17)
* Gate on the carrier, and check the name as a name sign in must-see clarity
* Change `_vivian`'s brief to put the name on a large surface (a sign on the door or on the incubator)

## Decision Outcome

Chosen option: "Gate on the carrier, and check the name as a name sign in must-see clarity", because it keeps the name anchor visible and still worth more when it can be read, but it stops a small nametag from taking out a cell that is good in other ways. It works on the 82 grids that SP-066 measures, so it doesn't change the spike's data.

The must-see list gives the carrier as a must-see item (`nurse`) and the name as a name sign (`Venice`). Code looks for the sign's text in the caption's readable text, ignoring case and punctuation. If the text isn't there, code caps must-see clarity at 2 (the middle level). A name sign never takes a cell out.

### Positive Consequences

* Cells such as ventilator 1, 3 and 6 are scored again, not gated out.
* The cap is applied in code, so the result doesn't depend on Jev and is easy to test.
* The caption's readable text is already in SP-064's caption fields, so the captioner needs no new field for this.

### Negative Consequences

* The must-see lists change, so the 20 tuning lists and the stage 1–2 Jev requests are made again, and the stages start again at 1.
* The match is plain text: a name that the captioner misreads ("Venise") counts as unreadable.
* A cell with an unreadable name can still win, so the picked image may not show the keyword.

## Pros and Cons of the Options

### Keep the nametag as a gate item

* Good, because a picked cell always shows the keyword.
* Bad, because a close-up makes the nametag small, and the gate then removes cells that Flash likes best (ventilator cell 1).

### Gate on the carrier, and check the name as a name sign in must-see clarity

* Good, because a readable name still counts for more, and a small one no longer removes the cell.
* Bad, because the plain-text match can miss a name that is drawn but misread.

### Change `_vivian`'s brief to put the name on a large surface

* Good, because it fixes the cause: a close-up still shows the name.
* Bad, because it changes how the grids are drawn, so it can't be measured on SP-066's 82 grids. It belongs in a later story for `_vivian`.

## Links

* ADR-0032: the must-see gate checks item names only (still true; a name sign is not an item)
* ADR-0036: the other decision made after stage 2
