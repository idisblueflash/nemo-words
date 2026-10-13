---
id: C-020
type: concept
status: active
aliases: [card.js, card pipeline, node scripts/card.js]
related: [C-021, C-007]
---
# C-020 One-word command

**Meaning:** `node scripts/card.js <word>`. It runs the Dagu card pipeline (`dags/card.yaml`) on one word and gives a synced story card, or a stop or failure message. It asks Flash nothing.
**Example:** `node scripts/card.js drown` makes and syncs a card that uses the rhyme anchor "down".
**Not the same as:** the hand-made paths (`update-anki-story`, `/new-word-card`, `/prepare-words`), where Flash or an agent picks the story.
