---
id: US-065
type: story
parent: E01
status: idea
concepts: [C-002, C-003, C-005, C-011, C-012, C-031, C-038]
---
# US-065 Jev knows when a keyword is a rhyme

As Flash, I want Jev to know when a story's keyword is a rhyme anchor or a word rhyme, so that a story built on a rhyme gets a fair anchor score, and the auto-pick does not prefer or drop it for the wrong reason.

**Found (2026-10-16, after US-063):** the real Jev payload for durable's picked story ("An incurable tinkerer built iron boots lasting fifty years.") gave `ipa_chunks` as `dʊ` → `incurable`, `ɹə` → `null`, `bəl` → `null`. Nothing in it says that "incurable" is a word rhyme on the WordTail /ʊɹəbəl/, or that the two `null` chunks are covered by it. The story rubric's anchor axis asks whether "the sound anchor matches its IPA chunk exactly", so Jev scored a rhyme against a whole-chunk match (anchor 2.15). US-063 taught `compose-stories`, `check-story` and `log-card` the `word-rime` tag, but not `judge-stories`. A one-chunk rhyme (US-046, tag `rime`) probably has the same gap.

## Investigation findings (_david, 2026-10-16)

All numbers below come from runs made this session. Scripts and raw output are in the session scratchpad (`us065/`), not in the repo. No `card.js`, no live Anki, no write to the real mnemonic log. **Jev calls: 312** (every one answered; no retries).

**Method.** For 14 words from the card file (5 exact, 6 one-chunk rhyme `rime`, 3 word rhyme `word-rime`), the real step CLIs made the inputs: `ipa` → `syllabify` → `find-keywords` → `define` → `compose-stories` (real `claude`) → `check-stories`. 68 candidates passed the hard gates. Then each candidate went to the real Jev with judge-stories' own `buildQuestions` / `toJudgment`, in these variants:
- `base`: today's state and rubric, run twice (r1, r2) to measure noise.
- `mark`: the state marks each chunk's kind: `match` exact / rhyme / word rhyme, `rhymes_with` (the rime or the WordTail), a one-line note, and `covered_by` on the chunks a word rhyme covers. The rubric does not change.
- `levels`: today's state, with the anchor levels reworded to "matches the sound it targets": the chunk for an exact anchor, the marked rhyme for a rhyme. Run on 8 words only.
- `both`: `mark` and `levels` together.

**1. Is the anchor score unfair for rhymes? Yes.** Mean anchor score (1–3) under `base`: exact **2.21** (24 candidates), rime **1.76** (29), word-rime **1.87–1.90** (15). Run-to-run noise is small: mean |Δanchor| between r1 and r2 is 0.06 (max 0.24). So the gap of 0.35–0.45 is real. Examples (base): cracks → `tax` 1.32–1.52, stiff → `cliff` 1.50–1.67, garage → `massage` 1.63–1.86, against lass → `last` 2.18–2.47 and sickle → `sick` 2.40–2.54. The item's guess holds: a `rime` keyword has the same gap as a `word-rime`, and it is a little worse.

**A shape the item did not name:** exact words with unanchored chunks are also scored low. cohort (`co` + /hɔɹt/ unanchored) gets 1.75–1.97, about as low as a rhyme. 124 of the 177 exact words in the sample (below) have at least one chunk with no anchor, and today's state shows those chunks only as `keyword: null`.

**2. Do the variants move the scores? Yes. Do they change the pick? Not more than noise.**

| variant | exact | rime | word-rime | candidates |
|---|---|---|---|---|
| base r1 | 2.21 | 1.76 | 1.87 | 68 |
| base r2 | 2.21 | 1.76 | 1.90 | 68 |
| mark | 2.68 | 2.28 | 2.16 | 68 |
| levels (8 words) | 2.10 | 2.53 | 2.36 | 40 |
| both | 2.60 | 2.86 | 2.75 | 68 |

- `mark` raises every kind by about 0.3–0.5. Exact words also go up (severe 2.0 → 2.8, cohort 1.9 → 2.4). So the extra state helps Jev in general, not only for rhymes. Rhymes stay below exact.
- `levels` alone raises rhymes, and lowers exact words a little (2.21 → 2.10).
- `both` turns the order around: rhymes 2.75–2.86, exact 2.60. The rhymes are near the top of the scale (bulge 2.91–2.93, drain 2.89–2.94), so the axis almost stops showing a difference between them. A refine choice: should a perfect rhyme score higher than an exact keyword with an unanchored chunk (cohort 2.2–2.45 under `both`)?
- The meaning and vivid axes hardly move (meaning 2.08–2.26, vivid 2.46–2.53 across all variants). The judgment gates fail on 15–17 of 68 candidates in every variant.
- **Pick:** the picked candidate is different from base r1 for 3/14 words in base r2 (pure noise), 2/14 in `mark`, 3/14 in `both`, and 3/8 in `levels`. No variant changes the pick more than a second base run does. This is because all 5 candidates of a word share the same keywords (`compose-stories` gets one keyword per chunk). A fix to the anchor axis moves every candidate of a word by about the same amount. The mean range of anchor scores inside one word is only 0.10–0.20.
- **Challenge to the user story's "so that":** today a rhyme does not make the auto-pick "prefer or drop" a story among one word's candidates. The fix changes the absolute scores: the `pick: total N (anchor a, …)` report line, and any comparison across words. It would change the pick only if candidates of one word had different keywords (e.g. garage `massage` vs `barrage`, US-063's open note, US-045). An AC that says "the pick changes" cannot be met on today's data. An AC on the anchor score (for example, a rhyme story's mean anchor is no longer 0.4 below an exact one's) can be measured.

**3. How often does this matter?** `find-keywords` over the 333 plain whole-word rows of `anki/reading-room-terms.txt` (332 finished): 18 have no GA IPA, 4 stop with no anchor (breadth, realms, rigged, scarce). Of the 314 that have an anchor: exact **177 (56.4%)**, rime **130 (41.4%)**, word-rime **3 (1.0%**: bulge, durable, garage). 30 of the 130 rime keywords are ye / yeah / des / huh (US-060). When US-060 removes them, some of those words will get a word rhyme. So the share of word rhymes will grow, but not the total share of rhymes. Rhymes (41–42%) are now a large class, not an edge case.

Seen while sampling: lobe /loʊb/ → `job` as a rime. This keyword is correct only for the name Job /dʒoʊb/, not for the common word job /dʒɑb/. A rhyme test that accepts any GA form can use a proper-name form (compare bug-014 and US-049). This is not in this item's scope.

**4. The sense (line 1 of `define`).** `parseDefinition` forces line 1 to be one word (`/^[a-z'-]+$/`, otherwise an error), so it is always one word. All 8 real Dagu runs and all 18 `define` runs here had a one-word line 1 (durable → `lasting`, rigged → `fixed`, scarce → `rare`, garage → `building`). Line 2 is a full definition sentence, but Jev never sees it. Some one-word senses are ambiguous (`fixed` = repaired or rigged) or loose (`building` for garage). For those words, the meaning axis checks the story against the wrong idea. This needs its own item, as the open question says.

## Open questions
- [ ] Does a one-chunk rhyme (`rime`) get the same unfair anchor score as a word rhyme? Measure it on real runs before refine.
- [ ] Does the fix belong in the state (mark each keyword's kind and the chunks it covers), in the anchor axis's levels, or in both?
- [ ] Out of scope here, but related: the DAG passes only line 1 of `define`'s output as the sense (`dags/card.yaml:154`). For durable that line is only "lasting", so the meaning axis checks the story against one word. Is that enough, or does it need its own story?
