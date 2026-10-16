---
id: C-037
type: concept
status: active
aliases: [weakest confidence, min confidence]
related: [C-002, C-004, C-036]
---
# C-037 Weakest confidence signal

**Meaning:** The lowest `confidence` that Jev gives on any axis of the picked cell. Jev returns a confidence for each Score question, but it gives none for the pick as a whole. Code takes the lowest one as the signal. A low value means that Jev was unsure about at least one axis of the picked cell.
**Example:** The picked cell has these confidences: plausible 0.92, vivid 0.81 and must-see clarity 0.48. The weakest confidence is 0.48.
**Not the same as:** the margin signal (C-036). The margin compares two cells, and the weakest confidence looks only at the picked cell.
