---
title: "US-049: do proper names as sound anchors card more words? (after US-046)"
status: findings-recorded
related_item: "[US-049](../backlog/items/US-049-proper-names-as-sound-anchors.md)"
investigated: 2026-10-12
---

## Goal

Measure US-049 on real data before it is refined. US-049 wants a familiar first name as
the anchor for a chunk that has no common exact-sound word (stew→Stu, critique→Chris,
simmers→Sim, regional→Al), "so that more words get a card".

## Method

- **The 40-word sample.** It is not saved in the repo. It lives in the US-041 refine
  session's scratchpad: `/private/tmp/claude-501/-Users-husongtao-Projects-nemo-words/22ca10d3-aa5d-451f-8131-490a491306da/scratchpad/words.tsv`
  (40 rows of `word<TAB>syllabification`, copied from the `syllabification` of the log
  rows). With exact matching only, it gives 14/40 no-anchor words. That matches US-046's
  "14 no-anchor words in the saved measurement". US-041 says 16, but that number does not
  reproduce.
- **Two syllabifications.** "log" uses the sample's syllables, which are the log's own.
  "pipeline" uses what `card.js` really sees: `ipa.js` (the first GA variant) and then
  `syllabify.js`. They differ often. Example: simmers is `ˈsɪm.ɚz` in the log but
  `ˈsɪ.mɚz` in the pipeline, and critique is `kɹɪ.ˈtik` in the log but `kɹə.ˈtik` in the
  pipeline.
- **All words.** I took the union of the whole-word rows of `data/mnemonics/log.jsonl`
  and the non-`medical-word-parts` rows of `anki/reading-room-terms.txt`. That is 334
  words. 18 of them have no GA entry, so the pipeline stops them at `no-ipa`. That leaves
  316 words with 726 chunks: 316 stressed and 410 unstressed.
- **How the rules ran.** `find-keywords`' own `exactMatches`, `chunk`, `rhymeCandidates`
  and `rimeOf` functions ran over a full `nemo-words ipa-lookup --ga ""` dump (294,408
  rows). Frequencies come from the same Google Ngram endpoint as `word-freq.js`, queried
  twice for each word: once lowercase (the value `word-freq` returns) and once
  Capitalized. I checked 12 words against the real `node scripts/find-keywords.js`: bulge,
  breadth, durable, garage, realms, rigged, scarce, stew, critique, simmers, vapor and
  regional. All 12 gave the same result.
- **Name list.** `/usr/share/dict/propernames` (macOS/BSD, 1,308 entries). 1,067 of them
  are in the CMU-based dictionary. A name counts as "familiar" when its Capitalized Ngram
  frequency is at least 5e-7 and is higher than its lowercase frequency. That leaves 839
  names. I also tried a second source ("C"): any dictionary word whose Capitalized form is
  more frequent than its lowercase form.

## 1. Coverage now (exact + US-046 rhyme)

| Set | Words | Stop at "no sound anchor found" | Stressed chunks unanchored | Unstressed chunks unanchored |
|---|---|---|---|---|
| 40 sample, log syllables | 40 | **2** (stools, bulge) | 2/40 | 28/51 |
| 40 sample, pipeline syllables | 39 (+ polysemy at `no-ipa`) | **1** (bulge) | 1/39 | 32/48 |
| All whole words, pipeline | 316 (+18 `no-ipa`) | **7** (2.2%): breadth, bulge, durable, garage, realms, rigged, scarce | 8/316 | 247/410 |

With exact matching only, the same sets give 14/40, 19/39 and 122/316 no-anchor words. So
US-046 already cards almost all of them. stools fails only on the log side, because the
log IPA has a dark `ɫ`.

## 2. Name source and "familiar" cut-off

- **There is no names list in the repo.** `resources/data/` and `dictionaries/` have none,
  and `kaikki-en.jsonl` isn't present. The CMU dictionary and `nemo-words ipa-lookup` do
  hold names as lowercase rows with GA IPA (`stu stˈu`, `chris kɹˈɪs`, `sim sˈɪm`), but
  nothing marks a row as a name.
