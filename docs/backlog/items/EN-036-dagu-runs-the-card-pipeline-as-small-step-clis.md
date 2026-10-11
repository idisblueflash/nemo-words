---
id: EN-036
type: enabler
parent: E01
status: idea
---
# EN-036 Dagu runs the card pipeline as small step CLIs

**Why now:** US-028's eight steps each run as one small CLI under Dagu; this sets up Dagu and the step contract before the story is built.
**Done when:** A Dagu workflow runs two stub step CLIs end-to-end on one word, passing the first step's output to the second, and a failing step stops the run with its error visible.
