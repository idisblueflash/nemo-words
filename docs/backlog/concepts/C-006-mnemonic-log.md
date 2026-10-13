---
id: C-006
type: concept
status: active
aliases: [log, log row, log.jsonl, LogRow]
related: [C-004, C-010]
---
# C-006 Mnemonic log

**Meaning:** The file `data/mnemonics/log.jsonl`. It holds one structured record per saved story: sense, syllables, anchor unit, keyword, pivot words, technique and `picked_by`. The file only grows; the newest row for a word wins.
**Example:** After `card.js` makes a card for `drown`, `log-card` adds a row with `anchor_unit: rime` and `picked_by: auto`.
**Not the same as:** the card file (`anki/reading-room-terms.txt`), which holds what the card shows, and `alternates.jsonl`, which holds the runner-ups.
