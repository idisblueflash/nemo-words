---
title: "US-050: do span, shift and contains anchors card more words, or better ones?"
status: findings-recorded
related_item: "[US-050](../backlog/items/US-050-a-stressed-short-vowel-chunk-takes-the-next-consonant.md)"
investigated: 2026-10-13
---

## Goal

Measure US-050 on real data before it is refined. US-050 wants the anchor search to try
three more anchor shapes when a word has no exact anchor and no rhyme anchor: a word that
spans a syllable boundary, a word on a shifted boundary, and a word that contains or
overlaps the chunk's sound. Its stated benefit is "words with no exact or rhyme anchor
still get a card".

This report builds on [investigation-006](investigation-006-us-049-proper-name-anchors.md).
It does not measure the baseline again, but it does reproduce it as a check.

## Method

- **Word sets.**
  - "316 set": the whole-word card rows plus the whole-word log rows that have a GA entry,
    with pipeline syllables (`ipa.js`, then `syllabify.js`). Today that is 315 well-formed
    rows plus `cloak`, a card row with no tab that investigation-006 counted. 726 chunks.
  - "log set": the 127 distinct whole words in `data/mnemonics/log.jsonl`, with the log's
    own `syllabification`. 286 chunks.
- **Real functions.** `exactMatches`, `pickKeyword`, `rhymeFor`, `rhymeCandidates`,
  `rimeOf`, `chunk`, `syllables`, `segments` and `ipaKey` ran over a fresh
  `nemo-words ipa-lookup --ga ""` dump (294,408 rows, the same as on 2026-10-12).
- **Frequencies.** `scripts/word-freq.js` for all 117,493 lowercase dictionary words that
  have a GA entry (294 requests; 15,271 words not found). The limit is the pipeline's 5e-7.
- **Baseline check.** The script gives the same 7 no-anchor words on the 316 set: breadth,
  bulge, durable, garage, realms, rigged, scarce. I ran the real
  `node scripts/find-keywords.js` on these 7 and on vapor, stampede and critique. All 10
  agree with the script. triage with its log syllables differs (see section 1).
- **Chunk status today, 316 set (726 chunks).**

  | Status today | Chunks |
  |---|---|
  | exact keyword, 3+ letters and not a function word | 162 |
  | exact keyword, 1–2 letters or a function word (k, de, li, an, to) | 145 |
  | rhyme on the stressed chunk | 164 |
  | stressed chunk with no anchor | 8 |
  | unstressed chunk with no anchor | 247 |

- **Same-root guard.** A candidate is dropped when it is an inflection of the headword
  (the same stem after `-s -es -ed -d -ing -er -ly` is removed). The pipeline has no such
  guard today. It does not catch derived words such as apprentice for apprenticeship.

### The rules I used for each shape

The item gives no rules, so these are mine. "Piece" means a run of adjacent sounds of the
headword. A candidate is a lowercase dictionary word whose GA IPA equals the piece
(`ipaKey` compare), is not the headword, and has a frequency of at least 5e-7.

| Shape | Rule |
|---|---|
| **Span** | The piece holds 2 or more vowels (nuclei). "Aligned": both ends are chunk boundaries (2+ whole chunks). "Ragged": one end is inside a chunk. "Whole": the whole word (a homophone). |
| **Shift, extend** | The piece holds one vowel, covers its whole chunk and takes one or more consonants from the next or the previous chunk (stæm + p → "stamp"). A consonant can be used by two pieces. |
| **Shift, mixed** | One vowel; the piece takes consonants on one side and gives up consonants on the other (pɹɛn + t − p → "rent"). |
| **Shift, trim** | One vowel; the piece is the chunk less its consonants at a boundary inside the word (ɹə → "a"). Word edges cannot move. |
| **Contains** | A word of 2+ syllables that has a syllable (by `syllabify.js`) equal to the chunk (tik → an.**tique**). |
| **Head overlap** | A one-syllable word with the chunk's onset and vowel, and a different ending (bʌldʒ → bus). "Strong": the first consonant after the vowel is also the same (bʌldʒ → **bʌl**b). |
| **Near-rhyme** | A one-syllable word with an onset, the same vowel, and an ending that differs from the chunk's ending by one consonant more or less (ʌldʒ → **ʌdʒ**, judge). Both endings have at least one consonant. |

