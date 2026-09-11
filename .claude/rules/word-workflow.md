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
   three axes (🔊 sound / 📖 meaning / 🎭 story). All three are *working material* now —
   nothing from this step is persisted. The 🔊 sound and 📖 meaning axes are scaffolding
   used to build the story in step 3; only the story (step 3) ever lands on a card. The
   skill runs the offline rhyme CLI itself (it lives
   with `english-word-explainer`, not this repo, at
   `~/.claude/skills/english-word-explainer/rhyme/rhyme.py`) for sound-anchor
   candidates. Prefer *familiar* anchors that also carry the *meaning* (e.g. transfusion
   → "fusion"; severe → "fear").

   Two sharpenings on the skill's own text, standing rules for this repo:
   - **Perfect IPA match only.** A sound anchor must match the target chunk's IPA
     exactly — vowels and consonants both, not just a consonant or spelling match. If no
     familiar word gives a perfect match (common for reduced-schwa syllables), leave
     that chunk unanchored and teach it via IPA rather than fake it with a same-spelling
     wrong-sound word. Verify with `nemo-words ipa-lookup --word <candidate>`; for
     rare/medical words pass the pronunciation you know via `--ipa` since g2p is
     unreliable (flags `[g2p-synthesized — verify]`).
   - **US American pronunciation, always.** Judge every anchor against GA vowel values
     (rhotic /r/, schwa reductions), never UK/RP — use the GA column of
     `nemo-words ipa-lookup --word <word>`.

   For a **word built from classical morphemes** (medical or general), route to
   `_etta_mology` instead — it decomposes and cards the parts, and there's no
   sound/story axis for those.
3. **Get the story.** A human always picks this — never an agent, and never a
   specialist's own top recommendation adopted automatically.

   **First, before any `_nemo` dispatch, pull corpus background context for the word.**
   Run the `_corpus_search` skill (or `scripts/corpus-search.sh` directly) on the word to
   see how it's actually used — attested example sentences, common collocates, which
   sense dominates. This grounds the story step in real usage before brainstorming: pass
   what you find into Nemo's dispatch prompt (representative sentences, the dominant
   sense) so his candidates track attested usage rather than the bare definition. If the
   corpus has zero hits for the word, note that and carry on — it's context, not a gate.

   **The story must rebuild the word, not spell it.** A 🎭 story reconstructs a word the
   reader doesn't yet know from pieces they do — sound anchors for the pronunciation, a
   concrete scene for the meaning — so the target word (and any inflection of it) must not
   appear in the story sentence itself. This is the canonical rule; `_nemo`'s "no bare
   headword" gate and `_logan`'s `warrant` example (`.claude/agents/_logan/reference-tables.md`)
   both enforce it. It applies to a user-supplied story too: if theirs names the word, ask
   them to reword it around stand-ins before accepting.

   Then either let the user supply
   their own one-sentence story (they often do; accept it, apply only a tiny grammar fix
   like "need" → "needs", and confirm what makes it work), or dispatch `_nemo`
   (`.claude/agents/_nemo.md`) with the word's pronunciation, definition,
   sound/meaning axes, and the corpus context to brainstorm candidates — Nemo only
   *suggests*, so present its candidates and let the user pick.

   **Collect `_logan`'s row fields from Nemo up front, per candidate**, so a later
   `_logan` dispatch (see step 4 and `data/mnemonics/log.jsonl`'s schema in
   `.claude/agents/_logan/reference-tables.md`) can be handed a filled-in row instead of
   round-tripping questions back to the user. Ask Nemo's dispatch prompt to include, for
   each candidate alongside the sentence and score: `syllabification` (IPA, one syllable
   per element, stress marked), `anchor_unit`, `keyword`, `pivot_words`, and `technique`
   (one or two tags). If the user asks for a variant/edit of a candidate (as opposed to
   picking one outright), re-derive these fields for the edited sentence before moving to
   step 4 — don't carry over the original candidate's tags unchecked.
4. **Save only when the user says so** (e.g. "save", "save it").
   - Run the `update-anki-story` skill with the word + the picked story. It writes the
     word's row in `anki/reading-room-terms.txt` (`Front` = word, `Back` = the story —
     appending the row if the word isn't carded yet, patching it if it is), runs
     `scripts/anki-sync.js`, and logs to `data/mnemonics/log.jsonl` via `_logan`.
   - The `_logan` log step runs automatically as part of that save — don't wait for the
     user to separately ask. Hand `_logan` the fields already collected in step 3
     (`syllabification`, `anchor_unit`, `keyword`, `pivot_words`, `technique`) plus the
     word, sense, and final sentence — don't make `_logan` re-ask. This applies to a
     word-part story (e.g. one saved alongside `anki/medical-word-parts.txt`) the same
     as a whole-word story.

Do NOT save proactively — offer, and wait for the go-ahead. (Background `/btw explain X`
forks propose words; their output is not user consent.)

## The Anki card shape

`anki/reading-room-terms.txt` — `#deck:00 Reading Room::Terms`, columns
`Front\tBack\tImage`. `Front` is the word; `Back` is **the 🎭 story sentence as plain
text** — nothing else; `Image` is an optional mnemonic-image basename (ADR-0012):

```
trial	The court tried a dull case, weighing his guilt.	trial.png
```

No `<b>`/`<br>`, no `🎭` prefix, no `say`/`def`/🔊/📖, no `Anchors:` line in `Back`. The
`Image` column holds a bare filename under `images/mnemonic/` (or is empty);
`anki-sync.js` uploads it as `nemo-<file>` and composes the `<img>` onto the pushed
`Back` at sync time — the `.txt` never holds HTML. A word with no story yet has an empty
`Back` (or simply no row). The pronunciation, definition, and sound/meaning axes are
build-time scaffolding (step 2) and are never carded — the structured record lives in
`data/mnemonics/log.jsonl`.

## Explaining several words at once

When the user hands over more than one word in one request, work through them yourself —
don't fan out one subagent per word. Follow the same steps 1–4 for each word inline (or
just give quick inline explanations if that's all the user asked for). The story gate
still applies per word: a from-scratch pass produces the explanation + sound + meaning
as working notes only — nothing is carded until a human picks that word's story.

For a large pre-planned batch, `/prepare-words` is the sanctioned path.

## Batch prep via `/prepare-words` — the one sanctioned exception

`/prepare-words word1, word2, …` (`.claude/commands/prepare-words.md`) runs steps 1–2
above through a `Workflow`, then **auto-saves Nemo's own top-pick story** instead of
waiting for a human choice — this is the *only* place in this repo where a specialist's
top recommendation gets adopted automatically, and it's deliberate: a `Workflow` script
has no way to pause mid-run for a human to review candidates across many words at once.
`_nemo` itself still refuses this (see its own "never adopt a specialist's own top
recommendation" rule) — the command writes the chosen story directly. The card gets the
top-pick story only; Nemo's runner-up candidates go to a sidecar
`data/mnemonics/alternates.jsonl` (one entry per word) for Flash to review alongside the
card. Review happens later and separately: Flash reads the card in the Anki app,
compares against the sidecar alternates, and decides whether the auto-pick stands. Once
he has a final story, `update-anki-story` (`.claude/skills/update-anki-story/SKILL.md`)
writes it to the Anki row + live collection + mnemonic log. Medical/INN words classified
to `_etta_mology` stop after the explain stage — that agent never produces a sound/story
axis, so there's nothing for Nemo or `update-anki-story` to do for them.
