---
status: accepted
deciders: Flash Hu
date: 2026-10-13
backlog: [US-050, US-059, US-060, US-061, C-005, C-024, C-026]
---

# 0025. A closed stressed chunk shares its consonant with the next chunk

Technical Story: [US-050](../backlog/items/US-050-a-stressed-short-vowel-chunk-takes-the-next-consonant.md), [investigation-007](../investigations/investigation-007-us-050-span-shift-contains-anchors.md)

## Context and Problem Statement

US-050 asked the anchor search to try words that span or shift a syllable boundary, or
contain the chunk's sound, "so that words with no exact or rhyme anchor still get a card".
investigation-007 measured this on 316 whole words. Span and shift give 0 of the 7 words
that still stop a usable anchor. "Contains" reaches all 7, but a chunk has a median of 111
candidates, so frequency can't choose one.

The same report found a different problem. `syllabify` gives a consonant between two
vowels to the later syllable, so a stressed short vowel ends its chunk (`ˈpɛ.nəl.ti`).
71 of the 316 stressed chunks end that way. 62 of them get a rhyme, and the rhyme is
always ye, yeah, des or huh. When the chunk takes the next consonant, many of them are
exactly a real word (pen, rat, plum).

So what should US-050 build, and what happens to the chunk that the consonant comes from?

## Decision Drivers

* A rule must be measured on real data before it is set (`.claude/rules/build.md`).
* A change in `find-keywords` should not force changes in the later steps.
* No chunk that has a good keyword today should lose it.

## Considered Options

* Refine US-050 as written (span, shift and contains, as a last fallback)
* Drop US-050, as US-049 was dropped
* Keep only the shift for stressed short vowels; the consonant moves to the stressed chunk
* Keep only the shift for stressed short vowels; both chunks keep the consonant
* Change `syllabify` so that a stressed short vowel closes its syllable

## Decision Outcome

Chosen option: "Keep only the shift for stressed short vowels; both chunks keep the
consonant", because it is the one part of US-050 with a measured benefit, and the shared
consonant changes no other chunk.

Flash made three choices on 2026-10-13:

1. **Split US-050.** It keeps only this rule: a stressed chunk that ends in /ɪ ɛ æ ʌ ʊ/
   takes the next consonant, and the word for that longer chunk wins over the open chunk's
   exact keyword and over a rhyme. The span is US-059. The four weak rhyme words are
   US-060. An anchor that the story drafter picks from a short list, for the words that
   still stop, is US-061.
2. **The next chunk keeps the consonant.** penalty has the chunks /pɛn/ and /nəl/.
3. **/ɑ/ and /ɔ/ are not in the vowel set.** 18 more words have such a chunk and 8 get a
   word, with mixed quality (droplet "drop" is better than "law"; automobile "ought" is
   not better than "awe").

The option to change `syllabify` was not put to Flash. The refine left the step alone so
that the card's IPA line and the log's syllables stay as they are.

### Positive Consequences

* About 33 of 316 words get a real word of 3+ letters in place of ye, yeah, des or huh.
* The keyword line keeps its format, so `compose-stories`, `check-stories`,
  `judge-stories`, `tag-technique` and `log-card` need no change.
* The chunks match how Flash closes the stressed syllable in his own log rows (27 of the
  90 log words with 2+ syllables).

### Negative Consequences

* A chunk is no longer always one syllable, and one consonant can be in two chunks.
* The 7 words that stop today still stop until US-061.
* About 27 stressed chunks keep ye, yeah, des or huh until US-060.
* Some closed keywords are odd words that pass the frequency limit (del, dev, gen, sim).

## Pros and Cons of the Options

### Refine US-050 as written

* Bad, because span and shift card 0 more words than today with a usable anchor.
* Bad, because "contains" has a median of 111 candidates for each chunk.
* Bad, because the span needs a new keyword-line format and changes in four later steps.

### Drop US-050

* Good, because the stated benefit is not real, as with US-049.
* Bad, because it loses the 33 words that would get a better anchor.

### The consonant moves to the stressed chunk

* Good, because no sound is in two chunks.
* Bad, because on the 316 words 11 next chunks get a different keyword, mostly a worse one
  (stick → tick, row → o), 2 lose their keyword, and 16 get one that is mostly the letter a.

### Both chunks keep the consonant

* Good, because no chunk other than the stressed chunk changes.
* Bad, because the chunks of a word overlap.

### Change `syllabify`

* Good, because chunks and syllables stay the same thing.
* Bad, because the IPA line on every such card and the log's syllables change.

## Links

* Check this rule again when E07 moves the pipeline to NOAD: NOAD's own syllable breaks
  may already close these syllables.
