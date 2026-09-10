---
status: accepted
deciders: Flash Hu
date: 2026-09-10
---

# 0013. Consolidate generated image assets under a repo-root `images/` tree

## Context and Problem Statement

Generated image assets lived in two sibling-of-metadata locations:
`docs/mnemonics/images/` (mnemonic grids + cropped card images, `_vivian`) and
`docs/corpus/images/` (corpus example-sentence grids, `_cora`). Flash wanted a
single place to browse all image files rather than hunting through `docs/`
subfolders that also hold prose, logs, and decision records.

## Decision Outcome

Move both trees to a dedicated top-level directory:

* `docs/mnemonics/images/` → `images/mnemonic/`
* `docs/corpus/images/` → `images/corpus/`

`docs/mnemonics/log.jsonl` stays put — only the image files moved, not the
mnemonic record. `docs/corpus/` is removed (it held nothing but `images/`).

Follow-on edits made in the same change:

* `.gitignore`: `docs/mnemonics/images/` + `docs/corpus/images/` →
  `images/mnemonic/` + `images/corpus/`.
* `#media-dir:` header in `anki/reading-room-terms.txt` and
  `anki/medical-word-parts.txt` → `images/mnemonic`. `anki-sync.js` resolves it
  relative to repo root, so no script change.
* Path references in `CLAUDE.md`, `.claude/rules/scripts.md`,
  `.claude/rules/word-workflow.md`, `.claude/agents/_cora.md`,
  `.claude/agents/_vivian.md`, `.claude/skills/vivian-mnemonic-images/SKILL.md`,
  and `.claude/skills/update-anki-story/SKILL.md`.

## Consequences

* Good: one predictable place for every generated image; folder names say what
  produced them.
* Bad: a word's story record (`log.jsonl`) and its picture no longer sit in the
  same folder.
* ADR-0012's `docs/mnemonics/images/<word>.png` references are now historical —
  read them as `images/mnemonic/<word>.png`.
