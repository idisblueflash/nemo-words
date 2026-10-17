---
id: US-050
type: story
parent: E01
status: done
qa_status: passing
concepts: [C-003, C-005, C-006, C-007, C-011, C-020, C-024, C-025, C-026, C-032, C-033, C-038]
---
# US-050 A stressed short-vowel chunk takes the next consonant

As Flash, I want a stressed chunk that ends in a short vowel to take the next consonant before the anchor search (penalty /pɛ/ → /pɛn/ "pen"), so that the card is built on a real word and not on the rhymes ye, yeah, des or huh.

**Scope (split from US-046, 2026-10-12):** one of the three anchor types in Flash's own cards for no-anchor words; US-046 does the rhyme.

**Split (refine, 2026-10-13):** the first story was "words that span or shift a syllable boundary, or contain the chunk's sound, so that words with no exact or rhyme anchor still get a card". investigation-007 measured it: span and shift give 0 of the 7 words that stop a usable anchor, so that benefit is not real. The part with a real benefit is one narrow shift, for better anchors: 71 of 316 stressed chunks end in a short vowel, and 62 of them get the rhyme ye, yeah, des or huh today. This story keeps only that shift. The span is US-059. The words that still stop are US-061. The four weak rhyme words are US-060. No rule picks a "contains" anchor by frequency (a median of 111 candidates for each chunk).

## Investigation findings (_david, 2026-10-13)

Full report: [investigation-007](../../investigations/investigation-007-us-050-span-shift-contains-anchors.md).
Throwaway scripts only; every number comes from a run on real data (the real `exactMatches`, `pickKeyword` and `rhymeFor`, a fresh `nemo-words ipa-lookup` dump, `word-freq.js` at the 5e-7 limit). The item gives no rules for the three shapes, so the report states the rules that were measured.

- **Span and shift card no new word.** Of the 7 words that still stop (316 whole words with a GA entry), span rescues 1 and shift rescues 1. Both are durable, with "dura" (7.8e-7) or "a". Of the 6 no-anchor words in the log, span rescues 1 (weathered → whether) and shift 0.
- **Contains and overlap card all 7, but with too many candidates.** A chunk gets a median of 111 "contains" candidates (the most: 1,386). Flash's own word was the most frequent candidate in 5 of the 23 cases where the rule held it.
- **The item's four examples.**
  - vapor, stampede and critique already get a card today, through a rhyme (way, need, speak).
  - "vape" (4.7e-8) and "peed" (3.4e-7) are below the frequency limit. "per" is /pɝ/ in CMU, not /pɚ/.
  - bulge is the only one that stops. It needs neither a span nor a shift: "bulb" shares the onset and vowel, and "judge" is a near-rhyme.
  - Only "stamp" (shift) and "antique" (contains) are found by a rule.
- **Flash's real usage** (230 anchor words in the 130 whole-word log rows, compared with pipeline syllables): exact chunk 48, one-syllable rhyme 27, rhyme over 2+ syllables 17, **span 7**, **shift 24**, **contains 59**, partial overlap 14, onset only 20, no shared sound 13, no GA entry 1. Inside "contains", the anchor starts with the chunk 32 times (substance → submarine) and ends with it 13 times (critique → antique).
- **The rule matters for quality, not for coverage.** With a candidate of 3+ letters that is not a function word:
  - A shift exists for 17 of the 247 unstressed chunks that have no anchor, for 46 of the 164 stressed chunks that have a rhyme, and for 31 of the 145 chunks whose exact keyword has 1–2 letters or is a function word. That is 94 chunks in 86 words.
  - A span exists for 67, 39 and 27 of the same groups: 133 chunks in 76 words. Whole-chunk spans only: 48 chunks in 28 words.
- **Not anticipated: most of "shift" is the syllabifier.** `syllabify.js` leaves a stressed short vowel at the end of its chunk (`ˈpɛ.nəl.ti`, `ˈɹæ.təlz`). 71 of the 316 stressed chunks end that way. 62 of them get a rhyme, and the rhyme is always des (19), yeah (18), ye (18) or huh (7). When the chunk takes the next consonant, 37 of the 71 get an exact word of 3+ letters (pen, rat, plum, drop, path). Flash's own syllables do this in 27 of the 90 log words that have 2+ syllables.
- **Noise by shape.** Shift that takes consonants: clean (median 1 candidate). Shift that gives up consonants: junk (the top candidate is a, e, to or uh in 228 of 289 chunks). Whole-chunk spans: clean, but in 27 of 133 span chunks every candidate is from the headword's own family (apprentice for apprenticeship). Head overlap and near-rhyme by frequency: too loose (median 16 and 33 candidates).
- **Downstream.** `_logan`'s `anchor_unit` list has no value for a span, a shift or a contains anchor; Flash's own rows use `whole-word`, `first-syllable` and `stressed-syllable` for them. A span needs a new line format in `find-keywords.js` (one keyword for two chunks) and changes in `compose-stories.js` (`readChunkKeywords`, `anchorText`), `check-story.js` (`anchorReasons`), `log-card.js` (`anchorUnit`, `buildRow`) and `judge-stories.js` (line 162). A one-consonant shift needs none of these if `find-keywords` prints the shifted piece as the chunk.
- **Bearing on the story.** The premise ("so that words with no exact or rhyme anchor still get a card") is refuted for span and shift. The report recommends a split: (1) build the shift as "a stressed short vowel takes the next consonant", run before the rhyme, for quality; (2) span as a smaller, later story; (3) no contains/overlap rule by frequency. Separately, des, ye, yeah and huh should not be rhyme anchors.

## Acceptance criteria

