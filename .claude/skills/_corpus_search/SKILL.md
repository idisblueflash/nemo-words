---
name: _corpus_search
description: |
  Searches the local Tatoeba English corpus (2M sentences, encoded with CWB/cqp) for a
  word or phrase and presents the hits as a KWIC concordance — the search term centred,
  aligned context each side, one line per occurrence. Use when the user asks to "search
  the corpus for X", "show me X in a concordance", "how is X used in real sentences",
  "find example sentences with X", "what collocates with X", or wants attested usage /
  frequency of a word or multi-word pattern. Runs `scripts/corpus-search.sh` (wrapper
  over `cqp`); does not save anything to Anki or the mnemonic log — it only reports. For
  explaining a word's meaning/pronunciation see `english-word-explainer` / `_glossy_ary`;
  for phonetic pattern lookups see the `nemo-words` CLI.
---

# Corpus Search

## Trigger examples

<example>
Context: Flash is drafting a usage example for a word card and wants to see how the word actually appears in the wild.
user: "search the corpus for 'ubiquitous' — show me a concordance"
assistant: "I'll run the KWIC search over the Tatoeba corpus and show the hits."
<commentary>
"search the corpus" + "concordance" → run scripts/corpus-search.sh, present the aligned KWIC lines, note the total count.
</commentary>
</example>

<example>
Context: Flash wants to know whether "different than" or "different from" dominates in attested usage.
user: "how common is 'different than' vs 'different from' in the corpus?"
assistant: "I'll get counts and a few example lines for each."
<commentary>
Two `--cql` queries with `--count`, then a short concordance sample of each.
</commentary>
</example>

## Prerequisites

- CWB 3.5 installed (`brew install cwb3`) — provides `cqp`.
- GNU coreutils installed (`brew install coreutils`) — provides `gshuf`, which
  `--sample` needs (macOS ships no `shuf`).
- The corpus encoded at `data/tatoeba/cwb/` as `TATOEBA_ENG` (see
  `data/tatoeba/README.md`; re-encode with `data/tatoeba/tsv2vrt.py` + `cwb-encode`
  if missing).

The wrapper sets `CORPUS_REGISTRY` itself — no env setup needed by the caller.

## The tool

`scripts/corpus-search.sh` — a thin wrapper over `cqp`:

```bash
scripts/corpus-search.sh --sample <word> [n]   # DEFAULT — n hits sampled uniformly at random from ALL matches
scripts/corpus-search.sh <word> [n]            # first n matches in corpus order (not randomized — see below)
scripts/corpus-search.sh --sample --cql '<query>' [n]   # random sample over a raw CQL query
scripts/corpus-search.sh --cql '<query>' [n]   # raw CQL, first n in corpus order: '[word="run"] [word="into"]'
scripts/corpus-search.sh --count <word>        # total match count only
```

- **Default to `--sample`.** Without it, hits come back as `cqp`'s first n matches in
  *corpus order* (encoding/insertion order) — fine when the total is small enough that
  you're seeing every match anyway, but a biased slice for a high-frequency word with
  far more matches than n (whatever ordering/clustering exists in how Tatoeba sentences
  were contributed leaks into what you see). `--sample` fixes this by picking n indices
  uniformly at random from the *entire* match set via `gshuf`, so the concordance is a
  representative sample of real usage rather than a corpus-order prefix. Only skip
  `--sample` if the user explicitly wants the raw/first-in-order hits.
- Context shown is the **containing sentence**, clipped to `WIDTH` chars per side
  (env, default 55; a clipped side is marked `…`).
- Tokenization is `\w+|[^\w\s]`, so contractions are split — search `"n't"` or
  `[word="ca"] [word="n't"]`, and punctuation is its own token.
- CQL cheatsheet: `[word="bank"%c]` case-insensitive · `[]` any token ·
  `[word="the"] []* [word="end"] within s` · `[word="colou?r"%c]` regex.

## Steps

1. **Pick the query form.**
   - Single word → `scripts/corpus-search.sh --sample <word>`.
   - Fixed phrase / grammatical pattern → `--sample --cql` with one `[word="…"]` box per
     token (remember contractions and punctuation are separate tokens).
   - "How common" / "which is more frequent" → run `--count` first (for each
     alternative), then a `--sample` concordance sample.

2. **Run it.** Default to ~15–25 hits unless the user asks for more or fewer. For a
   frequency question, always get the `--count` number too. `--sample` prints a
   `sampled n of total…` (or `showing all total…`) note to stderr — surface that
   alongside the count when you report the count.

3. **Present as a concordance.** Show the wrapper's aligned output in a fenced code
   block (monospace keeps the KWIC column aligned). Lead with the total count:

   ```
   ubiquitous — 30 matches in TATOEBA_ENG (10 sampled at random)

                                        Cellphones are now  [ ubiquitous ]  .
                             Recording technologies are  [ ubiquitous ]  whether they are Facebook …
   ```

   If hits far exceed what's shown, say so ("showing 10 of 30, sampled at random"). If
   there are **zero** matches, say that plainly and suggest a looser query (wrong token
   split? try the base form of the word?).

4. **Optional: collocates.** If the user asks what a word co-occurs with, run the
   search with a wider `WIDTH`, or use `cqp` directly:
   `A=[word="river"%c]; group A target word on matchend[1..3];` for a right-side
   frequency table.

5. **Never save.** This skill reports attested usage only. If the user then wants a
   usage example written onto a card, that's `_glossy_ary` / the word-workflow — hand
   off, don't write Anki or the mnemonic log here.