- **`word-freq.js` can't see names.** It lowercases every input and keeps only the
  lowercase n-gram, so `Stu` is scored as `stu`: 2.1e-7, while Capitalized `Stu` is
  6.3e-7. Some names already pass the exact-keyword limit (5e-7) as lowercase words:
  `sim` 5.35e-7, `dev` 5.6e-7, `reg` 9.1e-7, `dee` 5.4e-7, `jim` 5.0e-7, `sam` 5.3e-7.
  This means the exact rule can already pick a name, but as a "common word" (log syllables:
  simmers `sɪm` → `sim`).
- **propernames is dirty and incomplete.**
  - It contains common words and titles: The, No, Revised, Leads, Spy, Lord, Sir, King,
    June, Roman, Israel and Jesus. The case-ratio filter removes "the", "no" and "will",
    but not "sir", "king" or "lord".
  - It contains double-meaning names: Dick, Randy and Rod.
  - It lacks 9 of the 21 first names Flash used: Nia, Liv, Dell, Dee, Reg, Melissa, Dev,
    Sim and Faye.
- **Ngram frequency does not measure familiarity.** Near the 5e-7 cut-off, Stu (6.3e-7)
  sits beside Srinivasan, Knudsen, Oleg, Piotr and Gunter. Sherri, Teri and Brandi fall
  just below it. The top of the list is John, Lord, Jesus, James, King and David. Of
  Flash's own names, Stu (6.3e-7) is the lowest that the dictionary holds; Nia has no IPA
  entry. All the others are at least 1.07e-6.
- **Source C is worse.** It returns c, j, yeah, yeh, fort, sect, fig, prague, beale,
  recht and waugh.
- **Proposal, if names go ahead.** Vendor a US given-name popularity list. One option is
  the SSA national baby-names data, which is public domain, cut at a fixed rank. Join it
  to the CMU GA IPA, and keep a deny list of title/word "names". I did not measure this,
  because the data isn't offline here.

## 3. Rule options on the 316 words (propernames source, familiar = Capitalized ≥ 5e-7)

| Option | Extra words carded | Chunks gaining an anchor | Names chosen |
|---|---|---|---|
| (a) exact name, stressed chunk only, after exact + rhyme fail | **0** | 0 | — |
| (a) + a rhyming name | 1 | 1 stressed | garage `ɑʒ` → Raj |
| (b) exact name on any chunk with no exact keyword (rhyme first) | 0 | 5 unstressed | Ning ×3 (adjoining, rationing, summoning), Tran ×2 (translucent, transplants) |
| (b) with the name tried before the rhyme | 0 | 5 unstressed; 4 stressed rhymes replaced | stew two→**Stu**, timber dim→**Tim**, innate state→**Nate**, evicted quick→**Vic** |
| (c) (b) + rhyming names | 1 | 1 stressed + 24 unstressed | Raj, Sid ×4, Lee ×3, King ×3, Ning ×2, Tran ×2, Kate, Neil, Shaw, Stuart, Vince, Nick, Jay, Sam, Jim |

On the 40-word sample, every option carded 0 extra words. Option (b) added 1 chunk on
each side. Option (c) added 5 chunks with log syllables and 4 with pipeline syllables.
Source C carded 2 extra words: Raj, and realms → Helms. Its exact names were mostly
odd: Flynn, Hough, Venn, Loeb, Beck, Sep, Waugh, Recht, Beale, Ching, Ming and Bing.

**The story's own examples.** None of the four is produced by a rule that fires only on
"no common exact-sound word":

| Example | What the pipeline does now | Why the rule can't give the name |
|---|---|---|
| stew → Stu | rhyme "two" | The trigger never fires. Only name-before-rhyme gives Stu. |
| critique → Chris | `kɹə` | `kɹɪs` is longer than the chunk. That is a shifted chunk (US-050). |
| simmers → Sim | `ˈsɪ.mɚz` → rhyme "des" | With log syllables, the exact rule already picks lowercase "sim". |
| regional → Al | `nəl` | `æl` is neither exact nor a rhyme. |

**How Flash uses names (log, 160 rows).** 24 rows (21 of the 130 whole-word rows) have a
first name in `keyword`. Compared with the row's chunks:

- **13 rows are an exact match:** Stu ×2, Kay, Ann ×2, Dell, Dee ×2, Reg, Lee ×2, Dev and
  Sim.
  - 4 of these chunks (Dell, Dev, Reg, Sim) don't exist in the pipeline, because the
    syllabifier makes open syllables (`dɛ.lə`, `dɛ.və`, `ɹɛ.ɡjə`, `sɪ.mɚz`).
  - The pipeline already anchors the other 8 rows' chunks, which leaves the name
    unused: `stu` → two, `keɪ` → **k**, `æn` → **an**, `di` → de, `li` → **li**.
