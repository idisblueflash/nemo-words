---
id: SP-029
type: spike
parent: E01
status: idea
timebox: 1d
concepts: [C-002]
---
# SP-029 Does an auto image pick agree with Flash's picks?

**Why now:** Unblocks US-030. If a model rarely picks the cell Flash picked, US-030 changes shape before it's built.
**Method:** Jev judges each cell's text description (`_vivian`'s 1–9 staging list) against the story, in two rounds that mirror `scripts/image-picker.js`: first one cell per grid row, then the best of those three. No per-cell descriptions are saved today, so past grids need them rebuilt (caption each cell) or the spike runs on fresh grids only.
**Done when:** For the grids under `images/mnemonic/*.grid.png` that have a matching crop, we have the rate at which Jev's description-based pick matches Flash's cell (exact match, and Flash's cell among Jev's three row picks), plus a go / no-go for auto image pick.
