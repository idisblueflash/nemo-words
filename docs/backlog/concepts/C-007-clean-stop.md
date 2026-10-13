---
id: C-007
type: concept
status: active
aliases: [stop, stopped, exit 1]
---
# C-007 Clean stop

**Meaning:** A run that ends on purpose, with a reason, because there is nothing correct to do. The step exits 1 and `card.js` prints `stopped at <step>: <reasons>`.
**Example:** `stopped at find-keywords: no sound anchor found` for `bulge`.
**Not the same as:** a failure (exit 2), which is a crash or an error such as Jev or Dagu not being available.