- **4 rows are a name longer than the chunk:** Chris, Aaron, Nick and Victor.
- **7 rows are other:** Liv/glass, Carl/knocked, Faye/saint and Drew/Rome use the name as
  an onset helper beside a rhyme. The rest are Melissa, Al and Nia.

Where a familiar name exactly matches one of Flash's chunks (16 chunks), Flash used the
name **7** times, a common word 3 times (man, you, stew) and neither 6 times. In all 7
name cases, the pipeline has a common exact word or a rhyme: stew → two, Kay → k,
Ann → an, Lee → li. **Every time,** Flash chose the name over the letter, function word
or rhyme.

## 4. Bad picks and edge cases

- **Unfamiliar names:**
  - Ning, Tran, Raj and Sid as exact or rhyming names.
  - Many surnames that pass the frequency bar (Tran, Leung, Knudsen, Malloy).
  - Through source C: Recht, Waugh, Loeb, Venn and Hough.
- **Not really names:** King, Sir and Lord pass the filter. Current exact picks already
  include `sir` for /sɝ/ (certify, circuitry, circulation, surgeon).
- **Double meanings:** Dick, Randy and Rod are in propernames.
- **Headword:** only "revised" is both a headword and in propernames (a junk entry).
  Excluding the headword, as US-046 does, covers it.
- **Names that the exact rule already catches as words:**
  - When a lowercase name is at least 5e-7, it is picked as a "common word": sim, dev,
    lin, ben, sue, sam, jim and al. Example: rev `ɹɛv` → rhyme "dev".
  - The story drafter gets them in lowercase, with no hint that they are names.
  - Al is never a candidate, because lowercase "al" is 4.2e-4 ("et al."). Drew is never a
    candidate either, because it is the past tense of "draw".

## Side findings (outside US-049, for US-045 / a new item)

- **Letters and function words.** 88 of the 307 exact-anchored chunks are a single letter
  or a FunctionWords entry: a ×20, in ×13, to ×10, t ×7, v ×4, o ×4, an ×3, can ×3, me ×3,
  k ×2, and so on. Counting non-words (des, co, le, ek, ul, …) too, the number is 120.
  The exact rule does not apply FunctionWords; only the rhyme rule does.
- **Odd anchors across the 316 words:**
  - "yeah" is the anchor for an /Cæ/ chunk 18 times (tacit, tackle, shattered,
    stamina, …).
  - "des" is the anchor 8 times.
  - "li" is the anchor 6 times, "ting" 4 times and "ling" 3 times.
- **A name could replace some of these picks.** On the 316 words, a familiar name exists
  for 6 of the letter or function-word picks: j→Jay, k→Kay ×2, an→Anne ×2, su→Sue. If
  `li` counts as a fragment, Lee could also replace 6 `li` picks. That gives about 12
  chunks of better quality, and 0 extra cards.

## Conclusion

- **The premise does not hold after US-046.** A name card would gain 0 extra words (exact
  name) or 1 extra word (garage → Raj) out of 316. On the 40-word sample it gains 0. Only
  7 of 316 words still stop, and names don't fix them.
- **What Flash's cards show.** Flash uses names for picture quality: a character in the
  story instead of a letter, an article or a rhyme. Flash does not use them to fill gaps.
  Half of Flash's names are also outside a one-chunk exact rule, either longer than the
  chunk (Chris, Victor) or an onset helper (Liv/glass).
- **Recommendation: don't refine US-049 as written.** Choose one of these:
  - Park it.
  - Re-scope it to "a familiar name replaces a non-picturable exact keyword (letter,
    function word, fragment) or a rhyme on the stressed chunk". That would change about
    16 chunks on 316 words and card nothing new. It needs a vendored, curated given-name
    list first, because propernames and Ngram case frequency both fail the "familiar"
    test.
  - Fold the "letters/function words as exact keywords" fix into US-045 or a new item.
    That is the larger quality problem: 88/307 chunks.

Scratch scripts: `pass1.js`, `pass2.js`, `capfreq.js`, `logname.js`, `logpref.js`,
`junk.js`, in this session's scratchpad. They are not kept in the repo.
