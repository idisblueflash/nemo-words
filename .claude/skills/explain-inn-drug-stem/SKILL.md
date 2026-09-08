---
name: explain-inn-drug-stem
description: |
  Decodes a modern pharmaceutical generic (INN) name into an arbitrary/eponymous prefix plus WHO-standardized stem(s) marking drug class/mechanism (e.g. "-mab", "-nib", "-limus", "-statin") and explains what the stem signals. Same shape as `explain-greek-latin-blocks` but for INN, not Greek/Latin; hand off Anki cards to `build-word-part-anki`. Use for modern drug names, not classical morphemes — e.g. "tacrolimus", "imatinib". Not for brand names or general words.
---

# Explain INN Drug-Name Stems

## Trigger example

<example>
Context: User is reading about immunosuppressant therapy and encounters a generic drug name.
user: "what does the -limus in tacrolimus mean?"
assistant: "I'll use explain-inn-drug-stem to look up the -limus stem and explain what drug class/mechanism it signals."
<commentary>
"tacrolimus" is a modern INN generic name, not a classical Greek/Latin term, so it routes here instead of explain-greek-latin-blocks.
</commentary>
</example>

## Why this works

Modern generic drug names aren't classical Greek/Latin compounds — they're built under
the WHO's **International Nonproprietary Name (INN)** system, which is generative in a
different way: an arbitrary or eponymous prefix (often a place, company, or lab code)
plus one or more **standardized stems** drawn from a closed, WHO-maintained list, where
the stem marks the drug's class or mechanism, not its literal meaning. Once a stem is
known, every future drug ending in it is partly classifiable on sight —
`sirolimus`/`tacrolimus`/`everolimus`/`temsirolimus` all end `-limus` and are all in the
same mTOR/calcineurin-pathway immunosuppressant family, the same way `-itis` marks
"inflammation of" across a dozen classical terms. Same payoff, different rulebook.

## When this applies

Good fit: a modern pharmaceutical **generic** name ending in a recognizable stem, where
the user wants to know what the ending signals — "tacrolimus", "imatinib",
"atorvastatin", "rituximab".

Bad fit:
- **Classical medical/anatomical/procedural terms** built from real Greek/Latin
  morphemes ("hypothermia", "nephrectomy") → use `explain-greek-latin-blocks` instead.
  Some drug names coincidentally contain classical-looking syllables, but the INN
  stem system and classical etymology are different rulebooks — don't mix them into
  one table.
- **Brand/trade names** ("Prograf", "Gleevec", "Lipitor") — the INN stem system governs
  only the generic/nonproprietary name. If given a brand name, ask for or look up the
  generic first.
- **General English words** → `english-word-explainer`.
- **A stem/prefix you can't verify** → don't invent a classification. Say so (Step 3)
  rather than guessing past it.

## Step 1 — Split prefix from stem(s)

Unlike classical decomposition, the two halves carry very different kinds of meaning:

- **Prefix** — usually **arbitrary or eponymous**: invented for phonetic
  distinctiveness/trademark purposes, or derived from a place, person, organism, or lab
  code. Report what's actually documented (e.g. `tacro-` ← Tsukuba, Japan, where the
  source organism was isolated) but don't force a meaning onto syllables that are
  genuinely just invented. Most prefixes contribute **zero** pharmacological meaning —
  say so plainly rather than papering over it with false etymology.
- **Stem** — one or more WHO-standardized endings that classify the drug by
  target/mechanism/class. This is the part worth explaining. Monoclonal antibodies
  (`-mab`) can carry extra infixes before the stem (target + source) — see the
  reference table below.

## Step 2 — Look up the stem