Contains, head overlap and near-rhyme also leave out the `FUNCTION_WORDS` list, as the
US-046 rhyme does.

## 1. Coverage of the no-anchor words

**316 set, 7 words.**

| Shape | Words rescued | Anchors found (most frequent first) |
|---|---|---|
| Span | 1 of 7 | durable → dura /dʊɹə/ (7.8e-7). Not a usable word. |
| Shift | 1 of 7 | durable /ɹə/ → a (trim). On the stressed chunk: 0 of 7. |
| **Span + shift** | **1 of 7, 0 usable** | durable only, with "dura" or "a". |
| Contains | 2 of 7 | durable /dʊ/ → during; /bəl/ → possible, able, table. garage /ɑʒ/ → barrage, entourage, mirage. |
| Head overlap | 5 of 7 | breadth → breath, bread, breast. bulge → bus, bulk, bunch. realms → read, rest, red. rigged → risk, rich, ring. scarce → scared, sketch, scare. |
| Head overlap, strong | 3 of 7 | breadth → bread, bred. bulge → bulk, bulb. scarce → scared, scare, scares. |
| Near-rhyme | 5 of 7 | breadth → said, head, death. bulge → judge, dull, skull. realms → cells, tells, shells. rigged → good, big, mid. scarce → less, care, hair. |
| All shapes | 7 of 7 | |

**Log set, 6 words** (stools, triage, scarce, rigged, bulge, weathered).

| Shape | Words rescued | Anchors found |
|---|---|---|
| Span | 1 of 6 | weathered → whether /wɛðɚ/ (+ d). |
| Shift | 0 of 6 | |
| Contains | 2 of 6 | weathered /ɚd/ → required, desired, tired. triage /ɑʒ/ → garage, barrage, entourage. |
| Head overlap | 6 of 6 | stools → stew, stoop. triage → trees, treat. weathered → well, went. Others as above. |
| Head overlap, strong | 2 of 6 | scarce, bulge. |
| Near-rhyme | 4 of 6 | stools → use, news, choose. scarce, rigged, bulge as above. |
| All shapes | 6 of 6 | |

Two of the 6 are caused by the notation in the log, not by a missing shape:

- **triage.** The log writes `tri` with `r`. The real step searches
  `ipa-lookup --ga tri` as a substring, and the dictionary writes `ɹ`, so nothing matches.
  With `r` read as `ɹ`, the chunk is exactly "tree" (6.8e-5), which is the anchor Flash
  used. The pipeline's own IPA for triage (`ˈtɹaɪ.ɪdʒ`) is anchored today.
- **stools.** The log writes `ɫ`. The pipeline's own IPA (`ˈstulz`) gets a rhyme today.

**What Flash used for these words, and which rule holds it.**

| Word | Flash's anchor | Rule that holds it | Rank by frequency |
|---|---|---|---|
| bulge | bulb | head overlap, strong | 2 of 3 (after bulk) |
| bulge | judge | near-rhyme | 1 of 15 |
| breadth | bread | head overlap, strong | 1 of 3 |
| scarce | scares | head overlap, strong | 3 of 3 |
| rigged | wig | near-rhyme | 16 of 24 |
| durable | during | contains | 1 of 6 |
| durable | table | contains | 3 of 389 |
| garage | mirage | contains | 3 of 3 |
| realms | elms | none (a rhyme with no onset; elms is 4.6e-7, below the limit) | |
| weathered | feathered | none (a two-syllable rhyme, see section 6) | |

So the 7 words are rescued by the contains and overlap group. Span and shift rescue none
of them with a usable word.

## 2. What Flash's own anchors look like

