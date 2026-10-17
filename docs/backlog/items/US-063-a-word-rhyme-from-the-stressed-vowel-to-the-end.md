---
id: US-063
type: story
parent: E01
status: done
qa_status: passing
depends_on: [US-046, US-050]
concepts: [C-003, C-005, C-007, C-011, C-020, C-024, C-025, C-026, C-031, C-032, C-033, C-038]
---
# US-063 A word rhyme from the stressed vowel to the end

As Flash, I want a second kind of rhyme anchor that matches the sound from the stressed vowel to the end of the word (levee → heavy, coaster → toaster, bulge → indulge), as well as the rhyme anchor on one chunk that the pipeline uses today, so that more words get a rhyme that sounds like the whole word, and fewer words stop.

**Scope (Flash, 2026-10-15):** keep the rhyme on one chunk (US-046) as it is. Add the word rhyme as a further method beside it. investigation-007 section 6 tried this rule: it has a candidate for 227 of 316 words (111 of the 196 words where the tail has 2+ syllables; a median of 4 candidates). It gives an anchor to 3 of the 7 words that stop today (bulge → indulge, divulge; durable → incurable; garage → massage, barrage). It holds 13 of Flash's 30 anchors of the classes "rhyme over 2+ syllables" and "chunk at the end". Open at refine: the order of the two rhyme methods, and how the word rhyme's keyword line covers more than one chunk (compare US-059).

**Decided (refine, 2026-10-16):** the word rhyme is the last fallback (ADR-0029), and `find-keywords` keeps one line per chunk with a new tag `word-rime` (ADR-0030).

## Acceptance criteria

```gherkin
Given  a one-chunk word with no exact keyword and no one-chunk rhyme (bulge /ˈbʌldʒ/)
  - When  Flash runs the one-word command
    - Then  the card is made, with the story built on a word rhyme ("indulge")
    - And   the log row's keyword is that word and its anchor unit is "rime"
```

```gherkin
Given  a word whose stressed chunk has no anchor, with chunks after it (durable /ˈdʊ.ɹə.bəl/)
  - When  the anchors are found
    - Then  the stressed chunk gets a word rhyme that matches /ʊɹəbəl/ ("incurable"), marked as a word rhyme
    - And   each later chunk has no anchor of its own, because the word rhyme covers it
    - And   a story with "incurable" passes the hard gates, and the card's IPA line is the same as before
```

```gherkin
Given  a word whose stressed chunk gets an anchor today (penalty → "pen", drown → "down")
  - When  the anchors are found
    - Then  no word rhyme is used, and every chunk gets the same keyword as before this story
```

```gherkin
Given  a word with a chunk before the stressed chunk (garage /ɡə.ˈɹɑʒ/)
  - When  the anchors are found
    - Then  the stressed chunk gets a word rhyme ("massage" or "barrage")
    - And   the chunk before it gets the same result as before this story
```

```gherkin
Given  a story for a word-rhyme card whose anchor word does not match the word from the stressed vowel to the end
  - When  the hard gates check the story
    - Then  the story fails with an "anchor-ipa" reason, and it is not picked
```

```gherkin
Given  a word with no exact keyword, no one-chunk rhyme and no word rhyme (breadth, realms, rigged, scarce)
  - When  Flash runs the one-word command
    - Then  it stops with "no sound anchor found", and no card or log row is written
```

## Logic sketch
- **Approach:** no new step and no change to the number of lines. The word rhyme is the last fallback in `find-keywords`; its rules are pure functions in `scripts/lib/rhyme.js`. Small changes in `compose-stories`, `check-story` and `log-card` read the new tag `word-rime`.
- **Entities:**
  - ChunkKeyword (US-046) gets a third match type. Lines: exact `ipa\tkeyword\tfreq`, rhyme `ipa\tkeyword\tfreq\trime`, word rhyme `ipa\tkeyword\tfreq\tword-rime`, none `ipa\t-`.
  - WordTail: the headword's sound from the stressed chunk's vowel to the end of the word = the stressed chunk's rime + every later chunk's IPA, compared with `ipaKey` (durable → /ʊɹəbəl/).