Match against this starter reference (not exhaustive — WHO's full INN Stem Book has
far more; if a stem genuinely isn't here or elsewhere confirmable, go to Step 3):

| Stem | Class / mechanism | Examples |
|---|---|---|
| `-limus` | mTOR/calcineurin-pathway immunosuppressant | tacrolimus, sirolimus, everolimus, temsirolimus |
| `-mab` | monoclonal antibody | rituximab, adalimumab, trastuzumab |
| `-nib` | kinase inhibitor | imatinib, erlotinib, sunitinib |
| `-statin` | HMG-CoA reductase inhibitor (lipid-lowering) | atorvastatin, simvastatin, rosuvastatin |
| `-pril` | ACE inhibitor | lisinopril, enalapril, captopril |
| `-sartan` | angiotensin II receptor blocker | losartan, valsartan |
| `-olol` | beta blocker | atenolol, propranolol, metoprolol |
| `-dipine` | dihydropyridine calcium channel blocker | amlodipine, nifedipine |
| `-prazole` | proton pump inhibitor | omeprazole, esomeprazole |
| `-gliptin` | DPP-4 inhibitor (antidiabetic) | sitagliptin, saxagliptin |
| `-gliflozin` | SGLT2 inhibitor (antidiabetic) | dapagliflozin, empagliflozin |
| `-coxib` | COX-2 selective inhibitor | celecoxib, etoricoxib |
| `-triptan` | 5-HT1 receptor agonist (migraine) | sumatriptan, rizatriptan |
| `-oxetine` | SSRI/SNRI antidepressant | fluoxetine, duloxetine |
| `-cillin` | penicillin-class antibiotic | amoxicillin, ampicillin |
| `-cycline` | tetracycline-class antibiotic | doxycycline, minocycline |
| `-floxacin` | fluoroquinolone antibiotic | ciprofloxacin, levofloxacin |
| `-azole` | antifungal (imidazole/triazole) | fluconazole, ketoconazole |
| `-parin` | heparin-derived anticoagulant | enoxaparin, dalteparin |
| `-navir` | antiviral protease inhibitor | ritonavir, lopinavir |
| `-vir` | antiviral (broader) | acyclovir, oseltamivir |

**Monoclonal antibodies (`-mab`) decompose further.** The pre-2017 WHO scheme used
target + source infixes before the stem (e.g. ri**tu**xi**mab**: `-tu-` = tumor target,
`-xi-` = chimeric source, `-mab` = monoclonal antibody). WHO simplified this in 2017 —
newer mAbs may carry no infix breakdown at all. If asked to decode a `-mab` name, check
which scheme it was named under rather than forcing the old infix table onto a post-2017
name; flag the ambiguity (Step 3) if you can't tell which applies.

## Step 3 — Flag uncertainty, don't guess past it

If the ending doesn't match a known stem, matches more than one plausibly, or you can't
confirm which naming scheme applies (e.g. pre/post-2017 mAb infixes), say so explicitly
rather than picking one silently — same discipline as `explain-greek-latin-blocks`'s
ambiguity step. "No confirmed INN stem match" is a legitimate answer.

## Step 4 — Reinforce transfer (brief, don't force it)

Name one or two other drugs sharing the same stem, the same way `explain-greek-latin-blocks`
does for classical roots — that's the actual payoff (per Why this works above).

## Step 5 — Offer next steps (don't do either proactively)

This skill's output stops at the prefix/stem table + meaning. Offer, and wait for the
user to pick:
- **Anki card** — hand the WHO stem(s) from Step 2 (canonical form, `Origin: INN
  stem`, meaning) to the `build-word-part-anki` skill. Skip arbitrary/eponymous
  prefixes that carry no confirmed pharmacological meaning — that skill's own rules
  exclude them, the same way it excludes combining vowels from Greek/Latin rows.

Explanation and Anki row are kept distinct on purpose — do the Anki write only if the
user asks for it (the `_etta_mology` agent is the one exception: being dispatched with
a word is itself the go-ahead).

## Example output

**Term: tacrolimus**

| Part | Type | Basis | Meaning |
|---|---|---|---|
| `tacro-` | prefix | eponymous (place) | from Tsukuba, Japan — where the source organism (*Streptomyces tsukubaensis*) was isolated; carries no pharmacological meaning |
| `-limus` | WHO stem | INN convention | mTOR/calcineurin-pathway immunosuppressant |

**Meaning:** the prefix is a place-name artifact, not a clue to function — all the
classification signal is in `-limus`. Originally lab-coded FK506 before being renamed
for generic use.

**Seen elsewhere:** `-limus` also marks sirolimus and everolimus — same immunosuppressant
family.

---

**Term: rituximab** *(monoclonal antibody, pre-2017 infix scheme)*

| Part | Type | Basis | Meaning |
|---|---|---|---|
| `ri-` | prefix | arbitrary | no confirmed meaning |
| `-tu-` | target infix | INN convention (pre-2017) | tumor |
| `-xi-` | source infix | INN convention (pre-2017) | chimeric (part-mouse, part-human) |
| `-mab` | stem | INN convention | monoclonal antibody |

**Meaning:** a chimeric monoclonal antibody targeting a tumor-associated antigen.
Post-2017-named `-mab` drugs won't carry this infix granularity — flag which scheme
applies before decoding a newer one this way.

**Seen elsewhere:** `-mab` closes every monoclonal antibody name (adalimumab,
trastuzumab); `-xi-` also appears in cetuximab (also chimeric).
