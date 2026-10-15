---
title: "US-060: what happens when the rhyme rule refuses ye, yeah, des and huh?"
status: findings-recorded
related_item: "[US-060](../backlog/items/US-060-the-rhyme-rule-refuses-ye-yeah-des-and-huh.md)"
investigated: 2026-10-15
---

## Goal

Measure US-060 on real data before it is refined. US-060 wants the rhyme rule to refuse
rhyme words that cannot carry a picture (ye, yeah, des, huh), "so that a stressed chunk
gets a rhyme that I can see in a story, or none".

US-050 (the closed chunk, `scripts/lib/closed-chunk.js`) is now built. So this report
measures the `find-keywords` of today, not the one that
[investigation-007](investigation-007-us-050-span-shift-contains-anchors.md) measured.

## Method

- **Word set.** The "316 set" of investigation-007: the whole-word rows of
  `anki/reading-room-terms.txt` (tags not `medical-word-parts`) plus the whole-word rows of
  `data/mnemonics/log.jsonl`, that have a GA entry. The set did not change: 315 words plus
  `cloak` (the card row with no tab). Syllables come from the pipeline (the first GA form,
  as `scripts/ipa.js` takes it, then `syllabify`). 726 chunks.
- **Real functions.** A copy of `findKeywords` (`scripts/find-keywords.js`) that calls the
  real `chunk`, `exactMatches`, `pickKeyword`, `closedChunk`, `canBeClosedKeyword`,
  `rhymeCandidates`, `rhymeFor` and `rimeOf`. Only the I/O is replaced: the lookup lines
  come from a fresh `nemo-words ipa-lookup --ga ""` dump (294,408 rows).
- **Frequencies.** Fresh `scripts/word-freq.js` values for every exact, closed and rhyme
  candidate of every chunk (5,528 words, 79 not found), plus 111 more words for the
  checks below. The limit is the pipeline's 5e-7.
- **Check against the real script.** I ran the real `ipa.js` → `syllabify.js` →
  `find-keywords.js` on 10 words (dismissal, levee, aloe, dozen, sweating, curriculum,
  penalty, undeniable, trivial, bulge). All 10 lines agree with the copy.
- **Variants.** The four words (and later a list of seven) were refused in one or more of
  three places: the rhyme (`exclude` of `rhymeFor`), the closed keyword (as a
  `FUNCTION_WORDS` entry does today) and the exact keyword.

**Today, 316 set (726 chunks).**

| Status today | Chunks |
|---|---|
| exact keyword | 303 |
| closed keyword (US-050) | 37 |
| rhyme on the stressed chunk | 132 |
| stressed chunk with no anchor | 7 |
| unstressed chunk with no anchor | 247 |

7 words stop with "no sound anchor found": breadth, bulge, durable, garage, realms,
rigged, scarce. These are the same 7 as before US-050.

## 1. Which chunks get des, yeah, ye or huh today

**37 chunks on 36 words.** 30 are rhymes on the stressed chunk, and 7 are exact keywords
on an unstressed chunk. No closed keyword is one of the four.

| Keyword | As a rhyme (stressed chunk) | As an exact keyword (unstressed chunk) |
|---|---|---|
| des | 10: adherence `hɪ`, curriculum `ɪ`, dismissal `smɪ`, inhibitor `hɪ`, legitimate `dʒɪ`, remission `mɪ`, stimulate `stɪ`, suspiciously `spɪ`, trivial `tɹɪ`, vigilance `vɪ` | 7, all on `dɪ`: depicted, descendant, discrete, dismiss, dismissal, indispensable, undeniable |
| yeah | 10: aloe `æ`, apparatus `æ`, evaporate `væ`, idiosyncratic `kɹæ`, scatter `skæ`, shattered `ʃæ`, stamina `stæ`, tacit `tæ`, tavern `tæ`, vapid `væ` | 0 |
| ye | 7: intestine `tɛ`, levee `lɛ`, premise `pɹɛ`, prevalence `pɹɛ`, residue `ɹɛ`, sweating `swɛ`, weathered `wɛ` | 0 |
| huh | 3: dozen `dʌ`, flustered `flʌ`, snubbing `snʌ` | 0 |
| **Total** | **30** | **7** |

