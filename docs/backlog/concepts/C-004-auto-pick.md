---
id: C-004
type: concept
status: active
aliases: [auto-picked, auto-made card, picked_by: auto]
related: [C-001, C-010, C-006]
---
# C-004 Auto-pick

**Meaning:** A story (or later an image) that the card pipeline chose without Flash. Its log row says `picked_by: "auto"`. Flash can keep it or override it.
**Example:** `node scripts/card.js wary` picks the best-scoring story and syncs the card. Nobody is asked.
**Not the same as:** a story that Flash picked by hand through `update-anki-story` (`picked_by: flash`, or no `picked_by`).
