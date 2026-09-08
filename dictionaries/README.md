# Offline Greek & Latin dictionaries

Three local, public-domain/open-source dictionaries, each with a zero-dependency
CLI so a word's English meaning (or Latin morphology) can be looked up without
a network round-trip. None of the corpora are committed to git — each tool has
a `download.sh` that fetches its own data into a gitignored `data/` or
`vendor/` directory. Run the relevant `download.sh` once before first use.

## `lewis-short/` — Latin → English (Lewis & Short, 1879)

Public-domain Latin-English dictionary, ~51,600 entries, sourced as plaintext
from [telemachus/plaintext-lewis-short](https://github.com/telemachus/plaintext-lewis-short)
(itself derived from the [Perseus Digital Library](http://www.perseus.tufts.edu/)'s
CC BY-SA 3.0 TEI-XML edition).

```bash
cd dictionaries/lewis-short
bash download.sh          # one-time; --force to re-fetch
node search.js sanguis    # exact headword match -> full entry
node search.js xyz        # no match -> substring-based headword suggestions
```

Search is diacritic-insensitive (`video` matches `vĭdĕo`) and hyphen-insensitive
(`abeo` matches `ăb-ĕo`). A byte-offset index (`data/index.json`) means a
lookup reads only the matched entry off disk, not the whole 25MB corpus.

## `lsj/` — Greek → English (Liddell-Scott-Jones)

Full LSJ 9th-edition entries (~117,000, incl. minor/gloss entries), parsed
from the TEI-XML source at [helmadik/LSJLogeion](https://github.com/helmadik/LSJLogeion)
(Helma Dik, U. Chicago — Perseus's manually-keyed LSJ text with editorial
corrections). Note: an earlier attempt used the derived `ciscoriordan/lsj9`
short-definitions JSON, which turned out to systematically strip words out of
its own definitions (e.g. λόγος rendered as "verbal noun of , with senses") —
LSJLogeion's full entries don't have that problem, at the cost of a ~110MB
clone and a build step that parses all 86 XML files.

```bash
cd dictionaries/lsj
bash download.sh              # one-time clone (~110MB) + index build; --force to re-clone
node search.js λόγος          # Greek script, exact match
node search.js logos          # Latin-letter transliteration of the same word
node search.js phleb          # substring fallback -> candidate headwords (φλέψ, φλεβοτομέω, ...)
```

Query in either polytonic Greek script or a rough classical transliteration
(α→a, θ→th, φ→ph, χ→ch, ψ→ps, η/ω→e/o, …) — useful since medical-word
decomposition usually starts from a Latin-letter root like "phleb" or "tome".
Same byte-offset design as `lewis-short/`.

## `open-words/` — Latin morphology (Whitaker's Words, Python port)

Vendors [ArchimedesDigital/open_words](https://github.com/ArchimedesDigital/open_words),
a pure-stdlib Python 3 port of Whitaker's Words. Unlike the two dictionaries
above, this doesn't just look up a headword — it **parses inflected forms**,
so it identifies the dictionary headword *and* the grammatical case/tense/etc.
of whatever form you actually typed.

```bash
cd dictionaries/open-words
bash download.sh              # one-time clone; --force to re-clone
python3 search.py corporis    # genitive of corpus -> headword "corpus" + GENITIVE SG
python3 search.py sanguis     # blood
```

Classical Latin only — Greek-derived medical loanwords (e.g. "phlebotomia")
correctly return "no match" rather than a wrong guess.

## Which one to use

- Have a **Latin word or an inflected Latin form**? Try `open-words/` first —
  it'll tell you the case/tense, which `lewis-short/` won't.
- Have a **Greek root** (as in Greek/Latin medical-word decomposition, see
  `.claude/skills/explain-greek-latin-blocks/`)? Use `lsj/`, querying by
  transliteration if you don't have the Greek script handy.
- Want the **full dictionary prose** (etymology, citations, every sense) for
  a Latin headword? `lewis-short/`.
