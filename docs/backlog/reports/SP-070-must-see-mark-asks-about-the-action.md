# SP-070 Does a must-see mark that asks about the action catch the cells that cut off the action?

Run 2026-10-19, stage 1 of 4 only (grid anomaly, 9 cells, 16 gold items in 5 gold cells).
Flash stopped the spike after stage 1. So this report gives no verdict.
The code is in `spikes/sp-070/` (`run.js`, `lib/caption.js`, `lib/pick.js`, `image-rubric.json`).
The cached captions and Jev answers are in `spikes/sp-070/raw/`, so a later run continues
from stage 2 and does not pay for anomaly again.

## What changed

- The must-see mark is now `visible` / `part only` / `hidden`. The caption prompt gives the 3
  meanings from the item card. The captioner still does not see the story, so it decides
  "the part that acts" from the picture.
- The completeness part of must-see clarity scores `part only`, not edge cuts.
- Size, place and the other caption parts are the same as in SP-066 change 4.

## Checks after stage 1

- Sonnet: 9 of 9 captions parse and use only the 3 marks. The 8B model (`qwen/qwen3-vl-8b+schema`): also 9 of 9.
- A re-run made 0 new caption calls and 0 new Jev calls.

## Gold set (stage 1 only)

| | Sonnet | 8B model |
|---|---|---|
| Same as gold | 14 of 16 | 10 of 16 |
| `visible` | 10 of 11 | 10 of 11 |
| `part only` | 1 of 1 | 0 of 1 |
| `hidden` | 3 of 4 | 0 of 4 |
| False `part only` (gold `visible`) | 0 | 1 |
| Anomaly cell 4, family | `part only` (right) | `visible` (wrong) |

- Sonnet's misses: the knock in cell 4 is `part only` (gold `hidden`), and the irregular tile in
  cell 4 is `hidden` (gold `visible`).
- The knocks: Sonnet marks cell 2 `visible`, cell 4 `part only`, and cells 6 and 8 `hidden`. The
  8B model marks all 4 knocks `part only`.
- The full bar needs 301 items. 16 items cannot settle it.

## Agreement (stage 1 only)

The 8B model gives the same mark as Sonnet on 30 of 36 must-see items (83%). The bar is 90%.
The 8B model marks no item `hidden`.

## Pick (stage 1 only)

Weights 2·1·1. Flash's cell is 1.

| Line | Main cell | Top 3 | Rank of Flash's cell |
|---|---|---|---|
| SP-066 change 4 | 7 | 7, 1, 5 | 2 |
| Sonnet's new marks | 7 | 7, 1, 5 | 2 of 5 (0.32 below cell 7) |
| Sonnet's captions, 8B model's new marks | 7 | 7, 1, 3 | 2 of 9 (0.28 below cell 7) |

With Sonnet's marks, the gate removes cells 2, 4, 6 and 8. With the 8B model's marks, it
removes no cell.

## Known limit

The `-cy` list names "street" 2 times (calm, urgent). The caption names items by name only
(ADR-0032), so it gives one mark for "street". In each of `-cy`'s 2 gold cells, 1 of the 2
gold items must then fail.

## Verdict

None. The spike stopped after stage 1 at Flash's request. Each line of **Done when** is still
open: the gold set, the agreement and the 2 pick lines need stages 2 to 4.