- **Contract:** `wordRhymeFor({ syllableString, lookupLines, freqs, headword })` → `{ keyword, frequency, tail }` or `null`. `find-keywords` runs `nemo-words ipa-lookup --ga <tail>` once and `word-freq` once. Each rule below has its own unit test.
- **States:** adds `chunked → anchored` by a word rhyme on the stressed chunk. `chunked → no-anchor` (US-041) now occurs only when there is no word rhyme either.
- **Rules:**
  1. Order: the word rhyme runs only when the stressed chunk has no anchor after the closed chunk (ADR-0025), the exact match and the one-chunk rhyme (US-046), in that order (AC1, AC3; ADR-0029).
  2. A candidate has a GA form whose sound from its primary-stressed vowel to its end equals the WordTail. It can have any number of syllables (bulge → indulge). All GA forms are tried (as bug-014).
  3. The onset of the candidate's stressed syllable is not empty and differs from the headword's stressed onset (the same onset would be a homophone).
  4. Filters, as for the one-chunk rhyme and the closed keyword: not the headword, not an inflection of the headword, not a word the headword is an inflection of, not in `FUNCTION_WORDS`, frequency 5e-7 or more. The most frequent word that passes wins.
  5. Output: the stressed chunk's line is a `word-rime` line; each later chunk's line is `ipa\t-`, because the word rhyme covers it (AC2); each earlier chunk keeps its line (AC4) (ADR-0030).
  6. `compose-stories`: the prompt line is `/dʊ/ -> "incurable" (rhymes with /ʊɹəbəl/, the end of the word)`; each covered chunk shows `(covered by the rhyme above)`, not "leave this sound out".
  7. `check-story`: for a `word-rime` chunk, it builds the WordTail from the chunk lines and accepts the keyword when one GA form's end from its stressed vowel equals it; otherwise `anchor-ipa: <kw> /…/ does not rhyme with /<tail>/` (AC5).
  8. `log-card`: a word rhyme gives `anchor_unit: rime` (the value of Flash's own levee → heavy row). `keyword` is the same join; covered chunks add nothing.
  9. A word with no anchor left stops as before: `stopped at find-keywords: no sound anchor found` (AC6).
- **Edge cases:**
  - A later chunk with its own exact keyword when the stressed chunk has none: the word rhyme covers it, so that keyword goes (about 1 word of 316 today).
  - Primary stress on the last chunk: the WordTail is only that chunk's rime; unlike the one-chunk rhyme, a candidate can have more syllables.
  - A secondary stress (`ˌ`) after the primary stress is part of the WordTail; only the primary stress counts.
  - A candidate GA form with no `ˈ`: a one-syllable form counts as stressed; a longer form is skipped.
  - A word of the headword's family that is not an inflection (apprentice for apprenticeship) is not caught; the same gap as for the closed keyword.
  - Jev's story rubric gives the top anchor score only to an exact match, so a word-rhyme story scores as a one-chunk rhyme story does today. Unchanged.
  - Old cards and log rows do not change.

## Open questions
- [ ] Measured on real data in investigation-007 §6 and investigation-008 §6 with a quick version of this rule (stops 7 → 4 today; 13 of the 16 words US-060 would stop get a word rhyme). The built rule can differ by a word or two; the ACs name only the examples.
- [ ] The most frequent word rhyme is not always the best one for a story (garage: massage or barrage). US-045 lets Jev choose.
- [ ] Before US-060 is built, the open short-vowel chunks still get ye / yeah / des / huh, so the word rhyme seldom runs. US-060 can now set `depends_on: [US-063]` and go to `ready`.
- [ ] US-041/US-046 tests whose fakes make a word stop at `find-keywords` can now find a word rhyme; their fakes must give none.
- [ ] Not in scope: running the word rhyme before the one-chunk rhyme (ADR-0029, not measured).