```gherkin
Given  a word whose stressed syllable ends in a short vowel, where the syllable plus the next consonant is exactly a common word (penalty /ˈpɛ.nəl.ti/: /pɛn/ is "pen")
  - When  Flash runs the one-word command
    - Then  the card is made, with the story built on "pen" for the stressed chunk, not on the rhyme "ye"
    - And   the log row's keyword has "pen" and its anchor unit is "stressed-syllable"
    - And   the card's IPA line and the log row's syllables still show /ˈpɛ.nəl.ti/
```

```gherkin
Given  a word whose stressed chunk takes the next consonant (elastic /ɪ.ˈlæ.stɪk/: /læs/ is "last")
  - When  the anchors are found
    - Then  the next chunk is still /stɪk/ and its keyword is still "stick"
    - And   every chunk other than the stressed chunk has the same result as before this story
```

```gherkin
Given  a word whose stressed syllable ends in a short vowel and has an exact keyword today (era /ˈɛ.ɹə/: /ɛ/ is "eh")
  - When  the anchors are found
    - Then  the keyword of the stressed chunk is the word for the longer chunk (/ɛɹ/, "air"), not "eh"
```

```gherkin
Given  a word whose stressed syllable ends in a short vowel, where the syllable plus the next consonant is no common word (levee: /lɛv/), or only a word of 1–2 letters or a function word (aloe: /æl/ is "al"; dozen: /dʌz/ is "does")
  - When  the anchors are found
    - Then  the stressed chunk has the same result as before this story (levee: the rhyme "ye"; aloe: the rhyme "yeah")
```

```gherkin
Given  a headword that is an inflection of the word for the longer chunk (sweating: /swɛt/ is "sweat")
  - When  the anchors are found
    - Then  that word is not the keyword
    - And   the stressed chunk has the same result as before this story (the rhyme "ye")
```

```gherkin
Given  a word whose stressed syllable does not end in /ɪ ɛ æ ʌ ʊ/ (paper /ˈpeɪ.pɚ/: "pay"; cottage /ˈkɑ.tədʒ/: "ka")
  - When  the anchors are found
    - Then  every chunk has the same result as before this story
```

```gherkin
Given  a word with no exact keyword on any chunk, no rhyme for the stressed chunk, and no common word for the longer chunk (durable /ˈdʊ.ɹə.bəl/: /dʊɹ/)
  - When  Flash runs the one-word command
    - Then  it stops with "no sound anchor found", as before this story
    - And   no card is made and no log row is written
```

## Logic sketch
- **Entities:** closed chunk (C-026): the stressed chunk's IPA plus the first consonant sound of the next chunk. Keyword line of `find-keywords`: `ipa\tkeyword\tfrequency`, where `ipa` is the closed chunk's IPA when the rule gives a keyword. No new column and no new `anchor_unit` value.
- **States:** none.
- **Rules:**
  1. The rule looks only at the chunk with the primary stress (`ˈ`) of a word with 2 or more chunks. It applies when that chunk ends in /ɪ/, /ɛ/, /æ/, /ʌ/ or /ʊ/ and the next chunk starts with a consonant.
  2. The closed chunk is the stressed chunk plus one consonant sound. /tʃ/ and /dʒ/ are one sound (legible: /lɛdʒ/, "ledge").
  3. The closed keyword is the most frequent word that has exactly the closed chunk's GA IPA, has a frequency of at least 5e-7, is not the headword, has 3 or more letters, is not in `FUNCTION_WORDS`, and is not a word that the headword is an inflection of (`isInflectionOf(headword, candidate)` in `check-story.js`).
  4. When a closed keyword exists, it is the stressed chunk's keyword. It wins over the exact keyword of the open chunk and over a rhyme. Its line is an exact line (3 columns) with the closed chunk's IPA, so `compose-stories`, `check-stories`, `judge-stories`, `tag-technique` and `log-card` need no change.
  5. When no closed keyword exists, the stressed chunk gets today's result: the exact keyword of the open chunk, then the US-046 rhyme, then none.
  6. The next chunk keeps the consonant (ADR-0025). The number and order of the keyword lines do not change. The `syllabify` and `chunk` steps do not change.
- **Edge cases:**
  - The stressed chunk is the last chunk, or the next chunk starts with a vowel: the rule does not apply.
  - A chunk with secondary stress (`ˌ`) or no stress: the rule does not apply.
  - A one-chunk word: the rule does not apply.
  - The most frequent candidate fails rule 3 but a less frequent one passes: the one that passes is the keyword.
- **Measured (refine, 2026-10-13, 316 whole words, real `pickKeyword` and frequencies):** 71 words have a stressed chunk that ends in a short vowel before a consonant. 43 closed chunks have a common exact word; 35 of those words have 3+ letters and are not function words (pen, rat, plum, sick, path, bell, ledge, rash, last, sure); 2 of the 35 are the headword's own base (sweating, snubbing). So about 33 of 316 words change. With the shared consonant, no other chunk changes.

## Open questions
- [x] Does the next chunk keep the consonant or lose it? Flash, 2026-10-13: it keeps it (ADR-0025).
- [x] Do /ɑ/ and /ɔ/ count as short vowels? Flash, 2026-10-13: no. 18 more words, 8 with a word, mixed quality (droplet "drop" is better than "law"; automobile "ought" is not better than "awe").
- [ ] Some closed keywords are rare or odd words that pass the frequency limit (fidelity "del", devastating "dev", congenital "gen", simmers "sim"). Assumed acceptable here; US-045 chooses the keyword that fits the story.
- [ ] When E07 moves the pipeline to NOAD, NOAD's own syllable breaks may already close these syllables. Check this rule again then.
