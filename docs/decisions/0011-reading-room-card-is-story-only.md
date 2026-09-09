---
status: superseded
deciders: Flash Hu
date: 2026-09-09
---

# 0011. The reading-room Anki card is story-only

## Context and Problem Statement

Each `anki/reading-room-terms.txt` card packed five things into one HTML `Back`
field: `say:` (phonetic-CAPS), `def:`, the 🔊 sound axis, the 📖 meaning axis, and
the 🎭 story — plus a trailing `Anchors:` line and, on ~45 `/prepare-words`
auto-saved rows, a "Nemo alternates" block. The `say`/`def`/🔊/📖 material is
scaffolding used while *building* the story; once the story exists it is noise on
the review surface, and the structured version of it already has a home in
`docs/mnemonics/log.jsonl`. Flash wanted the flashcard reduced to its essence.

## Considered Options

* Keep the five-axis back
* Keep `def:` + 🎭 story (an authoritative meaning as an answer key)
* Story-only: `Front` = word, `Back` = the 🎭 story sentence as plain text

## Decision Outcome

Chosen option: **story-only**. `Back` is the 🎭 story sentence, plain text — no
HTML, no `🎭` prefix, no other axes. A word with no story yet has an empty `Back`
(or no row). The 🎭 story is by design a reconstruction of the word's sound and
meaning from stand-ins, so it already carries what the dropped axes taught.

All 268 existing rows were rewritten in one pass (throwaway
`scripts/strip-anki-back-to-story.js`): 214 stripped to story-only, 8 left with an
empty back pending a story, and 45 legacy multi-candidate `<b>mnemonic:</b>` rows
plus `cloak` (a no-tab data bug) left for a follow-up hand pass.

Knock-on: the `_glossy_ary` agent was retired. Its explain half was just the
`english-word-explainer` skill; its save half now writes a single line only after
a human picks a story. The explain step is now that skill invoked directly in the
main loop (`word-workflow.md` steps 1–2, which absorbed Glossy's two sharpened IPA
rules), and the `update-anki-story` skill is the save path (write the row, sync,
log via `_logan`) for both first-time saves and re-finalizes. `/prepare-words`
now cards only the auto-picked story and writes Nemo's runner-up candidates to a
sidecar `docs/mnemonics/alternates.jsonl` for review. `_etta_mology`, `_nemo`, and
`_logan` are unaffected.

### Positive Consequences

* The card shows exactly one thing to recall against — the mnemonic scene
* No more finalize step to strip an alternates block off the card
* One save path (`update-anki-story`) instead of an agent + a skill

### Negative Consequences

* `say`/`def`/🔊/📖 for the ~200 carded words that are **not** in
  `docs/mnemonics/log.jsonl` now survive only in git history — not backfilled
* No authoritative definition on the card; the story is a memory aid, not a gloss
* Losing `_glossy_ary` removes a convenient "get Glossy on X" dispatch handle and
  the doc home its rules lived in (moved into `word-workflow.md`)
* 46 legacy rows (45 multi-candidate + `cloak`) are left in a non-conforming
  shape until hand-picked

## Links

* Superseded by [ADR-0012](0012-reading-room-card-carries-an-optional-mnemonic-image.md)
  (the card may again carry HTML — an `<img>` — for an optional mnemonic image; the
  story-only-text principle for the `.txt` `Back` column is retained)
* [.claude/rules/word-workflow.md](../../.claude/rules/word-workflow.md)
* [.claude/skills/update-anki-story/SKILL.md](../../.claude/skills/update-anki-story/SKILL.md)
* [.claude/commands/prepare-words.md](../../.claude/commands/prepare-words.md)
