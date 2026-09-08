---
name: build-word-part-anki
description: |
  Takes a morpheme breakdown (part + origin + meaning — from `explain-greek-latin-blocks`, `explain-inn-drug-stem`, or supplied directly) and writes/patches rows in `anki/medical-word-parts.txt`, one row per morpheme, tab-separated Front/Back on Anki's Basic note type. Use when the user asks to "make an Anki card" or "save this word part" for a medical morpheme/drug stem. Not for deciding parts/meanings — see those two skills. Not for whole-word vocabulary cards — those live in `anki/reading-room-terms.txt` (see `_glossy_ary`).
---

# Build Medical Word-Part Anki Rows

## Trigger example

<example>
Context: A decomposition skill just produced a parts table for "hypothermia" and the user wants it saved as flashcards.
user: "turn this into an Anki card"
assistant: "I'll use build-word-part-anki to write one row per part (hypo-, therm, -ia) into anki/medical-word-parts.txt."
<commentary>
The parts/meanings are already decided by the decomposition skill; this skill only formats and writes them, never re-decides the breakdown.
</commentary>
</example>

## Scope

This skill owns exactly one thing: turning a morpheme (or INN drug-stem) breakdown
into rows following the format below in `anki/medical-word-parts.txt`. It does not decompose
terms itself — if the user hands you a bare term ("make an anki card for
hypothermia") rather than an already-decomposed parts table, run
`explain-greek-latin-blocks` (classical terms) or `explain-inn-drug-stem` (modern
generic drug names) first — whichever fits, see each skill's "When this applies" —
then come back here with its output. Keeping this boundary is deliberate: it lets
each decomposition skill's quality be evaluated independently of this skill's
file-formatting correctness.

## The file format

`anki/medical-word-parts.txt` is Anki's plain-text import format, header directives
fixing the notetype/deck/tags so no manual selection is needed at import time. It
uses Anki's built-in **Basic** note type (ships in every collection, no custom note
type to create) — so the file has just two columns, Front and Back:

```
#separator:tab
#html:true
#notetype:Basic
#deck:01 Medical Terms
#tags:medical-word-parts
#columns:Front	Back
```

One row **per morpheme/stem** (not per whole term), tab-separated:

```
haem-	<i>Greek</i><br>blood<br><span class="examples">e.g. haemoglobin, hematology, hemolysis</span>
-limus	<i>INN stem</i><br>mTOR/calcineurin-pathway immunosuppressant<br><span class="examples">e.g. tacrolimus, sirolimus, everolimus</span>
```

- **Front** — the canonical part form, no combining vowel (`glob`, not `globo`;
  `-ia`, not `ia-`; keep the trailing/leading hyphen convention matching existing
  rows for that position — prefixes get a trailing `-`, suffixes a leading `-`,
  roots usually none).
- **Back** — `<i>Origin</i><br>meaning<br><span class="examples">e.g. term1,
  term2</span>`, three pieces folded into one field:
  - **Origin** — `Greek` or `Latin` for classical morphemes, or `INN stem` for a
    WHO-standardized drug-name stem decoded by `explain-inn-drug-stem` (e.g.
    `-limus`, `-mab`, `-nib`). `INN stem` isn't itself a language of origin — don't
    force it into `Greek`/`Latin`, and don't force a real `Greek`/`Latin` etymology
    label onto it either.
  - **meaning** — the plain-language definition.
  - **examples** — `e.g. term1, term2`, wrapped in the `examples` span.
  The `<br>` (not a literal newline — those can't sit inside a tab-separated field)
  is what produces each visual line break once `#html:true` renders it.

The Anki import steps are documented in `medical-word-parts-template.md` in this
skill's folder — read it only if you need a refresher on the import flow, not for
routine row writes.

## Writing a row

For each morpheme/stem in the breakdown you were given:

1. **Search first.** Check `anki/medical-word-parts.txt` for an existing row whose
   `Front` matches (exact match on canonical form).
2. **Row exists** → patch its `<span class="examples">` list to add the new term,
   deduped against what's already there. Leave the origin/meaning lines alone unless
   the user is explicitly correcting them.
3. **Row doesn't exist** → append a new row: `Part<TAB><i>Origin</i><br>meaning<br><span
   class="examples">e.g. term1, term2</span>`.
4. **Combining vowels don't get a row** — they carry no meaning on their own.
5. **Arbitrary/eponymous INN prefixes don't get a row either** — same reason as
   combining vowels: no meaning of their own to test. Only the WHO stem(s) (the part
   `explain-inn-drug-stem` actually classifies) are worth a card. If a prefix
   genuinely does carry a documented meaning, it's an exception, not the default —
   use judgement.

Keep each row **atomic**: one morpheme/stem's meaning + example terms, nothing about
why a condition matters clinically. That reasoning (if wanted) belongs in a different
note, not this row (per the learning map's decision map: don't cram reasoning chains
into a vocab card).

Edit the file directly (it's small and hand-authored, no script wraps it) — verify
afterward with a quick read-back of the changed lines before syncing.

## Example

Given the breakdown for *hypothermia* (`hypo-`/Greek/"below, deficient",
`therm`/Greek/"heat", `-ia`/Greek/"condition of"), and no existing rows for any of
these three parts:

```
hypo-	<i>Greek</i><br>below, deficient<br><span class="examples">e.g. hypothermia, hypoglycemia</span>
therm	<i>Greek</i><br>heat<br><span class="examples">e.g. hypothermia, thermometer</span>
-ia	<i>Greek</i><br>condition of<br><span class="examples">e.g. anemia, hypothermia</span>
```

If `-ia` already existed as a row (e.g. `-ia	<i>Greek</i><br>condition of<br><span
class="examples">e.g. anemia</span>`), patch it instead of adding a duplicate:

```
-ia	<i>Greek</i><br>condition of<br><span class="examples">e.g. anemia, hypothermia</span>
```

Given an INN breakdown for *tacrolimus* (`tacro-`/eponymous prefix/no confirmed
pharmacological meaning, `-limus`/WHO stem/"mTOR/calcineurin-pathway
immunosuppressant"), only the stem gets a row — the prefix is skipped per rule 5
above:

```
-limus	<i>INN stem</i><br>mTOR/calcineurin-pathway immunosuppressant<br><span class="examples">e.g. tacrolimus, sirolimus, everolimus</span>
```
