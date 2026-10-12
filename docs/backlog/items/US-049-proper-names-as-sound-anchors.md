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
