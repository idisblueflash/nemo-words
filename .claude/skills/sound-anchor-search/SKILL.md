---
name: sound-anchor-search
description: |
  Given a word part's pronunciation (a rime or fuller sound, e.g. the /oʊb/ in
  "-phob-") and its conventional spelling (e.g. "ph"), searches the offline CMU
  dictionary via the `nemo-words` CLI for real English words that share the
  full onset+rime — anchored to word-start — and, when no everyday word turns
  up (a "hard part"), falls back to a WebSearch for a famous/well-known proper
  name spelled the same way. Reports whatever candidates exist, or reports
  plainly that none do, so a rime-only anchor (matching just the tail sound,
  not the onset) can be used deliberately rather than by omission. Use when
  a word part's sound anchor search comes up empty on the first pass — "find
  words with onset X", "is there a real word/name for this sound", "spike on
  a hard part" — before falling back to a same-rime-only anchor in a mnemonic.
  Reporting only; never drafts or picks a mnemonic sentence itself.
---

# Sound-anchor search

## Trigger example

<example>
Context: Nemo is brainstorming mnemonic candidates for the word part "-phob-"
(Greek, "fear", /foʊb/) and the rhyme CLI only turned up same-rime words
(robe, globe, probe), not a whole-word match on the full onset+rime.
user: "how about finding words with onset = ph"
assistant: "I'll use sound-anchor-search to look for real words spelled with
'ph' that carry the full /foʊb/ sound, and famous names if no word turns up."
<commentary>
This is the exact "onset came up empty, check further" moment the skill is
for — confirming whether a whole-word/proper-name anchor exists before
settling for a rime-only anchor.
</commentary>
</example>

## Scope

Covers a single onset+rime pattern lookup for one word part at a time —
"does a stronger anchor than the rime-only match exist for this sound".
Not for brainstorming or scoring mnemonic sentences (that's `_nemo`); not for a
whole word's pronunciation (that's
`english-word-explainer`); not for a general phonetic pattern search with no
mnemonic purpose (the `nemo-words` CLI directly, per this repo's
`CLAUDE.md` "Ad-hoc IPA/rhyme lookups" section, is enough on its own for that).

## Inputs

- The word part (e.g. `-phob-`) and its meaning/origin, for context in the
  report.
- The **rime or fuller target sound**, in IPA (e.g. `oʊb`).
- The **conventional spelling** of the onset as it's written in the word part
  (e.g. `ph`, not the phoneme `/f/`) — this is what narrows the word-list to
  spellings that would actually read naturally as an extension of the part,
  not just any word sharing the phoneme.

If the caller only has the phoneme (no spelling given), ask for the spelling,
or default to the most common spelling for that phoneme in the word part
itself.

## Process

1. **Real-word search (word-start anchor).** Run:
   ```bash
   nemo-words ipa-lookup --ga "<full target IPA, e.g. foʊb>" | awk -F'\t' '$3 ~ /^<GA-anchor-regex>/'
   ```
   Anchor the regex to the phoneme(s) actually at word-start (GA column,
   3rd tab field), not the spelling — `nemo-words` output is IPA, so filter on
   sound. Then filter the *hits* by eye for the given spelling (drop entries
   that share the sound but are spelled unrelatedly, unless the caller wants
   spelling-agnostic results).
2. **Discard self-referential hits.** If the word part itself derives real
   dictionary words (e.g. "-phob-" → phobia, phobic, phobos), those don't
   count as an independent anchor — they're the same part, not a different
   familiar word to hang a mnemonic on. Note them but set them aside.
3. **If real words remain** after discarding self-referential hits, report
   them as candidate anchors — these are stronger than a rime-only match
   because they anchor the onset too, not just the tail sound.
4. **If nothing remains** (the common case for an already-flagged "hard
   part" — that's usually *why* the first pass came up empty), search the web
   for a famous/well-known person or place with a surname or name spelled the
   same way as the onset+rime (e.g. "famous person surname Fobel", "famous
   person surname Fobes"). A name is only useful here if the caller (and
   plausibly Flash) would actually recognize it — obscure genealogical
   surnames with no notable bearer don't count as a win.
5. **Report plainly either way.** State clearly whether a real word, a
   recognizable name, or neither was found. Don't stretch a weak/unknown name
   into a recommendation — "no stronger anchor exists; the rime-only match
   (robe/globe/probe) is the right call here" is a valid, useful, complete
   answer. This confirms a rime-only anchor was a deliberate choice, not a
   skipped step.

## What this skill does not do

Never picks or drafts a mnemonic sentence, never scores candidates against
each other, never saves anything to Anki or the mnemonic log. It only
answers the one factual question — is there a better anchor than what's
already been found — and hands the answer back to whichever skill/agent asked
(typically `_nemo`, mid-brainstorm).
