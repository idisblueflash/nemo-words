# Labeling guidelines — image pick (v3)

Flash labels the grids with these rules. The AI pickers (Claude Sonnet and Qwen VL 8B)
read the same rules in the trials. When a rule is hard to use, change it and add a line
to the change log.

## Goal

AI makes nine candidate cells (a 3×3 grid) from one story sentence. Pick the best cell
of the nine.

## Marks

Give each of the 9 cells one mark.

- `best`: the one cell for the card. Use exactly 1 per grid.
- `ok`: you would accept it too.
- `weak`: not wrong, but you would not use it. A note is optional.
- `wrong`: a clear error. Write why.

If every cell is `weak` or `wrong`, no cell is good. Then the grid has no `best` cell.

## What makes a cell `wrong`

Mark a cell `wrong` when one of these is true. One error is enough.

- A part of the story is missing: an actor, an object or the action. Example: no one
  takes the key.
- The count is wrong. Example: "they" needs 2 or more people, and the cell shows 1.
- The action is a different action. Example: the man pats the door, but the story says
  he knocks.
- The setting is missing when the story names it. Example: no operating room.
- A drawing fault: a bad eye, a bad hand, a broken object, or a body part that you
  cannot read as what it is. Look at the eyes and the faces closely.

Do not mark such a cell `weak` because the rest of it is good.

## What makes a cell `weak`

A cell is `weak` when nothing is wrong, but the camera or the layout hides the story.

- The main actor shows the back, or the camera looks from the top. You cannot see the face.
- The main actor is too small, or another actor is bigger than the main actor.
- An extreme close-up cuts off the place or the other actor.
- The actors are far apart, so the action and its result do not read as one scene.
- The face shows the wrong feeling for the story. Example: joy, not charm; a smile
  where the story needs surprise.
- The action is not clear, or it does not look like the story's action.

## What makes a cell `best` or `ok`

- A quarter view (three-quarter view) of the main actor, so the face and the action both
  show. A side view is second best.
- A close or medium shot that still shows the place or the other actor.
- Small signs that help the story: a question mark, a spark for a power cut, a seam for
  a cut.

## Reason

Write a few lines about why the best cell wins over the next one. Name what you looked
at ("the broom is clear", "only her feet show").

## Before you label

Do not look at an AI pick first. It changes your label.

## Change log

- v0 (2026-10-19): first draft, from SP-064 to SP-070.
- v1 (2026-10-19): add the mark `weak`. Each cell must have a mark. The reason can take
  a few lines. The text is shorter.
- v2 (2026-10-19): the AI pickers read this file too. New goal. Remove the order of
  checks. Remove "none are good": a grid with only `weak` and `wrong` cells has no good
  cell.
- v3 (2026-10-19): add the rules that Flash used in batch 1 but did not write down: what
  makes a cell `wrong`, `weak`, and `best` or `ok`. Sonnet and Qwen on v2 missed 17 of 19
  `wrong` cells and gave `ok` to most `weak` cells.
