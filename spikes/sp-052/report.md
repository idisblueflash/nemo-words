# SP-052 report: does NOAD find as many exact sound anchors as CMU?

Counts and word lists only. The per-word IPA comparison is in the gitignored `dictionaries/noad/data/sp-052-detail.tsv` (NOAD content is never committed).

## Word set

532 words: 332 from the card file, 127 from the mnemonic log, 200 sampled (seed 52). A word in more than one source is counted once.

Read: card file: 335 whole-word rows; mnemonic log: 130 whole-word rows (word-part rows not counted; before names are left out and duplicates merged, e.g. `colon (intestine)` and `colon`).

Left out:

- Quebec (card, 1): proper name
- fus-, -ion, chem-, -therapy, thalass-, haem-, hemat-, -ia, -glob-, -in, -limus, apo-, dia-, hair-, -esis, lymph-, -oma, myel-, hydro-, -phob-, -ic, cyt-, tox-, phleb-, -tomy, auto-, -log-, -ous, -logy, lob-, -tain, per-, con-, re-, manu-, sub-, plas-, -ma, allo-, -gen-, tax-, -nomy, ana-, an-, onc-, ster-, -oid, thyr-, pneumon-, col-, -itis, neutr-, -penia, -rrhea, vir-, cortic-, fract-, -ory, hepat-, -kine, syn-, -drome, pharmaco-, vigilance, morb-, -id, -ity, mort-, -al, ad-, de-, pict, pre-, -ceive, homo-, hetero-, -mise, heur-, -istic, ped-, para-, -meter, val-, -ence, -esce, trans-, intra-, -cy (card, 88): word part
- hepat-, -cy, -penia, -esis, -phob-, -ma, per-, -ory, cad-, -drome, -aneus, mort-, manu-, -glob-, -gen-, tax-, -log-, an-, -ence, val-, pre-, con-, trans-, fus-, -ion, -esce, intra-, -tomy (log, 28): word part

## Results

A source's row counts every word from that source (a word in two sources is in both rows). Anchored syllables: syllables with an exact anchor, out of all syllables of the words that dictionary has IPA for.

| Source | Words | US IPA NOAD | US IPA CMU | Anchored syllables NOAD | Anchored syllables CMU | Words with an anchor NOAD | Words with an anchor CMU |
|---|---|---|---|---|---|---|---|
| card | 332 | 287/332 (86.4%) | 314/332 (94.6%) | 290/684 (42.4%) | 293/723 (40.5%) | 179/332 (53.9%) | 189/332 (56.9%) |
| log | 127 | 110/127 (86.6%) | 124/127 (97.6%) | 96/251 (38.2%) | 110/277 (39.7%) | 63/127 (49.6%) | 76/127 (59.8%) |
| sample | 200 | 200/200 (100.0%) | 200/200 (100.0%) | 232/513 (45.2%) | 222/514 (43.2%) | 147/200 (73.5%) | 141/200 (70.5%) |
| total | 532 | 487/532 (91.5%) | 514/532 (96.6%) | 522/1197 (43.6%) | 515/1237 (41.6%) | 326/532 (61.3%) | 330/532 (62.0%) |

## Anchored with NOAD only

- apheresis
- phlebotomy
- hydrophobic
- allogeneic
- regime
- autologous
- dismissal
- dismiss
- myeloma
- colitis
- pneumonitis
- unbidden
- pathway
- adherence
- discrete
- dozen
- vapor
- suspiciously
- tessellated
- hum
- timber
- invigilator
- shuttered
- stamina
- synonym
- hypernym
- polysemy
- odd
- f
- surround
- blasted
- exception
- distributive
- revise
- combatant
- pa
- parrot
- projection
- habit
- battle
- deformed
- riddle
- quorum
- temper
- leisure
- mackerel

## Anchored with CMU only

- cohort
- lass
- undergone
- limb
- steelman
- incident
- onwards
- colon
- mediated
- adjudicated
- episode
- emboldened
- patrons
- throne
- sweating
- unwinding
- idling
- pound
- levee
- conducting
- acquired
- eligible
- pursuing
- wrung
- excelling
- inducing
- depicted
- premise
- era
- biases
- tacit
- essence
- trivial
- herd
- rung
- concocted
- corncob
- ladles
- cogent
- betwixt
- niece
- postal
- reclaimed
- manure
- parabola
- kinsman
- element
- consonant
- charisma
- specify