I took each word in the `keyword` field of the 130 whole-word log rows (230 anchor words)
and compared its GA IPA with the headword. "Pipeline view" uses the pipeline's syllables
and strict IPA; 3 rows have no GA entry (hypernym, polysemy, strutted), so 127 rows. "Log
view" uses the row's own `syllabification` with loose IPA (`ər`/`ɝ` → `ɚ`, `ɫ` → `l`,
`ɒ` → `ɑ`); 130 rows, 237 anchor words.

| Class | Pipeline view: anchors (rows) | Log view: anchors (rows) | Examples |
|---|---|---|---|
| Exact chunk | 48 (37) | 62 (48) | attest → a + test; induce → inn + deuce; caveat → Kay + V + at; corncob → corn + cob; creak → creek |
| Rhyme, one syllable (US-046 shape) | 27 (27) | 34 (33) | stance → chance; latch → catch; pound → sound; toss → boss; odd → nod; crest → rest; stray → tray |
| Rhyme over 2+ syllables, or a longer word's tail | 17 (16) | 19 (18) | levee → heavy; coaster → toaster; flustered → mustard; shattered → battered; weathered → feathered; rattles → battles; pajamas → llamas; exotic → robotic |
| **Span** | **7 (7)**: 4 aligned, 3 ragged | 8 (8) | literature → litter; ventilator → later; devastating → stating; overreach → over; wary → airy; descendant → descend; ominous → Ommen |
| **Shift** | **24 (23)**: 20 extend, 1 mixed, 3 trim | 16 (15): 12, 1, 3 | stampede → stamp; vapor → vape; causality → cause; warrant → war; plumbing → plum; rattles → rat; ruffled → rough; scalpel → scalp; surgeon → surge; apprenticeship → rent |
| **Contains, chunk at the end of the anchor** | 13 | 15 | critique → antique; robe → wardrobe; obtained → abstained; corpus → campus; lump → slump; ridge → fridge; ladles → noodles |
| **Contains, chunk at the start of the anchor** | 32 | 32 | substance → submarine; agog → goggles; synonym → sinner + nimble; ventilator → Venice; merely → mirror; eligible → elephant; tacit → tab; negate → Nick |
| **Contains, chunk in the middle, or a longer shared run** | 14 | 10 | regional → legion; engine → pigeons; malignancy → pregnancy; rationing → caution |
| Contains, all three | 59 (49) | 57 (48) | |
| Head overlap (onset + vowel) | 6 (6) | 8 (8) | bulge → bulb; scarce → scares; dose → doe; faint → Faye |
| Other partial overlap | 8 (7) | 6 (6) | bulge → judge; rigged → wig; jerk → perky |
| Onset only | 20 (20) | 16 (16) | lass → Liv; trait → trip; flux → flew; crest → crew |
| No shared sound | 13 (13) | 10 (10) | regional → Al; warrant → ant (GA /ænt/ against /ənt/) |
| No GA entry for the anchor | 1 | 1 | satchel |

The 3 "trim" shifts are "a", "a" and "an".

**Card rows with a story but no log row.** There are 208 such whole-word rows: 158 have a
plain story, 42 have an old HTML back, and 8 are empty. 146 of the 158 have a GA entry.
They have no `keyword` field, so I classified every story word of 3+ letters. This is an
upper limit, because a word can match by chance and same-root words count (platelet →
plates, clog → clogs).

| Class | Story words | Rows |
|---|---|---|
| Exact chunk | 22 | 21 |
| Rhyme, one syllable | 39 | 37 |
| Rhyme over 2+ syllables | 20 | 20 |
| Span | 15 | 15 |
| Shift, extend | 19 | 18 |
| Contains (chunk of 2+ sounds, at the start or the end) | 64 | 52 |
| No word with a strong sound match | | 27 |

Examples: span — remission → mission, pursuing → suing, excelling → selling, donor →
owner. Shift — droplet → drop, penalty → pen, pathway → path, sparrow → spare, dormant →
dorm, cryptic → crypt, lymphoma → lymph + foam. Rhyme over 2+ syllables — tumor → rumor,
coda → soda, sickle → pickle, swollen → stolen, garage → mirage.