So US-050 cut the rhymes from 62 (investigation-007) to 30, and 30 remain. The item's
"about 33 replaced" holds: 32 were replaced.

**All 30 rhymes are on a stressed chunk that ends in a short vowel.** The pipeline has 71
stressed chunks whose rime is a lone short vowel (/ɪ ɛ æ ʌ ʊ/). Today they get: a closed
keyword 37, one of the four words as a rhyme 30, an exact keyword 3 (`to`, `eh` ×2), no
anchor 1 (durable). So these 30 are the stressed chunks where the closed chunk found no
word. The reasons, from the closed IPA's candidates:

- No word at all with that IPA: 16 (`hɪɹ`, `ɪk`, `smɪs`, `væp`, `flʌs`, `hɪb`, `dʒɪt`,
  `pɹɛv`, `ɹɛz`, `stɪm`, `spɪʃ`, `tæv`, `tɹɪv`, `vɪdʒ`, `wɛð`; `væp` counts twice, for evaporate and vapid).
- Words below 5e-7 only: 9 (lev 1.2e-7, prem 4.2e-8, tess 1.0e-8, stam 4.8e-8, krat,
  mish, shatt, tass, scat).
- A word that the rule refuses: 5 (al and at have fewer than 3 letters; does is a
  function word; snub and sweat are words that the headword is an inflection of).

Outside these rimes, the four words never win a rhyme. For the rime /ɛs/, des is number 6
of 11 (after less, stress, press, guess, dress). For /i/, ye is number 16 of 69.

## 2. What each chunk gets when the four words are refused

**Refused in the rhyme only:** 30 chunks change on 30 words.

| The chunk gets | Chunks | Words |
|---|---|---|
| no anchor (des and yeah were the only rhymes at or above 5e-7) | 20 | adherence, aloe, apparatus, curriculum, dismissal, evaporate, idiosyncratic, inhibitor, legitimate, remission, scatter, shattered, stamina, stimulate, suspiciously, tacit, tavern, trivial, vapid, vigilance |
| **ke** (2.2e-6), for /ɛ/ | 7 | intestine, levee, premise, prevalence, residue, sweating, weathered |
| **ca** (5.9e-6), for /ʌ/ | 3 | dozen, flustered, snubbing |
| a picturable word | **0** | |

**Stops: 7 → 17.** 10 more words stop with "no sound anchor found", because no other
chunk has an exact keyword: adherence, apparatus, curriculum, scatter, shattered,
stamina, suspiciously, tavern, vapid, vigilance.

The full list of rhymes at or above 5e-7 for these rimes, most frequent first:

| Rime | Rhymes at or above 5e-7 | Below 5e-7 |
|---|---|---|
| /ɪ/ | des 3.8e-5 | bui, pih |
| /ɛ/ | ye 4.3e-5, ke 2.2e-6 | heh 4.5e-7, yeh 3.9e-7, leh, reh, zeh, bue, kreh, sneh, lueh |
| /æ/ | yeah 1.0e-5 | pah 2.0e-7 |
| /ʌ/ | huh 6.4e-6, ca 5.9e-6, sta 5.1e-7 | duh 4.4e-7, dah 3.8e-7, suh 3.0e-7, ruh, brugh, rugh, klugh, krugh |
| /ʊ/ | (none) | (none) |

So the next rhyme is never picturable. "ke" (CMU /kɛ/) and "ca" (CMU /kʌ/, also /si eɪ/)
are abbreviations, and "sta" is an abbreviation too. The story's "a rhyme I can see, or
none" becomes "none" for all 30 chunks.

## 3. Other unpicturable words, and where the refusal applies

**The pattern is clear and closed.** The dictionary has 27 one-syllable words whose rime
is a lone short vowel, at any frequency (table above). Not one is picturable: all are
interjections (huh, heh, yeh, duh, pah), abbreviations (ca, ke, sta) or CMU entries for
names or reduced forms (des as /dɪ/, ye as /jɛ/). The 7 at or above the limit are des, ye,
ke, yeah, huh, ca and sta. English has almost no real word that ends in a stressed short
vowel. This is the same reason that US-050 closes these chunks.

