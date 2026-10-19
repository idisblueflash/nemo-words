# Labeling guidelines — image pick (v2)

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
- `wrong`: a clear error (missing item, wrong action, wrong count). Write why.

If every cell is `weak` or `wrong`, no cell is good. Then the grid has no `best` cell.

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