## Same IPA, split differently

13 of 352 words with the same IPA in both dictionaries are split differently (IPA compared without stress marks, with NOAD ər = CMU ɚ/ɝ and NOAD ə = CMU ʌ).

- pathway
- garage
- curriculum
- saturation
- uninteresting
- surround
- inauguration
- parabola
- ferocious
- oblong
- ceasefire
- charisma
- forthwith

## Words with no US IPA in NOAD

45 words, counted as unanchored for NOAD.

- cracks: not in NOAD
- haemoglobin: not in NOAD
- thalassaemia: not in NOAD
- anaemia: not in NOAD
- tacrolimus: not in NOAD
- transplants: not in NOAD
- undergone: not in NOAD
- steelman: not in NOAD
- swollen: not in NOAD
- onwards: not in NOAD
- mediated: not in NOAD
- adjudicated: not in NOAD
- stools: not in NOAD
- summoning: not in NOAD
- emboldened: not in NOAD
- slates: not in NOAD
- patrons: not in NOAD
- sweating: not in NOAD
- unwinding: not in NOAD
- runes: not in NOAD
- realms: not in NOAD
- idling: not in NOAD
- breached: not in NOAD
- conducting: not in NOAD
- acquired: not in NOAD
- obtained: not in NOAD
- trades: not in NOAD
- pursuing: not in NOAD
- wrung: not in NOAD
- excelling: not in NOAD
- inducing: not in NOAD
- depicted: not in NOAD
- biases: not in NOAD
- rigged: not in NOAD
- spilled: not in NOAD
- evicted: not in NOAD
- rationing: not in NOAD
- concocted: not in NOAD
- corncob: not in NOAD
- cocked: not in NOAD
- rattles: not in NOAD
- snubbing: not in NOAD
- simmers: not in NOAD
- ladles: not in NOAD
- strutted: not in NOAD

## Words with no US IPA in CMU

18 words, counted as unanchored for CMU.

- apheresis: not in CMU
- haemoglobin: not in CMU
- thalassaemia: not in CMU
- anaemia: not in CMU
- phlebotomy: not in CMU
- hydrophobic: not in CMU
- tacrolimus: not in CMU
- allogeneic: not in CMU
- autologous: not in CMU
- myeloma: not in CMU
- colitis: not in CMU
- pneumonitis: not in CMU
- unbidden: not in CMU
- tessellated: not in CMU
- invigilator: not in CMU
- hypernym: not in CMU
- polysemy: not in CMU
- strutted: not in CMU

## Dictionary coverage

- NOAD: 60087 of 60283 lower-case headwords (99.7%) have a US IPA; derivatives: 14885 of 17040 have their own full US IPA, 117 only a partial one, 2038 none.
- CMU: every entry has a US (GA) IPA, by construction.

Derivatives without their own full IPA get none by rule (the default kept): they are left out as keywords, and a set word NOAD lists only that way has no NOAD IPA (0 in the set).

## Inflections

Inflections are left out as keywords on both sides (NOAD has no inflection entries until US-055). A CMU word counts as an inflection when NOAD has no entry for it but has a headword it regularly inflects.

28 CMU syllables would have been anchored by an inflection (claimed, cues, des, dos, eyes, formed, leased, lies, mer, plied, says, sewed); 7 words lose their only anchor to this rule.

## ər before a vowel (open question)

ər before a vowel: 11 of 487 words with a NOAD IPA in the set (11 spots); across NOAD's lower-case headwords with a US IPA: 1805 of 60087 (3.0%).

- onset rule (ˈɪn.tə.rəst): NOAD anchors 324 words, 523 syllables.
- nucleus rule (ˈɪn.tər.əst): NOAD anchors 326 words, 522 syllables.

Words whose anchored-syllable count changes with the rule: 9 (recurrent, moderate, literal, thoroughfare, pleasurable, inquiring, trajectory, intrauterine, mackerel).

Rule used: nucleus (more NOAD-anchored words wins, then more anchored syllables; a tie keeps onset, the same maximal-onset split today's syllabify step gives every other consonant).

## Verdict

**Go** for E07: NOAD anchors 326 words, CMU 330: 98.8% of CMU's (bar: at least 95%).
