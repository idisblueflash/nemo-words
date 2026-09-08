---
name: explain-greek-latin-blocks
description: |
  Decodes a term — medical/clinical or general-English — into its Greek or Latin parts — prefix, root(s), suffix, combining vowel — names each, explains its literal meaning, and shows how they compose into the term's meaning. Pure decomposition; hand off Anki cards to `build-word-part-anki`. Use for "break down"/"decompose"/"explain the parts of" a term built from classical morphemes. Single words built from classical Greek/Latin morphemes only, any domain — route words with no such structure to `english-word-explainer` instead; not for multi-word phrases.
---

# Explain Greek/Latin Building Blocks

## Trigger example

<example>
Context: User is reading a clinical passage and hits an unfamiliar procedure name.
user: "break down nephrectomy for me"
assistant: "I'll use explain-greek-latin-blocks to split nephrectomy into its Greek root and suffix and explain how they compose."
<commentary>
"break down" a single classical medical term triggers this skill rather than a general dictionary-style definition.
</commentary>
</example>

## Why this works

Medical vocabulary isn't a list to memorize — it's a small, closed set of ~150-200
high-frequency Greek/Latin morphemes that recombine generatively, the same way a
handful of chemical elements recombine into millions of compounds:
`hypo-` (low) + `-therm-` (heat) + `-ia` (condition) = *hypothermia*.
`hypo-` + `-glyc-` (sugar) + `-emia` (blood condition) = *hypoglycemia*. Once a
morpheme is learned once, every future term reusing it becomes partly readable on
sight. That's the payoff this skill is built to deliver — see
`learning-maps/medical-terminology-anki-learning-map.md` in this repo for the full
mental model (Anki's role, the four coding systems, decision map for what's worth a
card).

## When this applies

Good fit: a single term built from classical roots, medical or general-English alike
— "hypothermia", "nephrectomy", "thrombocytopenia", "gastroenterology", but equally
"adjoining" (ad- + join), "transport" (trans- + port), "benevolent" (bene- + vol +
-ent). The user wants it decomposed, not just defined. Domain doesn't gate this
skill — morpheme structure does.

Bad fit:
- **Words with no classical Greek/Latin morpheme structure** (not built from
  identifiable roots — most short native-English words, e.g. "dog", "run") → use the
  `english-word-explainer` skill instead; that's a different, better-suited tool for those.
- **Multi-word clinical phrases/concepts** ("bone marrow transplant", "top-up
  transfusion") → these aren't morpheme decomposition candidates. Explain them plainly
  if asked — don't force a prefix/root/suffix split onto a phrase.
- **Turning a breakdown into an Anki card** → that's a separate concern, handled by
  the `build-word-part-anki` skill. This skill's job ends at the parts table +
  meaning; it does not touch `anki/medical-word-parts.txt`. Keeping the boundary here
  is deliberate — it's what lets this skill's decomposition/explanation quality be
  evaluated on its own, independent of how the Anki row gets formatted.

## Step 1 — Decompose the term

Split the term into its meaningful morphemes: prefix (if any), root(s), suffix, and
any **combining vowel** (usually `o`, occasionally `i` or `a`) that exists purely to
glue two consonant-heavy morphemes together and carries no meaning of its own —
identify it, but don't count it as a meaningful part.

Most medical terms land on **prefix + root + suffix**, and that's the default shape to
reach for. But decompose to the term's *actual* structure, not a forced three-way
split:
- A term can have **two roots + suffix** and no prefix: `gastr/o` + `enter/o` +
  `-logy` = *gastroenterology* (stomach + intestine + study of).
- A term can have **root + suffix** only, no prefix: `nephr` + `-itis` = *nephritis*.
- A term can have **four+ meaningful parts**. Report however many there actually are —
  if it isn't 3, say so plainly rather than papering over it.

For each meaningful part, give:
- **Canonical form** — cite it without the combining vowel (`cardi-`, not `cardio-`;
  `-therm-`, not `-thermo-`) unless the vowel is conventionally kept in citation form.
- **Origin** — Greek or Latin.
- **Literal meaning** — one short gloss (2-4 words).

## Step 2 — Compose the meaning

1. **Build-up meaning**: chain the parts' literal glosses in order (e.g. "low" +
   "heat" + "condition" → "condition of low heat").
2. **Actual clinical meaning**: state what the term means in real clinical use, and
   **flag any gap** between the literal build-up and the real meaning — this is a
   known failure mode (per the misconceptions section of the learning map above:
   decoding tells you *what* a word is built from, not always its exact clinical
   sense on the first try). Most terms need no flag; when the literal and clinical
   meanings line up cleanly, just say so.

## Step 3 — Flag ambiguity, don't guess past it

If any part has more than one common medical sense (e.g. a root that means different
things in different word families), name the ambiguity rather than silently picking
one. This mirrors the repo's abbreviation-handling rule: treat ambiguity as
ambiguous-by-default, not something to guess through quietly.

## Step 4 — Reinforce transfer (brief, don't force it)

Where it's genuinely useful, name one or two other common terms that reuse a part
just decoded (e.g. `-itis` also drives *arthritis*, *dermatitis*). This is the actual
point of the method — the next term sharing that root is already partly readable —
but keep it to a line, not a list of ten.

## Step 5 — Offer next steps (don't do either proactively)

This skill's output stops at the parts table + meaning. Offer, and wait for the user
to pick:
- **Anki card** — hand the parts table (canonical form/origin/meaning per part) to
  the `build-word-part-anki` skill.

Explanation and Anki row are kept distinct on purpose — do the Anki write only if the
user actually asks for it (the `_etta_mology` agent is the one exception: being
dispatched with a word is itself the go-ahead).

## Example output

**Term: hypothermia**

| Part | Type | Origin | Meaning |
|---|---|---|---|
| `hypo-` | prefix | Greek | below, deficient |
| `therm` | root | Greek | heat |
| `-ia` | suffix | Greek | condition of |

**Build-up meaning:** condition of low heat
**Clinical meaning:** abnormally low body temperature — matches the literal build-up cleanly, no gap to flag.

**Seen elsewhere:** `-ia` also closes *hypoglycemia*'s cousin *hyperglycemia*; `hypo-`
reappears in *hypoglycemia*, *hypotension*.

---

**Term: gastroenterology** *(irregular shape — 2 roots + suffix, no prefix)*

| Part | Type | Origin | Meaning |
|---|---|---|---|
| `gastr` | root | Greek | stomach |
| `enter` | root | Greek | intestine |
| `-logy` | suffix | Greek | study of |
| (`o`, `o`) | combining vowels | — | glue only, no meaning |

**Build-up meaning:** study of the stomach and intestine
**Clinical meaning:** the medical specialty of the digestive system — matches cleanly.