**Proposed rule, in place of a word list:** a chunk whose rime is a lone short vowel
(/ɪ ɛ æ ʌ ʊ/, the `SHORT_VOWELS` of `closed-chunk.js`) gets no rhyme. On this data it has
the same effect as refusing the 7 words. It needs no upkeep, and it does not touch "des"
or "ye" where they are a rhyme for a longer rime (where they never win anyway).

**Effect of the rule (or of the 7-word list), in the rhyme:** the same 30 chunks lose their
rhyme, and all 30 get no anchor. **Stops: 7 → 22.** The 15 new stops are the 10 above plus
dozen, flustered, prevalence, snubbing and weathered (these 5 lost ke or ca).

| Variant | Chunks changed | Picturable replacements | Stops (today 7) |
|---|---|---|---|
| 4 words, rhyme only | 30 | 0 (10 get ke or ca) | 17 |
| 4 words in `FUNCTION_WORDS` (rhyme + closed keyword) | 30 | 0 | 17 |
| 4 words, rhyme + closed + exact | 37 | 0 | 18 (+ dismissal) |
| 7 words or the short-vowel rule, rhyme + closed | 30 | 0 | 22 |
| 7 words, rhyme + closed + exact | 37 | 0 | 23 |

**The closed keyword.** Adding the words to `FUNCTION_WORDS` changes no closed keyword on
the 316 set. A closed IPA ends in a consonant, so of the four only des (/dɛs/) can ever be
a closed keyword. In the whole dictionary, 62 entries have the closed chunk /dɛs/
(decimal, decibel, decimate, desiccate, clandestine, …), and des is the only word with
that IPA. So those words would get "des" as a closed keyword today. None is in the set.

**Weak keywords that this item does not cover** (counted today on the 316 set):

- Rhymes: dev (rev) and cal (scalpel), 1 each. They are abbreviations, but rare here.
- Closed keywords: gen, dev, dis, elle, esse, del, kan, sim, gran (1 each, 9 of 37).
- Exact keywords on the stressed chunk: co ×4, de ×3, ka ×2, eh ×2, and j, k, n, na, ne,
  que, tae, po, lb, su, ul, nie, dos, ma, pa (1 each). `FUNCTION_WORDS` never applies to
  exact keywords, and 1–2 letter exact keywords are allowed.

These are the same problem in other places. They need a separate decision.

## 4. Chunks outside the stressed chunk

Other chunks never get a rhyme, so a rhyme-only refusal changes nothing outside the
stressed chunk. The only other use of the four words is the exact keyword **des** on an
unstressed /dɪ/: 7 chunks on 7 words (list in section 1). It is the only word with the
GA IPA /dɪ/ (CMU gives des a reduced form `dˌɪ`). In the whole dictionary, 2,306 entries
have a /dɪ/ chunk (addition, accredited, adjudicate, …). So every new word with a /dɪ/
chunk (most di- and de- words) gets "des".

This matters because `check-story` (`anchorReasons`) asks for **every** keyword in the
story, in order (`anchor-missing: des`). So "des" on an unstressed chunk forces the story
to contain "des". Refusing des as an exact keyword turns these 7 chunks into no anchor.
Alone, it adds 0 stops. With the rhyme refusal, it adds 1 stop (dismissal).

No log row or card story uses any of the seven words today (160 log rows, 0 auto-picked).
So no saved card needs to change.

## 5. The US-051 arm draw

`draw-arm` (`scripts/draw-arm.js`) reads only `NEMO_ARM` and the counts of the
`retention-control` and `retention-story` tags in the card file. It does not read
`find-keywords`' output. The DAG runs it only when `find-keywords` exits 0. So the
refusal changes the draw only through the words that now stop before it: 10 words (4-word
list) or 15 words (rule or 7-word list) of the 316, which can be carded in neither arm.
The card file has 0 rows with a retention tag today, so no count changes.

## 6. Not anticipated

**The item's goal cannot be met by a refusal alone.** For all 30 chunks, no picturable
rhyme exists in the dictionary at any frequency. So the refusal swaps a weak anchor for
none, and 10 to 15 words (3–5% of 316) stop that card today.

