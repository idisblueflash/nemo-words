---
id: US-049
type: story
parent: E01
status: idea
---
# US-049 Proper names as sound anchors

As Flash, I want a chunk with no common exact-sound word to be anchored by a familiar proper name (stew→Stu, critique→Chris, simmers→Sim), so that more words get a card instead of stopping at "no sound anchor found".

**Scope (split from US-046, 2026-10-12):** one of the three anchor types in Flash's own cards for no-anchor words; US-046 does the rhyme.

## Investigation findings (_david, 2026-10-12)

Full report: [investigation-006](../../investigations/investigation-006-us-049-proper-name-anchors.md).

- **Few words still need an anchor.** After exact + US-046 rhyme, 1 of the 40-sample words still stops at `no sound anchor found` (bulge; pipeline syllables). Across all 316 whole-word rows that have a GA entry, 7 still stop (2.2%): breadth, bulge, durable, garage, realms, rigged, scarce. Exact matching alone stopped 19/39 and 122/316.
- **Names card almost nothing new.** An exact name on the stressed chunk, after exact + rhyme fail, cards **0** extra words. A rhyming name cards 1 (garage → Raj). An exact name on any chunk adds 5 unstressed chunks and 0 words, and they are poor names: Ning ×3, Tran ×2.
- **The story's examples don't come from this rule.**
  - stew already gets the rhyme "two".
  - Chris is longer than the chunk `kɹɪ`, and the pipeline makes the chunk `kɹə` anyway.
  - simmers is `ˈsɪ.mɚz` in the pipeline, and with log syllables the exact rule already picks "sim".
  - Al doesn't match `nəl`.
- **Flash picks names for quality, not to fill gaps.** Where an exact familiar name existed for one of Flash's chunks (16 chunks), Flash used the name 7 times. Each time, the pipeline had a letter, a function word or a rhyme instead: stew→two, Kay→k, Ann→an, Lee→li.
- **There is no usable name source.** The repo has no names list. `/usr/share/dict/propernames` lacks 9 of the 21 names Flash used, and contains The, No, Sir, Lord, King and Revised. `word-freq.js` lowercases every word, so it can't score a name. Capitalized Ngram frequency doesn't tell familiar names from unfamiliar ones: Stu (6.3e-7) sits beside Srinivasan and Knudsen.
- **The premise is refuted.** The more useful rule is "a familiar name instead of a letter, a function word or a fragment, or before a rhyme on the stressed chunk". On the 316 words it changes about 16 chunks and cards 0 new words. It needs a curated given-name list first, for example the SSA baby names (not measured: not offline). Separately, 88 of the 307 exact keywords are letters or function words. That is the larger problem, for US-045 or a new item.

## Investigation findings

_david, 2026-10-12. Throwaway scripts only; every number below comes from a run on real data.
US-041's 40-word sample was never saved, so the sample is the **127 distinct whole words in
`data/mnemonics/log.jsonl`** (affix rows such as `-esis` left out; chunks taken from each row's
`syllabification`; 286 chunks). The run used the real `exactMatches`, `pickKeyword` and
`rhymeCandidates`, live `nemo-words ipa-lookup`, and `word-freq.js`.