### The item's four examples

| Example | The log row | The pipeline today (real `find-keywords`) | With the new shapes |
|---|---|---|---|
| vapor → vape / per | `anchor_unit: whole-word`, keyword "vape per", `ˈveɪ.pər` | `veɪ` → rhyme "way"; `pɚ` → none. Carded. | **Nothing.** "vape" is 4.7e-8, far below the limit. "per" is /pɝ/ in CMU, not /pɚ/, and it is a function word. |
| stampede → stamp / peed | `first-syllable`, keyword "stamp, peed" | `stæm` → none; `pid` → rhyme "need". Carded. | Shift finds "stamp" (the only candidate). "peed" is an exact match for `pid` already, but it is 3.4e-7, below the limit. |
| bulge → bulb / judge | `stressed-syllable`, keyword "bulb / judge" | Stops: no sound anchor found. | Not a span and not a shift. "bulb" is a head overlap (2nd of 3). "judge" is the top near-rhyme. |
| critique → antique | `stressed-syllable`, keyword "Chris / antique" | `kɹə` → none; `tik` → rhyme "speak". Carded. | Contains finds "antique" (1st of 2, with boutique). "Chris" is not found: the pipeline's chunk is `kɹə`, and Chris is /kɹɪs/. |

Three of the four already get a card today. Only bulge stops, and bulge needs neither a
span nor a shift.

## 3. Quality: what the pipeline gives today where Flash used these shapes

| Flash's anchors | Count | Pipeline today on that chunk | The rule holds Flash's word | It is the most frequent candidate |
|---|---|---|---|---|
| Shift | 24 | rhyme 13 (ye, yeah, des, huh, saw, men, cal, way); no anchor 8; exact 3 (cock, sir, ka) | 22 (not vape 4.7e-8, not Dell 4.5e-7) | 20 |
| Span | 7 | some chunk of the span has no anchor in 5; a rhyme in 2 | 6 (Ommen is not a word) | 6 |
| Contains | 59 | no anchor 19; rhyme 17; 1–2 letter keyword 16; other exact 7 | 23 | 5 |
| Head overlap | 6 | | 3 | 0 |

**Chunks that would change on the 316 set.** A chunk counts when the shape has a common
candidate of 3+ letters that is not a function word ("picturable"). The numbers in
brackets allow any common word.

| Shape preferred over … | (a) no anchor on an unstressed chunk (247) | (b) a rhyme on the stressed chunk (164) | (c) a 1–2 letter or function-word exact keyword (145) | (a)+(b)+(c) |
|---|---|---|---|---|
| Shift, extend or mixed | 17 [25] | 46 [50] | 31 [36] | 94 chunks, 86 words |
| Shift, trim | 13 [119] | 14 [25] | 9 [63] | 36 chunks, 35 words |
| Span, any | 67 [75] | 39 [39] | 27 [36] | 133 chunks, 76 words |
| Span, aligned or whole only | 23 [25] | 13 [13] | 12 [16] | 48 chunks, 28 words |
| Shift (extend or mixed) or span | 80 [92] | 59 [63] | 50 [62] | 189 chunks, 120 words |

So the rule matters far beyond the 7 words: a shift or span anchor exists for 120 of the
316 words on a chunk that is weak today.

Examples of (b), a rhyme replaced by a shift: penalty `pɛ` "ye" → pen; rattles `ɹæ`
"yeah" → rat; plumbing `plʌ` "huh" → plum; sickle `sɪ` "des" → sick; droplet `dɹɑ` "law" →
drop; pathway `pæ` "yeah" → path; warrant `wɔ` "saw" → war; scalpel `skæl` "cal" → scalp.

Examples of (a), an unstressed chunk gains a shift: stampede `stæm` → stamp; causality
`kɔ` → cause; regulation `ɹɛ` → reg; restraint `ɹɪ` → wrist; translucent `tɹæn` → trance.

