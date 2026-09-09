# Mnemonic-log reference tables

Companion to the `_logan` agent (`.claude/agents/_logan.md`) — the two
files travel together. Controlled vocabularies for the mnemonic log
(`docs/mnemonics/log.jsonl`).
Each log row records how one new word was turned into a pronunciation +
meaning mnemonic, so that after collecting many words the patterns (which
anchors and techniques actually stick) can be mined.

The row's content is authored by the user (with _nemo); `_logan` is only
the scribe — it structures the given material, asks for missing cells,
and validates the tags below. It does not analyse words itself.

Goals of the method:

1. See a written word → quickly recall its pronunciation.
2. Hear/read the pronunciation → pull out the meaning via a vivid story.

## Row schema (`log.jsonl`, one JSON object per line)

| field             | type        | example                                               | notes |
|-------------------|-------------|-------------------------------------------------------|-------|
| `word`            | string      | `"warrant"`                                           | headword |
| `syllabification` | string[]    | `["ˈkɑm","pə","tɪns"]`                                | the word in IPA, one syllable per array element; mark the stressed syllable with a leading `ˈ`; `[]` if not supplied yet |
| `anchor_unit`     | string      | `"whole-word"`                                        | one value from the table below |
| `keyword`         | string      | `"war / ant"`                                         | the known / L1 word(s) the anchor maps to |
| `sense`           | string      | `"to justify or make something reasonable/necessary; also, an official document authorizing an action"` | meaning target |
| `sentence`        | string      | `"War ants need a permit authorizing their tunnel."`  | the mnemonic; `""` if not supplied yet |
| `pivot_words`     | string[]    | `["war", "ant", "permit"]`                            | the words from `sentence` doing the memory work; `[]` if none yet. **Excludes the target/headword itself unless it is literally used in the sentence text** — see note below |
| `technique`       | string[]    | `["homophone", "absurd-image"]`                       | one or two values from the table below; `[]` if not tagged yet |
| `recall_check`    | number/null | `null`                                                | filled on later review, 1–5 (`null` until then) |
| `date`            | string      | `"2026-09-06"`                                        | date the row was created |

Example line:

```json
{"word":"warrant","syllabification":["ˈwɔɹ","ənt"],"anchor_unit":"whole-word","keyword":"war / ant","sense":"(1) to justify or make something reasonable/necessary; (2, noun) an official document authorizing an action (e.g. an arrest warrant)","sentence":"War ants need a permit authorizing their tunnel.","pivot_words":["war","ant","permit"],"technique":["homophone","absurd-image"],"recall_check":null,"date":"2026-09-06"}
```

A partially-filled row (user hasn't settled the mnemonic yet) looks like:

```json
{"word":"warrant","syllabification":["ˈwɔɹ","ənt"],"anchor_unit":"whole-word","keyword":"war / ant","sense":"to justify or make something reasonable/necessary; also, an official document authorizing an action","sentence":"","pivot_words":[],"technique":[],"recall_check":null,"date":"2026-09-06"}
```

Any cell may be `""` / `[]` if the user hasn't supplied it — an
incomplete row is acceptable, an invented one is not. One row usually
gets **one
`anchor_unit`** and, once a sentence exists, **one or two `technique`**
tags — `keyword-method` + `absurd-image` is the most common pair.

**`pivot_words` and the target word:** a good mnemonic reconstructs a word
you don't yet know from pieces you already do — so the story sentence must
not spell out the target/headword (or an inflection of it) at all. This is
the canonical rule (`word-workflow.md` step 3, `_nemo`'s "no bare headword"
gate); the `warrant` example above never writes "warrant" — it's rebuilt
purely from "war" + "ant" for sound and "permit"/"authorizing" for meaning.
`pivot_words` therefore lists only those stand-in words, since the field is
defined as "the words *from sentence* doing the memory work." If a row you're
handed has the headword in its sentence, flag it back rather than logging it.

## `anchor_unit` — the fragment of the word the story pegs onto

| value               | explanation |
|---------------------|-------------|
| `whole-word`        | The entire word sounds like another single word or short phrase, so no breakdown is needed (*ptarmigan → "tar mig on"*). |
| `stressed-syllable` | The story hangs on the one syllable that carries stress, since unstressed syllables reduce to schwa and make weak cues (*baNAL*). |
| `rime`              | The nucleus + coda of a syllable (the part that rhymes) is the hook, giving a rhyming pivot word (*quell → -ell → "well"*). |
| `onset`             | The initial consonant(s) of a syllable drive the mnemonic, usually via alliteration in the sentence. |
| `nucleus`           | Just the vowel is the anchor — rare, used when a distinctive vowel quality (not its spelling) is the thing you keep getting wrong. |
| `coda`              | The syllable-final consonant(s) are the anchor, typically to fix a cluster you drop or swap (*asked → -skt*). |
| `first-syllable`    | The opening syllable is the peg because word-initial sound is the strongest position for recall (*calendar → "Cal"*). |
| `word-shape`        | The anchor is orthographic, not phonetic — a visual feature of the spelling (double letter, silent letter, ascender pattern). |
| `morpheme`          | A meaningful sub-unit (prefix, root, suffix) is the anchor, so the story doubles as an etymology cue (*benevolent → "bene" = good*). |

## `technique` — how the sentence links sound to meaning

| value                  | explanation |
|------------------------|-------------|
| `homophone`            | The anchor is replaced by an existing word that sounds (nearly) identical and appears literally in the sentence (*sear → "seer"*). |
| `sounds-like-L1`       | The anchor is mapped to a word or phrase in your first language that sounds similar, bridging via a language you already own. |
| `keyword-method`       | Pick a concrete, imageable keyword resembling part of the word, then build a vivid scene linking that keyword to the meaning (Atkinson keyword mnemonic). |
| `rhyme`                | The mnemonic works because a pivot word rhymes with the anchor, and the rhyme itself is the retrieval cue. |
| `alliteration`         | Several words in the sentence repeat the anchor's onset, so the initial sound is over-cued (*"Furtive Fred fled"*). |
| `root-gloss`           | The sentence spells out the literal meaning of a prefix/root/suffix, so decoding the morpheme reconstructs the definition. |
| `absurd-image`         | The linking mechanism is a deliberately bizarre or exaggerated mental picture, exploiting the bizarreness effect. |
| `pun`                  | The sentence turns on a double meaning tying the word's sound to its sense in one witty phrase. |
| `story-chain`          | Three or more distinct pivot fragments are threaded into one narrative sequence, for long or multi-morpheme words where a single pivot won't cover it. Two pivot words is a plain `keyword-method`/pair, not a chain — reserve this tag for `pivot_words` of length 3+. |
| `spelling-spellout`    | The mnemonic encodes the letter sequence itself (acronym or first-letter sentence), targeting orthography (*"rhythm → Rhythm Helps Your Two Hips Move"*). |
| `visual-substitution`  | A letter or fragment is swapped for a look-alike shape or digit to make it stick visually rather than phonetically. |
| `etymology-cognate`    | The sound-anchor word is itself an etymological cognate of the target root/morpheme, not merely a sound-alike. |
| `chunked-sound-anchor` | The word is split into ordered sound chunks, each pegged to a concrete keyword that resembles that chunk. |
| `scene-depicts-meaning`| The mnemonic scene itself acts out the word's definition, not just its sound. |
