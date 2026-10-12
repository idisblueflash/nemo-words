---
id: SP-052
type: spike
parent: E07
status: in-progress
qa_status: passing
timebox: 1d
---
# SP-052 Does NOAD find as many exact sound anchors as CMU?

**Why now:** Tests E07's main bet before anything is built, and unblocks US-053. If NOAD finds clearly fewer anchors than CMU, the epic stops here. `_david` runs it.
**Method:** A prototype extracts NOAD from the Mac's own `Body.data`, splits each word into syllables, and finds each syllable's exact anchor once with NOAD only and once with CMU only, the same way the card pipeline's `find-keywords` step does today. NOAD gets its own syllabifier, because its stress marks already set syllable boundaries and it writes the r-coloured vowel as `ər`.
**Done when:** For the card file's words, the mnemonic log's words and a word sample, we have the anchor count per word from NOAD (canonical format: keep a bracketed sound, drop only the brackets, except `(h)` before `w`) and from CMU, plus the share of headwords with US IPA in each, and a go / no-go for E07. **Go** if NOAD anchors at least 95% as many words as CMU over the whole word set; otherwise no-go. The bar is fixed before the run.

## Acceptance criteria

```gherkin
Given  the word set: every whole-word row in the card file (337), every word in the mnemonic log (160), and 200 more words drawn with a fixed seed
  - When  the spike run builds the word set
    - Then  duplicates are merged and each word is listed once with its sources
    - And   word-part rows and personal names are left out
```

```gherkin
Given  one word from the set
  - When  the spike looks it up in each dictionary
    - Then  it records whether NOAD has a US IPA for it, and whether CMU has one
    - And   the NOAD IPA is put in the canonical format: a bracketed sound is kept and only the brackets are removed, except that (h) before w is dropped
    - And   the raw NOAD string is kept next to the canonical one
```

```gherkin
Given  a word that has IPA in a dictionary
  - When  the spike finds that word's anchors with that dictionary only
    - Then  a CMU IPA is split by today's syllabify step, and a NOAD IPA by a new NOAD syllabifier
    - And   the NOAD syllabifier never moves a boundary that a NOAD stress mark sets, and splits only the unstressed stretches between them
    - And   each syllable gets the most frequent common word whose IPA in that same dictionary equals the syllable's IPA exactly, with the frequency cut-off the card pipeline uses today
    - And   the word itself is never its own anchor
```

```gherkin
Given  every word has been checked with both dictionaries
  - When  the spike report is written
    - Then  for each source and in total, it shows the share of words with US IPA, anchored syllables, and words with at least one anchor, for NOAD and CMU side by side
    - And   it lists each word that has an anchor with one dictionary and none with the other
    - And   for words whose IPA is the same in both dictionaries, it counts how often the two syllable splits differ, and lists those words
    - And   it ends with a go or no-go for E07, against the bar in **Done when**
```

```gherkin
Given  a word is in only one dictionary, or NOAD's entry has no US IPA
  - When  the spike counts anchors
    - Then  the word counts as unanchored for the dictionary that lacks it
    - And   the report lists these words separately, with their reason
```

## Logic sketch
- **Approach:** throwaway prototype under `spikes/sp-052/`, like SP-037. The NOAD extract script `dictionaries/noad/extract.py` is committed; it reads the Mac's own NOAD `Body.data` and writes to `dictionaries/noad/data/`, which is gitignored. The extract is never committed and never goes in the release jar (Claudepot decision 39feb3d3). The NOAD syllabifier is written as a step CLI (`syllabify-noad <ipa>`, EN-036's step contract) so US-053 can promote it instead of rewriting it.
- **Entities:**
  - SpikeWord: word, sources (card | log | sample)
  - DictEntry: dict (noad | cmu), rawIpa, canonicalIpa, syllables
  - ChunkAnchor: ipa, keyword or none, frequency
  - WordResult: per dict, hasUsIpa, anchoredChunks, totalChunks, anchored?
- **Rules:**
  - Canonical NOAD format: keep the sound and drop the brackets, but drop `(h)` before `w`.
  - When NOAD gives more than one US IPA, the first one is used.
  - NOAD keyword candidates are single lowercase a–z headwords, and derivatives that have their own IPA.
  - Frequency comes from `scripts/word-freq.js`, cut-off `5e-7` (`FREQ_THRESHOLD` in `find-keywords.js`).
  - The 200-word sample is drawn from words in both dictionaries with a frequency at or above the cut-off. The seed is printed in the report.
  - Inflections (e.g. *cats*, *walked*) are left out as keywords on both sides, because NOAD has no inflection entries yet (US-055 adds them). The report counts how many CMU anchors were inflections.
  - Copyright: the committed `report.md` holds counts and word lists only. The per-word IPA comparison goes to the gitignored `dictionaries/noad/data/sp-052-detail.tsv`.
- **Edge cases:**
  - A NOAD entry with a respelling but no IPA.
  - Homographs (e.g. *lead* noun / verb): each IPA counts as a variant.
  - The extract is missing: the spike exits 2 and says how to run `extract.py`.

## Open questions
- [ ] The NOAD syllabifier's rule for `ər` before a vowel (e.g. `ˈɪntərəst`). `_david` measures how often it occurs and picks a rule.
- [ ] Whether derivatives without their own IPA get one by rule. Default: no, they are left out.
