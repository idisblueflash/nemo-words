# Gold set: image pick

Flash's hand labels for _vivian's 3×3 grids: for each grid, the best cell, the other
cells he would accept (`ok`), the cells that are not wrong but not ok (`weak`), the
clearly bad cells (`wrong`, with a note) and a reason. Every cell gets a mark. A picker is scored against these labels: **top-1 in the ok set** first,
and the **clearly-wrong rate** second.

## Files

- `guidelines.md` — what "best" means, and the order of checks. Versioned; each label
  records the version it was made with.
- `grids.json` — the grids to label: `id`, `word`, `grid` (file under
  `images/mnemonic/`), `story`, `split`, `batch`, `earlierPick` (the cell Flash cropped
  for the card before; the labeling page never shows it).
- `labels.json` — round 1 labels, keyed by grid id. `labels.r2.json` — a second round,
  a week later, for self-agreement.

## Split

`dev` grids come from SP-066's 20 tuning words: a picker may be tuned on them. `test`
grids come from SP-066's measure words: run a picker on them only to get its final
score. Batch 1 is 5 dev and 5 test grids (seeded draw).

## Commands

```bash
node scripts/gold-image-pick.js            # label: http://localhost:8791
node scripts/gold-image-pick.js report     # counts, open labels, agreement with earlierPick
node scripts/gold-image-pick.js --round 2  # label again into labels.r2.json
```
