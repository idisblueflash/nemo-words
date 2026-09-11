---
status: accepted
deciders: Flash Hu
date: 2026-09-11
---

# 0014. Move the mnemonic log to data/mnemonics/, redefining data/ as tracked + generated

## Context and Problem Statement

ADR-0013 moved generated mnemonic/corpus images to a root-level images/ tree,
leaving docs/mnemonics/ holding only log.jsonl (the structured per-word
mnemonic record queried by scripts/find-mnemonic.js) and style-anchor.png.
log.jsonl is a data artifact — hand/agent-curated, append-only, machine-read
— not documentation, so docs/ was already the wrong category for it; the
image move just made that mismatch visible.

## Considered Options

* Leave log.jsonl in docs/mnemonics/ — it's already a tidy small module dir.
* Move it to data/mnemonics/log.jsonl.
* Move it to anki/mnemonic-log.jsonl, beside the card file it shadows.

## Decision Outcome

Chosen option: "move it to data/mnemonics/log.jsonl", because the repo
already has a root data/ directory (currently just data/tatoeba/, a large
gitignored corpus rebuilt from source), and log.jsonl is genuinely project
data. This redefines data/'s meaning from "large regenerated corpora only" to
"project data, tracked and generated alike" — the .gitignore now says so
explicitly. The future data/mnemonics/alternates.jsonl sidecar (from
/prepare-words) moves with it for the same reason.

### Positive Consequences

* log.jsonl now lives where its own nature says it should, next to a
  same-shape future sidecar file (alternates.jsonl).
* data/ becomes a meaningful, documented category rather than an
  accidental home for one corpus.

### Negative Consequences

* data/ now mixes a small tracked curated file with a large gitignored
  corpus tree — readers must check what's tracked per-subdirectory rather
  than assuming one rule for the whole folder.
* Another round of path updates across CLAUDE.md, .claude/rules/*,
  .claude/agents/_etta_mology.md, _nemo.md, _logan.md,
  _logan/reference-tables.md, _vivian.md, .claude/commands/prepare-words.md,
  .claude/skills/update-anki-story/SKILL.md, and
  scripts/find-mnemonic.js's DEFAULT_LOG constant.

## Links

* Builds on ADR-0013 (images/ consolidation)
* Superseded path references in ADR-0011, ADR-0012, ADR-0013 (pointer notes
  added, substance untouched)
