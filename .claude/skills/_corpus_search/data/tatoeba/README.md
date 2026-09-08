# Tatoeba English corpus

Source: <https://downloads.tatoeba.org/exports/per_language/eng/> (CC-BY 2.0 FR).

| File | What |
|---|---|
| `eng_sentences.tsv[.bz2]` | raw export — `id \t eng \t text`, 2,035,404 sentences |
| `eng.vrt` | vertical (one-token-per-line) form, `<s id=...>` tags — CWB input |
| `cwb/` | encoded + indexed CWB corpus `TATOEBA_ENG` (19.7M tokens) and its registry |
| `tatoeba.db` | *(optional, not built)* SQLite FTS5 — see AGENTS note |

## Searching

Everyday use goes through the **`_corpus_search`** skill / its wrapper
`scripts/corpus-search.sh` (`<word> [n]`, `--cql '<query>' [n]`, `--count <word>`),
which prints an aligned KWIC concordance. The raw `cqp` interface below is for
anything the wrapper doesn't cover (collocation tables, alignment, custom output).

## Searching with CWB (raw cqp)

CWB 3.5 is installed via Homebrew (`brew install cwb3`). The registry lives
inside this repo, so pass `-r` (or export `CORPUS_REGISTRY`):

```bash
export CORPUS_REGISTRY="$PWD/data/tatoeba/cwb/registry"

# interactive
cqp -D TATOEBA_ENG

# one-off concordance, 6 words of context each side, first 10 hits
echo 'set Context 6 word; cat [word="ubiquitous"%c] 0 9;' | cqp -D TATOEBA_ENG

# collocation stats around a word (mutual information, log-likelihood)
echo 'A=[word="river"%c]; ' | cqp -D TATOEBA_ENG        # then: count by word on A
```

CQL examples: `[word="run"] [word="into"]` (bigram), `[word="the"] []* [word="bank"] within s`.

## Re-encoding after refreshing the TSV

```bash
python3 - <<'PY'   # regenerate eng.vrt  (see scratchpad/tsv2vrt.py for the original)
PY
rm -rf data/tatoeba/cwb && mkdir -p data/tatoeba/cwb/{tatoeba_eng,registry}
cwb-encode -d data/tatoeba/cwb/tatoeba_eng -f data/tatoeba/eng.vrt \
  -R data/tatoeba/cwb/registry/tatoeba_eng -c utf8 -S s:0+id -x -B
cwb-makeall -r data/tatoeba/cwb/registry -D TATOEBA_ENG
```

Tokenizer is a plain `\w+|[^\w\s]` split, so `"Let's"` → `Let ' s`. Good enough
for concordancing; no lemma/POS layer.
