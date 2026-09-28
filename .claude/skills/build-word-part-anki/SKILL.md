---
name: build-word-part-anki
description: |
  Takes a morpheme breakdown (part + origin + meaning — from `explain-greek-latin-blocks`, `explain-inn-drug-stem`, or supplied directly) and writes/patches rows in `anki/reading-room-terms.txt`, tagged `medical-word-parts` (ADR-0016), one row per morpheme, tab-separated on Anki's Basic note type. Use when the user asks to "make an Anki card" or "save this word part" for a medical morpheme/drug stem. Not for deciding parts/meanings — see those two skills. Not for whole-word vocabulary cards — those are ordinary (untagged) rows in the same file (see `.claude/rules/word-workflow.md`).
---

# Build Medical Word-Part Anki Rows

## Trigger example

<example>
Context: A decomposition skill just produced a parts table for "hypothermia" and the user wants it saved as flashcards.
user: "turn this into an Anki card"
assistant: "I'll use build-word-part-anki to write one row per part (hypo-, therm, -ia) into anki/reading-room-terms.txt, tagged medical-word-parts."
<commentary>
The parts/meanings are already decided by the decomposition skill; this skill only formats and writes them, never re-decides the breakdown.
</commentary>
</example>

## Scope

This skill owns exactly one thing: turning a morpheme (or INN drug-stem) breakdown
into rows following the format below in `anki/reading-room-terms.txt`. It does not decompose
terms itself — if the user hands you a bare term ("make an anki card for
hypothermia") rather than an already-decomposed parts table, run
`explain-greek-latin-blocks` (classical terms) or `explain-inn-drug-stem` (modern
generic drug names) first — whichever fits, see each skill's "When this applies" —
then come back here with its output. Keeping this boundary is deliberate: it lets
each decomposition skill's quality be evaluated independently of this skill's
file-formatting correctness.

## The file format

`anki/reading-room-terms.txt` is Anki's plain-text import format, header directives
fixing the notetype/default-deck/default-tags so no manual selection is needed at
import time. It uses Anki's built-in **Basic** note type (ships in every collection,
no custom note type to create). Whole-word vocabulary rows and word-part rows share
this one file (ADR-0016) — word-part rows are what distinguishes themselves via the
last two columns, `Deck` and `Tags`, which override the header's default deck/tags for
just that row:

```
#separator:tab
#html:true
#notetype:Basic
#deck:00 Reading Room::Terms
#tags:reading-room-terms
#media-dir:images/mnemonic
#columns:Front	Back	Image	IPA	Gloss	Deck	Tags
```

One row **per morpheme/stem** (not per whole term), tab-separated — `Deck` fixed to
`00 Reading Room::01 Medical Terms` and `Tags` fixed to `medical-word-parts`; `IPA` and
`Gloss` are always empty (no sound/story axis for these, and the `Back` already states
the meaning); `Image` is optional, same as any row:

```
haem-	<i>Greek</i><br>blood<br><span class="examples">e.g. haemoglobin, hematology, hemolysis</span>				00 Reading Room::01 Medical Terms	medical-word-parts
-limus	<i>INN stem</i><br>mTOR/calcineurin-pathway immunosuppressant<br><span class="examples">e.g. tacrolimus, sirolimus, everolimus</span>				00 Reading Room::01 Medical Terms	medical-word-parts
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
  - **mnemonic (optional)** — a row that carries a 🎭 memory sentence prepends it
    before the origin/meaning/examples block, separated by `<hr>`, no label:
    `🎭 sentence<hr><i>Origin</i><br>meaning<br><span class="examples">...</span>`.
    Reviewing the mnemonic first (right after the image, if any) reads better than
    burying it below the definition. Multiple candidate sentences join with `<br>`
    before the `<hr>` (`🎭 one.<br>🎭 two.<hr><i>Origin</i>...`). Not every row has
    one — most word parts have no story axis at all (see this repo's CLAUDE.md); add
    a mnemonic section only when one already exists for that part, or when
    `/new-word-card`'s word-part branch (ADR-0017) deliberately builds one for a
    foundational part — that pipeline writes a single picked sentence here, replacing
    rather than accumulating alongside any earlier hand-added one.
- **Image, IPA, Deck, Tags** — always `Image` empty or a bare filename under
  `images/mnemonic/`; `IPA` always empty; `Deck` always
  `00 Reading Room::01 Medical Terms`; `Tags` always `medical-word-parts` — every
  word-part row carries the same fixed `Deck`/`Tags`/`IPA` values, so don't vary them
  per row.

The Anki import steps are documented in `medical-word-parts-template.md` in this
skill's folder — read it only if you need a refresher on the import flow, not for
routine row writes.

## Writing a row

For each morpheme/stem in the breakdown you were given:

1. **Search first.** Check `anki/reading-room-terms.txt` for an existing row whose
   `Front` matches (exact match on canonical form) and whose `Tags` column is
   `medical-word-parts`.
2. **Row exists** → patch its `<span class="examples">` list to add the new term,
   deduped against what's already there. Leave the origin/meaning lines — and any
   existing `🎭 ...<hr>` mnemonic section ahead of them — alone unless the user is
   explicitly correcting them.
3. **Row doesn't exist** → append a new row: `Part<TAB><i>Origin</i><br>meaning<br><span
   class="examples">e.g. term1, term2</span><TAB><TAB><TAB>00 Reading Room::01 Medical
   Terms<TAB>medical-word-parts` — i.e. `Front`, `Back`, empty `Image`, empty `IPA`,
   then the fixed `Deck`/`Tags` pair.
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
hypo-	<i>Greek</i><br>below, deficient<br><span class="examples">e.g. hypothermia, hypoglycemia</span>				00 Reading Room::01 Medical Terms	medical-word-parts
therm	<i>Greek</i><br>heat<br><span class="examples">e.g. hypothermia, thermometer</span>				00 Reading Room::01 Medical Terms	medical-word-parts
-ia	<i>Greek</i><br>condition of<br><span class="examples">e.g. anemia, hypothermia</span>				00 Reading Room::01 Medical Terms	medical-word-parts
```

If `-ia` already existed as a row, patch just its `Back` field (leaving `Image`/`Deck`/
`Tags` alone) instead of adding a duplicate:

```
-ia	<i>Greek</i><br>condition of<br><span class="examples">e.g. anemia, hypothermia</span>				00 Reading Room::01 Medical Terms	medical-word-parts
```

Given an INN breakdown for *tacrolimus* (`tacro-`/eponymous prefix/no confirmed
pharmacological meaning, `-limus`/WHO stem/"mTOR/calcineurin-pathway
immunosuppressant"), only the stem gets a row — the prefix is skipped per rule 5
above:

```
-limus	<i>INN stem</i><br>mTOR/calcineurin-pathway immunosuppressant<br><span class="examples">e.g. tacrolimus, sirolimus, everolimus</span>				00 Reading Room::01 Medical Terms	medical-word-parts
```
