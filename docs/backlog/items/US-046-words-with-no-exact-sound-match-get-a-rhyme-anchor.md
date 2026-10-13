---
id: US-046
type: story
parent: E01
status: done
qa_status: passing
depends_on: [US-041]
concepts: [C-003, C-005, C-006, C-011, C-020, C-024]
---
# US-046 Words with no exact-sound match get a rhyme anchor

As Flash, I want a word whose chunks have no exact-sound keyword to still get an anchor (a rhyme like crown→drown, or a chunk split like bulb / judge), so that the one-word command cards it instead of stopping at "no sound anchor found".

**Scope (split from US-041, 2026-10-12):** on a 40-word sample, 16 words had no exact-IPA keyword on any chunk and now stop at `no-anchor` (US-041). Flash's own cards for them used rhymes (`anchor_unit: rime`), proper names or chunk splits. Fall back to one of these only when no exact match exists, keeping word-workflow.md's "perfect IPA match" rule for the chunks that have one.

**Split (refine, 2026-10-12):** Flash's anchors for the 14 no-anchor words in the saved measurement are of three types: a rhyme of the stressed syllable (drown→crown, latch→catch, crest→rest), a proper name (stew→Stu, critique→Chris) and a split or shifted chunk (vapor→vape/per, stampede→stamp/peed, bulge→bulb/judge). This story does only the rhyme. Names are US-049; split or shifted chunks are US-050. A probe of the rhyme rule below gave an anchor for about 10 of the 14 (drown→down, latch→catch, cocked→locked, crest→best, cramped→stamped, flux→trucks, stampede /pid/→need, critique /tik/→speak); bulge stays no-anchor. Built rule on real data (implement, 2026-10-12): stew /stu/→two and vapor /veɪ/→way also get a rhyme; Flash accepted both as anchors.

## Acceptance criteria

```gherkin
Given  a word whose stressed syllable has no common word with exactly its sound, but rhymes with one (drown /dɹaʊn/ → down)
  - When  Flash runs the one-word command
    - Then  the card is made, with the story built on the rhyme word
    - And   the log row's keyword is the rhyme word and its anchor unit is "rime"
```

```gherkin
Given  a word whose stressed syllable has a common word with exactly its sound
  - When  Flash runs the one-word command
    - Then  that exact-sound word is the anchor, never a rhyme
```

```gherkin
Given  a stressed syllable whose most frequent rhyme is a function word (flʌs → "us", "thus")
  - When  the anchors are found
    - Then  no function word is used as a rhyme
    - And   the most frequent rhyme that is not a function word is used (flʌs → "plus")
```

```gherkin
Given  a word with an unstressed syllable that has no exact-sound word (critique: kɹɪ)
  - When  the anchors are found
    - Then  that syllable stays unanchored, with no rhyme offered
    - And   the stressed syllable still gets its rhyme (tik → speak)
```

```gherkin
Given  a word with no exact-sound word and no common rhyme for its stressed syllable (bulge)
  - When  Flash runs the one-word command
    - Then  it still stops with "no sound anchor found", as before
```

## Logic sketch
- **Approach:** no new step. A new pure module, `scripts/lib/rhyme.js`, holds the rhyme rules (no I/O). `find-keywords` calls it for the stressed chunk, only when that chunk has no exact keyword, and writes the result in the same output line with a fourth column `rime`. Two small changes downstream read that column: `log-card` (anchor unit) and `compose-stories` (prompt).
- **Entities** (names shared with US-041):
  - ChunkKeyword: ipa, keyword | null, frequency, match (`exact` | `rime`). Output lines: exact `ipa\tkeyword\tfreq` (unchanged), rhyme `ipa\tkeyword\tfreq\trime`, none `ipa\t-` (unchanged).
  - FunctionWords: a fixed list in `scripts/lib/rhyme.js` — pronouns, articles, prepositions, conjunctions, auxiliary verbs, and words such as "thus".
- **Contract:** `rhymeFor({ chunkIpa, lookupLines, freqs, exclude })` → `{ keyword, frequency }` or `null`. `find-keywords` runs `nemo-words ipa-lookup --ga <rime>` (→ `lookupLines`) and one `word-freq` call (→ `freqs`). Each rule below has its own unit test in `test/rhyme.test.js`.
- **States:** adds `chunked → anchored` by a rhyme on the stressed chunk. US-041's `chunked → no-anchor` stays; it now occurs only when no chunk has an exact keyword and the stressed chunk has no rhyme.
- **Rules:**
  - Exact match first: a chunk gets a rhyme only when it has no exact keyword (AC2).
  - Only the stressed chunk (the one with `ˈ`; a one-chunk word's only chunk) gets a rhyme. Other chunks with no exact keyword stay unanchored (AC4).
  - A rhyme word has one syllable; its GA rime (nucleus + coda) equals the chunk's rime (compared with `ipaKey`); its onset is not empty; it is not the headword; it is not in FunctionWords (AC3); its frequency is at least 5e-7, the exact-keyword limit.
  - Of the words that pass, the most frequent one is the rhyme.
  - `log-card`: when the stressed chunk's keyword is a rhyme, `anchor_unit` is `rime`; otherwise the rule is unchanged. `keyword` is unchanged: the anchored chunks' keywords joined with " / " (AC1).
  - `compose-stories`: the prompt line for a rhyme chunk is `/dɹaʊn/ -> "down" (rhymes)`.
- **Edge cases:**
  - A stressed syllable with no coda (stew /stu/, vapor /veɪ/) has a vowel-only rime. The rules still apply; the probe found bad words here, which the onset rule and FunctionWords mostly remove. On real data they give stew→two and vapor→way, which Flash accepted (2026-10-12).
  - The rime lookup can return hundreds of words (/ʌs/). All go to `word-freq` in one call, so it stays one call per word.
  - A word with primary and secondary stress (`ˈ`, `ˌ`): only the primary-stressed chunk gets a rhyme.

## Open questions
- [ ] Measured on 14 words only (about 10 get a rhyme); the real share can differ.
- [ ] The most frequent rhyme is not always the best for the story (cocked gets "locked"; Flash used "knocked"). US-045 lets Jev choose among rhymes.
- [ ] FunctionWords is fixed and short; a non-picturable word outside it can still be chosen. Extend the list when such a card occurs.
- [ ] US-041's tests that stop at `find-keywords` can now find a rhyme; their fakes must give no rhyme for the stressed chunk.