Examples of (c): caveat `keɪ` "k" → cave; cottage `kɑ` "ka" → caught; formation `fɔɹ`
"for" → form; optimal `ɑp` "op" → opt; tumor `tu` "to" → tomb.

Not every change is better. The (c) list also has adjacent `dʒeɪ` "j" → ace,
component `poʊ` "po" → own, and undeniable `ʌn` "un" → und.

## 4. Candidate noise

Counts are over the 726 chunks of the 316 set. "Short" means the most frequent candidate
has 1–2 letters or is a function word.

| Shape | Chunks with a candidate | Candidates per chunk: median, 90th percentile | Top candidate is short | Verdict |
|---|---|---|---|---|
| Shift, extend | 126 | 1, 2 | 18 of 126 | Clean. |
| Shift, mixed | 46 | 1, 4 | 23 of 46 | Half is junk (l, n, an, ish). |
| Shift, trim | 289 | 2, 4 | 228 of 289 | Junk (a, e, to, uh). |
| Span, aligned | 68 | 1, 1 | 8 of 68 | Clean, but often the headword's own root. |
| Span, ragged | 132 | 1, 2 | 13 of 132 | Mixed: real words beside odd ones. |
| Contains | 653 | 111, 664 (most: 1,386) | 0 | Too many to pick by frequency. |
| Head overlap | 427 | 16, 29 | 16 of 427 | Too loose. |
| Head overlap, strong | 100 | 2, 9 | 0 | Mostly the headword's own family. |
| Near-rhyme | 246 | 33, 55 | 0 | Too loose. |

Ten random chunks per shape (fixed seed). `*` marks the stressed chunk, `~` a rhyme, `∅`
no anchor. The top candidates follow the arrow.

**Shift, extend**
- plumbing `plʌ`* (~huh) → plum
- penalty `pɛ`* (~ye) → pen
- indispensable `dɪ` (des) → dis, diss
- embellishment `bɛ`* (~ye) → bell, belle
- coordinate `ɔɹ`* (or) → ord
- causality `kɔ` (∅) → cause
- sparrow `spɛ`* (~ye) → spare
- theoretical `ɛ`* (eh) → et
- undeniable `dɪ` (des) → din
- polymerize `lɪ` (∅) → limb, lim

**Shift, mixed**
- adjudicated `keɪ` (k) → eight, ate
- excelling `sɛ`* (~ye) → l, el, elle
- emboldened `boʊl`* (bowl) → old
- ominous `mə` (∅) → an
- translucent `slu`* (slew) → loose
- congenital `dʒɛ`* (~ye) → n, en
- elastic `læ`* (~yeah) → asked, ass
- remission `mɪ`* (~des) → ish
- evaporate `væ`* (~yeah) → app
- disciplinary `plə` (∅) → an

**Shift, trim**
- indispensable `sə` (∅) → a
- conducting `dʌk`* (duck) → uh
- adjudicated `keɪ` (k) → a, ay, ae
- episode `soʊd` (sewed) → owed, ode
- timber `tɪm`* (~dim) → to
- disciplinary `ɹi` (re) → e, ee
- ventilator `tə` (to) → a
- levee `vi` (v) → e, ee
- bibliography `bli` (∅) → e, li, ee
- ultimately `mət` (∅) → a

**Span, aligned**
- journeyman `ni` (knee) → journey
- pursuing `ɪŋ` (ing) → suing
- remediation `ʃən` (∅) → mediation
- infusion `ʒən` (∅) → fusion
- theoretical `tɪ` (to) → tickle
- ventilator `leɪ` (lay) → later
- overreach `vɚ` (∅) → over
- literal `tɚ` (∅) → litter
- recurrent `ɹɪ` (∅) → recur
- excelling `sɛ`* (~ye) → selling