**1. Name source.** `cmudict.dict` (and so `ipa-lookup`) holds given names as lowercase rows,
with nothing that marks them as names: `stu S T UW1`, `sim S IH1 M`, `chris K R IH1 S`. An empty
RP column is not a name marker either (`kay`, `ann`, `lee` have RP; `stu`, `sim`, `dee` don't).
None of the local sources is a clean list of given names:
- macOS `/usr/share/dict/propernames` has 1,306 given names, and 1,058 of them are in CMU. It is
  outside the repo and macOS only. It has some non-names (`Plastic`, `Diet`, `Tuna`, `Sir`).
  It has 16 of the 25 distinct names Flash used. It misses Sim, Dell, Reg, Dee, Dev, Faye, Liv
  and Nia. Of Flash's 9 exact-match names, it has only 4 (Stu, Kay, Ann, Lee).
- `wikipron_us_broad.tsv` has 14,282 capitalized single words. They are a mix of names,
  surnames, places and demonyms (`Lesotho`, `Hasidism`, `Venn`). They include 8 of Flash's 9
  exact names (all except Dev).
- There is no `kaikki-en.jsonl` in `resources/data/` and none on the machine.

**2. Frequency.** `scripts/word-freq.js` lowercases every query (line 108), so it gives
`stu` 2.1e-7, not `Stu`. A copy that keeps the case gives Stu 6.3e-7, Chris 1.8e-5, Sim 1.1e-6
and Nia 4.9e-7. Capitalized frequency is a weak test of familiarity. At the keyword limit of
5e-7, 923 of the 1,305 propernames pass. Stu (6.3e-7) only just passes, next to Srinivasan,
Knudsen, Piotr, Spock and Malloy. Nia (4.9e-7) fails, next to Steen and Takeuchi. At 1e-6, 812
pass and Stu is lost. Borderline names in the range 5e-7 to 1e-6 include Stu, Huey, Moe, Syd,
Tad, Thad, Kiki, Uri and Noam. No single limit keeps Stu and Sim while it drops Ning (2.2e-6)
or Venn (8.1e-7).

**3. Flash's real usage.** 30 of the 160 log rows use a proper name (31 uses). They split
into four groups:
- **Exact** (13 rows): the name's GA IPA equals a chunk.
  - stew ×2 `stu` → Stu
  - simmers `sɪm` → Sim
  - caveat `keɪ` → Kay
  - an- and ancestor `æn` → Ann
  - fidelity `dɛl` → Dell
  - regulation `ɹɛɡ` → Reg
  - defect and devious `di` → Dee
  - merely and ultimately `li` → Lee
  - devastating `dɛv` → Dev
- **Near or prefix** (6):
  - critique `kɹɪ` → Chris /kɹɪs/
  - negate `nɪ` → Nick
  - evicted `vɪkt` → Victor
  - faint `feɪnt` → Faye
  - era `ɛɹ` → Aaron
  - ominous `ɑm` → Ommen
- **No match** (4): regional → Al, polysemy → Melissa, -penia → Nia (not in CMU), ominous → Venus.
- **Onset only**, a character name next to the real anchor (8): Drew, Liv, Paula, Carl, Pam,
  Tom, Lance and Sam.

The 209 card rows that have no log row add 4 more exact names: compete → Pete, innate → Nate,
timber → Tim, apparently → Lee.

**4. Gain after US-046.**
- 41 of the 127 words have no exact keyword on any chunk (32%, against the story's 16 of 40).
- After US-046's rhyme, 6 words still have no anchor: stools, triage, scarce, rigged, bulge
  and weathered. stools and rigged may be artifacts of their logged IPA (`ɫ`, `ɡd`).
- A name fills a chunk in **0 of these 6** words, with propernames or with the wider wikipron list.
- Of the 55 stressed chunks that now get a rhyme, an exact propernames name at 5e-7 or above
  exists for only 1: stew `stu` → Stu, where the current rhyme is `two`. The wider list adds
  Venn for ventilator and intervention `vɛn`.

**Not anticipated — the name gap is not where the story says.** 11 of the 13 exact log rows
(all except stew ×2) already get an exact keyword today. That keyword is a letter, a short
form or a particle, not a picturable word:
- caveat `keɪ` → `k`
- defect and devious `di` → `de`
- fidelity `dɛl` → `del`
- merely and ultimately `li` → `li`
- ancestor `æn` → `an`
- simmers → `sim`, devastating → `dev`, regulation → `reg`

In the sample, 70 of the 137 chunks that have an exact keyword get one that is 2 letters or
fewer, or not a lowercase word in `web2`: `a`, `t`, `e`, `v`, `n`, `de`, `re`, `des`, `ka`,
`lb`, `ul`. So "only when no exact word exists" leaves out nearly all of Flash's name use.
A name only helps if it can beat a junk exact keyword, and that needs a test for which
keywords can be pictured. The test is a separate question from names (it may belong to US-045).

**5. Which chunks.**
- Stressed chunk only (like the rhyme): 1 chunk filled (stew), 0 words rescued.
- Any chunk: 3 chunks filled (adds coordinate `neɪt` → Nate and rationing `nɪŋ` → Ning),
  0 words rescued.
- Lowering the limit to 1e-7 changes nothing. Raising it to 2e-6 drops Stu.

**6. Risks.**
- Names that are also common words never reach a name rule, because the lowercase word passes
  first: bill 2.2e-5, mark 3.2e-5, art 9.7e-5, jack 2.1e-6, sue 3.2e-6. The reverse also
  happens: some names pass as "common" keywords through their lowercase frequency (kay 1.3e-6,
  lee 1.3e-6) and so are carded without being marked as names.
- The name test gives false positives: `sir` for surgeon `sɝ` (Sir is in propernames),
  `Ti`, `Hy`, `Venn`, `Dis`.
- CMU's IPA is wrong for some names. Reg is `ɹɛɡ` in CMU, but the name is `ɹɛdʒ` in wikipron
  and BEEP. CMU also has Brodie `bɹoʊti` and Connie/Monty/Oscar with `ɔ` where wikipron has
  `ɑ`. With a crude normalization, CMU and wikipron agree on 583 of the 655 propernames that
  both contain; most of the rest are notation differences.

**Bearing on the story.** Its premise ("more words get a card instead of stopping at no sound
anchor found") is refuted on this sample: 0 of 127 words are rescued. The only name-beats-rhyme
case is stew → Stu.
