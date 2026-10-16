---
id: US-060
type: story
parent: E01
status: refined
concepts: [C-003, C-005, C-007, C-011, C-026, C-030, C-032, C-033]
---
# US-060 The rhyme rule refuses ye, yeah, des and huh

As Flash, I want the rhyme rule to refuse rhyme words that can't carry a picture (ye, yeah, des, huh), so that a stressed chunk gets a rhyme that I can see in a story, or none.

**Scope (split from US-050, 2026-10-13):** investigation-007 found that 62 of the 164 rhyme anchors on 316 words are one of these four words (des 19, yeah 18, ye 18, huh 7). They are not in `FUNCTION_WORDS`. US-050 replaces about 33 of them with a real word; this story is for the others.

**Measured (investigation-008, 2026-10-15, 316 whole words, after US-050):** 30 stressed chunks still get the rhyme des (10), yeah (10), ye (7) or huh (3). Each of them is an open short-vowel chunk with no closed keyword. With the four words refused, none of the 30 gets a picturable rhyme: 20 get no anchor and 10 get "ke" or "ca". Only 7 rhyme words reach 5e-7 for such a chunk (des, ye, ke, yeah, huh, ca, sta), and none is picturable, so the refusal is a rule on the rime, not a word list. "des" is also the exact keyword of an unstressed /dɪ/ chunk in 7 words (dismiss, descendant). Words that stop: 7 today, 22 with this story alone, about 3 more than today with US-063's word rhyme (curriculum, prevalence, vigilance).

## Acceptance criteria

```gherkin
Given  a word whose stressed chunk ends in a short vowel, has no closed keyword, and has another anchor (tacit /ˈtæ.sɪt/: today "yeah" for /tæ/, "sit" for /sɪt/)
  - When  the anchors are found
    - Then  the stressed chunk gets no rhyme (not "yeah", nor ye, des, huh, ke, ca or sta)
    - And   the card is built on the other anchors ("sit")
```

```gherkin
Given  a stressed chunk that ends in a short vowel, where the closed chunk has a keyword (penalty /ˈpɛ.nəl.ti/ → "pen")
  - When  the anchors are found
    - Then  the stressed chunk still gets "pen", as before this story
```

```gherkin
Given  a stressed chunk whose rime has an end sound or a long vowel (drown /dɹaʊn/ → "down"; critique /tik/ → "speak")
  - When  the anchors are found
    - Then  the stressed chunk still gets the same rhyme as before this story
```

```gherkin
Given  a word with an unstressed /dɪ/ chunk (dismiss /dɪ.ˈsmɪs/: today "des" and "kiss")
  - When  the anchors are found
    - Then  that chunk has no anchor, and "des" is never its keyword
    - And   the IPA line teaches that chunk, and the other chunk keeps its anchor ("kiss")
```

```gherkin
Given  a word that has no anchor after the refusal, and no word rhyme (curriculum, vigilance, prevalence)
  - When  Flash runs the one-word command
    - Then  it stops with "no sound anchor found", and no card or log row is written
```

## Logic sketch
- **Approach:** no new step and no new output line. Two small changes in `find-keywords`: `scripts/lib/rhyme.js` gives no rhyme for an open short-vowel chunk, and "des" is never a keyword.
- **Entities:** ChunkKeyword (US-046) is unchanged: exact `ipa\tkeyword\tfreq`, rhyme `ipa\tkeyword\tfreq\trime`, none `ipa\t-`.
- **States:** `chunked → no-anchor` (US-041) now also occurs when the word's only anchor was a weak rhyme or "des".
- **Rules:**
  1. An open short-vowel chunk gets no rhyme: the stressed chunk's rime (nucleus + coda) is one vowel from /ɪ ɛ æ ʌ ʊ/, the same set as `SHORT_VOWELS` in `scripts/lib/closed-chunk.js` (share it, don't copy it). Applies only to the chunk with the primary stress (AC1).
  2. The closed-chunk rule (US-050) still runs first and still wins over the open chunk's result (AC2).
  3. "des" is never a keyword: not exact, not closed, not a rhyme (AC4).
  4. Every other chunk gets the same keyword as before this story (AC3, AC4).
  5. A word with no anchor left stops as before: `stopped at find-keywords: no sound anchor found` (AC5).
- **Edge cases:**
  - Secondary stress (`ˌ`): rule 1 does not apply to it; such chunks never get a rhyme anyway.
  - A one-chunk word with an open short vowel is very rare in English; rule 1 applies to it the same way.
  - Old cards and log rows built on des, ye, yeah or huh are not changed.
  - Until US-063 is built, about 15 more words than today stop; with it, about 3 more than today.

## Open questions
- [ ] Depends on US-063 (Flash, 2026-10-15): US-060 alone makes about 15 more words stop. It stays `refined` until US-063 is `ready`; then set `depends_on: [US-063]` and `ready`.
- [ ] Weak exact keywords and weak closed keywords stay (gen, dev, sen, co, de, ka, eh, que; investigation-008). Not in scope; a later item if Flash wants it.
- [ ] US-041/US-046 tests whose fakes give a stressed chunk a rhyme of "yeah" or "des" must change their fixtures.