**Span, ragged**
- period `ɹi` (re) → eerie, ia
- descendant `dɪ` (des) → descend
- trial `əl` (∅) → aisle
- period `pɪ`* (~des) → eerie
- apparently `ɹənt` (∅) → era, para, errant
- fidelity `dɛ`* (~ye) → ella
- shuttered `ʃʌ`* (~huh) → utter, uttered
- polymerize `mɚ` (∅) → arise, awry
- regional `dʒə` (∅) → region
- plasma `mə` (∅) → asthma

**Contains**
- adjudicated `tɪd` (∅) → wanted, started, related [671 candidates]
- synonym `nɪm` (∅) → unemployment, unimportant, acronym [6]
- prevalence `pɹɛ`* (~ye) → present, presence, pressure [95]
- occupy `kjə` (∅) → particular, particularly, document [99]
- adverse `vɝs`* (verse) → diverse, universe, reverse [9]
- plasma `mə` (∅) → family, similar, material [536]
- discrete `dɪ` (des) → different, development, conditions [1,039]
- stampede `pid`* (~need) → copied, impede [2]
- liability `bɪ`* (~des) → between, before, because [237]
- rationing `ɹæ`* (~yeah) → rather, rapidly, rapid [64]

**Head overlap**
- causality `zɑ`* (~law) → tsar
- unwinding `dɪŋ` (ding) → dear, des, dish
- apprenticeship `pɹɛn`* (~men) → press, pressed, prayer
- aloe `loʊ` (low) → load, loan, loans
- faintly `li` (li) → least, leave, lead
- theoretical `tɪ` (to) → tears, tip, tear
- conducting `dʌk`* (duck) → dust, dull, dug
- toss `tɔs`* (~loss) → top, talk, taught
- plateau `plæ` (∅) → plan, plant, plans
- adherence `hɪ`* (~des) → hit, hill, hips

**Head overlap, strong**
- overgrown `ɡɹoʊn`* (grown) → groaned, groans
- faintly `feɪnt`* (faint) → feigned, fain, feign
- gnarly `nɑɹ`* (~far) → gnarled
- cohort `hɔɹt` (∅) → horse, horn, horns
- stampede `stæm` (∅) → stamp, stamps
- breached `bɹitʃt`* (~reached) → breech
- negate `ɡeɪt`* (gate) → gates
- essential `sɛn`* (sen) → sense, sent, send
- flinching `tʃɪŋ` (∅) → chink
- wore `wɔɹ`* (war) → warm, worn, warned

**Near-rhyme**
- inducing `ɪn` (in) → wind, print, grinned
- slates `sleɪts`* (~states) → place, face, case
- adjoining `nɪŋ` (∅) → think, things, drink
- caveat `æt` (at) → last, fact, past
- drown `dɹaʊn`* (~down) → found, ground, sound
- bulge `bʌldʒ`* (∅) → judge, dull, skull
- lass `læs`* (last) → last, past, passed
- exotic `ɪɡ` (∅) → pigs, twigs, figs
- transplants `tɹæn` (∅) → hand, hands, land
- quebec `bɛk`* (~neck) → next, sex, desk

**Shapes that mostly return junk:** shift-trim, half of shift-mixed, head overlap and
near-rhyme by frequency. Contains is not junk, but "the most frequent" cannot choose
among a median of 111 candidates: Flash's own word was the most frequent in 5 of the 23
cases where the rule held it.

**Same-family candidates.** In 27 of the 133 span chunks (17 words) and 17 of the 94 shift
chunks, every candidate shares its first 4 letters with the headword: apprentice for
apprenticeship, discipline for disciplinary, inhibit for inhibitor, dismiss for
dismissal, region for regional. `check-story`'s headword gate only stops inflections of
the headword, so these pass today.

## 5. Downstream fit

