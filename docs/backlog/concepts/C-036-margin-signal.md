---
id: C-036
type: concept
status: active
aliases: [margin, score margin]
related: [C-002, C-004, C-037]
---
# C-036 Margin signal

**Meaning:** A number that code computes after Jev scores the cells of one grid. It is the best total minus the second-best total. A small margin means that two cells are almost equal, so the pick is not certain.
**Example:** The picked cell has a total of 10 and the next cell has 9.5, so the margin is 0.5. That is low, so the word goes to Flash for a check.
**Not the same as:** the weakest confidence signal (C-037). That signal comes from Jev's own confidence on one cell, not from the gap between two cells.
