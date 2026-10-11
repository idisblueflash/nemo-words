---
id: EN-036
type: enabler
parent: E01
status: idea
---
# EN-036 Dagu runs the card pipeline as small step CLIs

**Why now:** US-028's eight steps each run as one small CLI under Dagu; this sets up Dagu and the step contract before the story is built.
**Done when:** A Dagu workflow runs two stub step CLIs end-to-end on one word, passing the first step's output to the second, and a failing step stops the run with its error visible.

## Step contract (agreed 2026-10-11)
- Every step is a Node script in `scripts/` (stdlib only, like `anki-sync.js`), tested with `node:test`.
- Plain output, like a normal CLI: the result goes to stdout, one record per line, fields tab-separated, list fields comma-separated. Nothing else goes to stdout.
- Notes and warnings (e.g. `g2p-synthesized — verify`) go to stderr.
- Exit codes: `0` ok; `1` stopped with a reason (reasons on stdout, one per line); `2` error.
- Inputs are positional arguments where natural; multi-line inputs are passed as a file path.
- A `claude -p` step strips tabs and newlines from model text before printing.