**`anchor_unit` values.** `.claude/agents/_logan/reference-tables.md` (read by
`scripts/lib/logan-vocab.js`) has `whole-word`, `stressed-syllable`, `rime`, `onset`,
`nucleus`, `coda`, `first-syllable`, `word-shape` and `morpheme`. None of them names a
span, a shift or a contains anchor. Flash's own rows for the four examples use
`whole-word` (vapor), `first-syllable` (stampede) and `stressed-syllable` (bulge,
critique). So the existing values say where the anchor sits, not how it matches, and no
new value is strictly needed. `log-card.js` `validateRow` rejects any value that is not in
the table.

**What each step needs for a new shape.**

| File | Place | What it does now | What a new shape needs |
|---|---|---|---|
| `scripts/find-keywords.js` | `findKeywords`, `formatKeywordLine` (line 93) | One line per chunk: `ipa\tkeyword\tfreq`, plus a 4th column `rime` | A 4th-column value per shape, and the piece's own IPA, because a shift or span keyword does not equal the chunk IPA. A span keyword covers 2+ chunks; one line per chunk cannot say that. |
| `scripts/compose-stories.js` | `readChunkKeywords` (lines 18–28) | Reads only `rime` from the 4th column | Read the new values. |
| | `anchorText` (30–33), `composePrompt` (36) | Prints `/ipa/ -> "word"` or `"word" (rhymes)` for each chunk | A wording for "covers this chunk and the next" and for "starts with this sound". |
| `scripts/check-story.js` | `anchorReasons` (lines 92–113) | Exact: `ipaKey(ga) === ipaKey(c.ipa)`. Rhyme: `rimeOf` equal. One keyword per chunk, in order. | One compare for each shape: shift and span against the piece IPA; contains against the keyword's syllables. A span keyword on two chunks must count once in the order check. |
| `scripts/log-card.js` | `anchorUnit` (lines 59–66) | Knows `rime`; otherwise `whole-word`, `stressed-syllable` or the first anchored chunk's unit | Choose a value for each shape (an existing one is enough). |
| | `buildRow` (line 85) | `keyword` = the chunk keywords joined by ` / ` | A span keyword on two chunks would be written twice. |
| `scripts/judge-stories.js` | line 162 | Sends Jev `{ipa, keyword}` for each chunk, with no match type (not for a rhyme either) | The match type, or the piece IPA. |
| `scripts/story-rubric.json` | `axes.anchor` (lines 29–35) | Top score only when "the sound anchor matches its IPA chunk exactly" | A shift anchor matches a different piece exactly, and would lose a point against a rhyme unless the chunk IPA sent to Jev is the piece. |
| `scripts/tag-technique.js` | line 52 | The same `{ipa, keyword}` | The same as above. |

A shift that takes one consonant is the cheapest shape: if `find-keywords` prints the
piece as the chunk IPA (`stæmp` in place of `stæm`), every later step works with no
change.

## 6. Not anticipated

**The premise is wrong in the same way as US-049's.** Span and shift rescue 1 of the 7
words and 0 of the 6, and the one word (durable) gets "dura" or "a". The words that stop
today need the contains and overlap group, which is the noisy group.

**Most of "shift" is the syllabifier.** `syllabify.js` gives every consonant between two
vowels to the later syllable. So a stressed short vowel ends its chunk: `ˈpɛ.nəl.ti`,
`ˈɹæ.təlz`, `ˈplʌ.mɪŋ`.

- 71 of the 316 stressed chunks end in a short vowel (/ɪ ɛ æ ʌ ʊ/). Almost no English word
  ends that way, so the exact rule finds almost nothing: 62 of the 71 get a rhyme, 2 get
  no anchor, and 7 get an exact keyword (eh ×5, to, des).
- Those rhymes are the same four words: des ×19, yeah ×18, ye ×18, huh ×7. That is 62 of
  all 164 rhyme anchors in the set.
- When the chunk takes the next consonant, 37 of the 71 get an exact word of 3+ letters
  (pen, rat, plum, sick, drop, path, spare, bell, test).
