---
id: C-012
type: concept
status: active
aliases: [rubric, judgment gate, score axis, story-rubric.json]
related: [C-002, C-008, C-001]
---
# C-012 Story rubric

**Meaning:** The file `scripts/story-rubric.json`. It holds the questions that Jev asks about each story: three judgment gates (vividness, scene coherence, animal harm) and three score axes (anchor, meaning, vivid), each 1–3. The story that passes every gate with the best total is picked.
**Example:** `pick: total 7.4 (anchor 2.8, meaning 2.3, vivid 2.3)` in a run report.
**Not the same as:** a hard gate, which code checks before Jev is asked.