**A 4-word list gives a worse result than the problem it fixes.** It replaces des, ye,
yeah and huh with ke and ca on 10 chunks, which are no more picturable.

**Flash's own anchors for these words are a closed syllable or a rhyme over 2+
syllables.** 12 of the 30 words have a log row. Flash used app, rat, tab, trick, rev, stem,
digit and pub (a closed syllable, often with a rarer word or a near sound), and heavy, mustard,
battered, feathered (rhymes from the stressed vowel to the end). None used ye, yeah, des
or huh.

**The word rhyme of US-063 rescues most of the new stops.** A quick version of that rule
(the same sound from the stressed vowel to the end of the word, a different non-empty
onset, at or above 5e-7, not a function word, not an inflection of the headword) has a
candidate for 13 of the 16 words that would stop or lose their only rhyme:

| Word | Top candidates |
|---|---|
| scatter | matter, latter, chatter, batter |
| shattered | scattered, mattered, battered, flattered |
| flustered | mustard, clustered, mustered, custard |
| apparatus | status, lattice |
| dismissal | whistle, bristle, thistle |
| snubbing | rubbing, scrubbing |
| weathered | tethered, feathered |
| vapid | rapid |
| tavern | cavern |
| dozen | cousin |
| adherence | clearance |
| stamina | lamina |
| suspiciously | viciously |
| curriculum, prevalence, vigilance | none |

## Conclusion

| Question | Answer |
|---|---|
| 1. Chunks with des / yeah / ye / huh today | 37 chunks on 36 words: 30 rhymes (des 10, yeah 10, ye 7, huh 3) and 7 exact "des" on unstressed /dɪ/. 0 closed keywords. |
| 2. What they get with the 4 words refused | 0 picturable words. 20 get no anchor, 10 get ke or ca. Stops 7 → 17. |
| 3. Other unpicturable rhymes | ke, ca, sta: all 7 rhymes at or above 5e-7 for a lone short-vowel rime are unpicturable. A rule on the rime gives stops 7 → 22. Adding to `FUNCTION_WORDS` changes no closed keyword on the set. |
| 4. Outside the stressed chunk | Only exact "des" on /dɪ/: 7 chunks here, 2,306 dictionary entries. It forces "des" into the story. |
| 5. Arm draw | Unchanged, except that 10–15 more words stop before it. |

**Recommendation for the ACs.**

1. **Write the rule on the rime, not as a word list.** "A stressed chunk whose rime is a
   lone short vowel (/ɪ ɛ æ ʌ ʊ/) gets no rhyme." On the 316 set: 30 chunks lose their
   rhyme, 0 get a new one, and stops go from 7 to 22. A 4-word list would leave ke and ca on
   10 chunks. If Flash prefers a list, it must hold all 7 words (des, ye, yeah, huh, ke, ca,
   sta), not 4, and put them in the rhyme's own refusal. `FUNCTION_WORDS` also works, with no
   change to closed keywords on the set, but it does not reach exact keywords.
2. **Add "des" as an exact keyword to the scope, or say that it is out of scope.** It is
   the only wide case (7 of 316 words, every /dɪ/ chunk), and `check-story` makes the story
   use it. Refusing it adds 1 stop (dismissal).
3. **Decide the order with US-063 first.** The refusal alone makes 15 more words stop.
   US-063's word rhyme gives 13 of them a picturable anchor (scatter → matter, vapid →
   rapid, tavern → cavern, flustered → mustard). If US-063 is built first, or in the same
   change, US-060 costs about 3 stops (curriculum, prevalence, vigilance), not 15. An AC
   should name the stop count that Flash accepts.
4. **Leave other weak keywords out of US-060** (closed gen/dev/dis/elle, exact
   co/de/ka/eh), but record them as a gap: they are the same "can't carry a picture"
   problem in the closed and exact rules.

Scratch scripts (`lib.js`, `sets.js`, `collect.js`, `base.js`, `variant.js`, `pool.js`,
`open.js`, `whyclosed.js`, `tail.js`), the dictionary dump and the frequency file are in
this session's scratchpad. They are not kept in the repo.