- Flash's own syllables already do this. Of the 90 log words with 2+ syllables, 55 have
  the pipeline's boundaries, and in 27 Flash closed the stressed syllable where the
  pipeline leaves it open (`ˈlɛv.i`, `ˈsɪm.ɚz`, `ˈplʌm.ɪŋ`, `ˈɹæʃ.ə.nɪŋ`). That is why
  Flash's anchors count as 24 shifts with pipeline syllables and 16 with his own.

So the valuable part of US-050 is not a new anchor shape for 7 words. It is "a stressed
short vowel takes the next consonant", for about 37 words that get "ye" or "yeah" today.

**The rhyme rule picks unpicturable words.** des, yeah, ye and huh are not in
`FUNCTION_WORDS`. This is separate from US-050, and it is the reason the shift looks so
good next to the rhyme.

**Flash's largest group is not in the item.** The item's "contains" example is a word that
ends with the chunk (antique). Flash more often used a longer word that *starts* with the
chunk: 32 anchors against 13 (submarine, goggles, Venice, mirror, elephant, sinner). He
also used a rhyme over 2+ syllables 17 times (levee → heavy, coaster → toaster). I tried
one rule for that: a common word with the same sound from the stressed vowel to the end
of the word. It has a candidate for 227 of the 316 words (111 of the 196 words where that
tail has 2+ syllables; median 4 candidates). It rescues 3 of the 7 (bulge → indulge,
divulge; durable → incurable; garage → massage, barrage) and holds 13 of Flash's 30
anchors of the "rhyme over 2+ syllables" and "chunk at the end" classes.

**The frequency limit hides two of the item's own anchors.** vape (4.7e-8) and peed
(3.4e-7) are below 5e-7. The Ngram years are 2015–2019.

**Two log words stop only because of their notation** (triage `r`, stools `ɫ`). That is a
case for the US-041 log check, not for US-050.

## Conclusion

| Shape | Rescued of the 7 | Rescued of the 6 | Flash used it (anchors, of 230) | Chunks changed (picturable) | Noise |
|---|---|---|---|---|---|
| Span | 1 (dura) | 1 (whether) | 7 | 133 (48 aligned) | Low for aligned; same-family words |
| Shift | 1 ("a"), 0 on the stressed chunk | 0 | 24 | 94 (extend or mixed) | Low for extend; trim is junk |
| Contains / overlap | 7 | 6 | 59 contains + 14 overlap | not counted: nearly every chunk has candidates | High: median 111 candidates |

- **The item's benefit does not hold.** As written ("only when no exact or rhyme anchor
  exists, so that those words get a card"), span and shift card 0 more words with a usable
  anchor. Contains and overlap can card all 7, but frequency cannot choose their anchor.
- **Recommendation: do not refine US-050 as written. Split it.**
  1. **Build the shift, as a change to the chunks, for quality.** A stressed chunk that
     ends in a short vowel takes the next consonant, then the exact rule runs as today.
     That replaces "ye / yeah / des / huh" with a real word for about 37 of 316 words, it
     matches how Flash splits syllables, and no later step changes. It should run before
     the rhyme, not after it. Wider shifts (two consonants, unstressed chunks) add 17
     unstressed chunks and can come later.
  2. **Span is a smaller, separate story.** It fits 7 of Flash's 230 anchors. It needs a
     new line format in `find-keywords`, changes in four later steps, and a guard against
     same-family words. Aligned spans only (48 chunks, 28 words) would be the place to
     start.
  3. **Drop contains / overlap as a frequency rule.** It is the only shape that rescues
     the 7 words, and it is Flash's most-used shape, but it gives a median of 111
     candidates. If the 7 words matter, give the story drafter a short list and let it
     choose, or use the narrower whole-word rhyme of section 6. Either is a new item.
- **Separately:** add des, ye, yeah and huh to the words the rhyme rule refuses, or 62
  stressed chunks keep them until the shift is built.

Scratch scripts (`lib.js`, `analyze.js`, `q2.js`, `q2b.js`, `q3a.js`, `q3b.js`, `q4.js`,
`q6.js`, `q7.js`) and the frequency dump are in this session's scratchpad. They are not
kept in the repo.
