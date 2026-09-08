---
description: The explain-a-word workflow — the main recurring loop for handling "explain <word>" requests.
---

# Word-explanation + save workflow (the main loop)

**Follow these four steps in order when asked to "explain <word>":** each step depends
on the previous one's output (the rhyme CLI's candidates feed the story step, and only
a confirmed story gets saved), so skipping ahead risks saving a card the user never
actually agreed to.

1. **Explain, plain.** Follow the `english-word-explainer` skill: plain meaning,
   pronunciation, one usage example. Steps 1–3.
2. **Build the sound+meaning mnemonic.** `english-word-explainer` Step 4 drafts all
   three axes (🔊 sound / 📖 meaning / 🎭 story) — keep only 🔊 + 📖 here; the story is
   step 3's job and needs a human. The skill runs the offline rhyme CLI itself (it lives
   with `english-word-explainer`, not this repo, at
   `~/.claude/skills/english-word-explainer/rhyme/rhyme.py`) for sound-anchor
   candidates. Prefer *familiar* anchors that also carry the *meaning* (e.g. transfusion
   → "fusion"; severe → "fear"). Verify a candidate's IPA against the GA column of
   `nemo-words ipa-lookup --word <candidate>`; for rare/medical words pass the
   pronunciation you know via `--ipa` since g2p is unreliable (flags
   `[g2p-synthesized — verify]`). For a **word built from classical morphemes**
   (medical or general), route to `_etta_mology` instead — it decomposes and cards the
   parts, and there's no sound/story axis for those.
3. **Get the story.** A human always picks this — never an agent, and never a
   specialist's own top recommendation adopted automatically.

   **First, before any `_nemo` dispatch, pull corpus background context for the word.**
   Run the `_corpus_search` skill (or `scripts/corpus-search.sh` directly) on the word to
   see how it's actually used — attested example sentences, common collocates, which
   sense dominates. This grounds the story step in real usage before brainstorming: pass
   what you find into Nemo's dispatch prompt (representative sentences, the dominant
   sense) so his candidates track attested usage rather than the bare definition. If the
   corpus has zero hits for the word, note that and carry on — it's context, not a gate.

   Then either let the user supply
   their own one-sentence story (they often do; accept it, apply only a tiny grammar fix
   like "need" → "needs", and confirm what makes it work), or dispatch `_nemo`
   (`.claude/agents/_nemo.md`) with the word's pronunciation, definition,
   sound/meaning axes, and the corpus context to brainstorm candidates — Nemo only
   *suggests*, so present its candidates and let the user pick.

   **Collect `_logan`'s row fields from Nemo up front, per candidate**, so a later
   `_logan` dispatch (see step 4 and `docs/mnemonics/log.jsonl`'s schema in
   `.claude/agents/_logan/reference-tables.md`) can be handed a filled-in row instead of
   round-tripping questions back to the user. Ask Nemo's dispatch prompt to include, for
   each candidate alongside the sentence and score: `syllabification` (IPA, one syllable
   per element, stress marked), `anchor_unit`, `keyword`, `pivot_words`, and `technique`
   (one or two tags). If the user asks for a variant/edit of a candidate (as opposed to
   picking one outright), re-derive these fields for the edited sentence before moving to
   step 4 — don't carry over the original candidate's tags unchecked.
4. **Save only when the user says so** (e.g. "save", "save it").
   - Dispatch `_glossy_ary` with the picked story (its Part 0.5 patch path: "add this
     story for `<word>`: `<story text>`") — it rebuilds the word's row in
     `anki/reading-room-terms.txt` and runs `scripts/anki-sync.js` in one go. Or, if the
     word is already carded, run `update-anki-story` directly.
   - **Then log it with `_logan` automatically, right after the save** — don't wait for
     the user to separately ask. Dispatch `_logan` with the fields already collected in
     step 3 (`syllabification`, `anchor_unit`, `keyword`, `pivot_words`, `technique`)
     plus the word, sense, and final sentence — don't make `_logan` re-ask. This applies
     to a word-part story (e.g. one saved alongside `anki/medical-word-parts.txt`) the
     same as a whole-word story.

Do NOT save proactively — offer, and wait for the go-ahead. (Background `/btw explain X`
forks propose words; their output is not user consent.)

## The Anki card shape

`anki/reading-room-terms.txt` — `#deck:00 Reading Room::Terms`, columns `Front\tBack`.
`Front` is the word; `Back` is one HTML line:

```
<b>say:</b> <CAPS> /<ipa>/<br><b>def:</b> <def><br>🔊 <sound><br>📖 <meaning><br>🎭 <story>
```

Omit the trailing `<br>🎭 <story>` segment entirely until a story is picked — no
placeholder. `say` is phonetic-CAPS (e.g. `yoo-BIK-wih-tus`); `ipa` is `/slashed/`.

## Explaining several words at once

When the user hands over more than one word in one request, work through them yourself —
don't fan out one subagent per word. Follow the same steps 1–4 for each word inline (or
just give quick inline explanations if that's all the user asked for). The story gate
still applies per word: a from-scratch pass produces sound+meaning only, and each word's
story still needs a human to pick it.

For a large pre-planned batch, `/prepare-words` is the sanctioned path.

## Batch prep via `/prepare-words` — the one sanctioned exception

`/prepare-words word1, word2, …` (`.claude/commands/prepare-words.md`) runs steps 1–2
above through a `Workflow`, then **auto-saves Nemo's own top-pick story** instead of
waiting for a human choice — this is the *only* place in this repo where a specialist's
top recommendation gets adopted automatically, and it's deliberate: a `Workflow` script
has no way to pause mid-run for a human to review candidates across many words at once.
`_glossy_ary` and `_nemo` themselves still refuse this (see their own "never adopt a
specialist's own top recommendation" rules) — the command never routes the auto-save
through them, it writes the chosen story directly. Every runner-up candidate Nemo
produced gets written onto the word's live Anki card too (not just chat), because review
happens later and separately: Flash reads the card in the Anki app itself — definition,
sound/meaning axes, and story all together — and decides whether the auto-pick stands.
Once he has a final story, `update-anki-story`
(`.claude/skills/update-anki-story/SKILL.md`) writes it everywhere (the Anki row, the
live collection, the mnemonic log) and drops the leftover alternates. Medical/INN words
classified to `_etta_mology` stop after the explain stage — that agent never produces a
sound/story axis, so there's nothing for Nemo or `update-anki-story` to do for them.
