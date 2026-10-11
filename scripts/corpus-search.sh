#!/usr/bin/env bash
# Concordance (KWIC) search over the local Tatoeba English corpus (CWB / cqp).
#
#   scripts/corpus-search.sh <word> [n]                whole-word, case-insensitive, n hits (default 25)
#   scripts/corpus-search.sh --cql '<query>' [n]        raw CQL, e.g. '[word="run"] [word="into"]'
#   scripts/corpus-search.sh --count <word>             just the total number of matches
#   scripts/corpus-search.sh --sample <word> [n]        n matches picked uniformly at random from ALL
#                                                        matches (not just the first n in corpus order)
#   --sample composes with --cql: --sample --cql '...' [n]
#
# Context is the containing sentence. WIDTH env caps each side's shown chars (default 55).
#
# Why --sample: plain (non-sample) mode returns cqp's first n matches in corpus order, which is
# encoding/insertion order, not random — fine when total matches <= n (you're seeing all of them
# anyway) but a biased slice for a high-frequency word with far more matches than n. --sample uses
# gshuf (GNU coreutils; macOS lacks a builtin shuf) to pick n indices uniformly from the full match
# set so the sample isn't skewed toward however Tatoeba sentences happen to be ordered.
set -u  # cqp/grep exit non-zero on no matches; don't let that abort the script

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export CORPUS_REGISTRY="$REPO/data/tatoeba/cwb/registry"
CORPUS=TATOEBA_ENG
W="${WIDTH:-55}"

command -v cqp >/dev/null || { echo "cqp not found — brew install cwb3" >&2; exit 1; }
[ -f "$CORPUS_REGISTRY/tatoeba_eng" ] || { echo "corpus not encoded — see data/tatoeba/README.md" >&2; exit 1; }

mode=word
sample=0
while true; do
  case "${1:-}" in
    --sample) sample=1; shift ;;
    --cql)    mode=cql;   shift ;;
    --count)  mode=count; shift ;;
    *) break ;;
  esac
done
[ -n "${1:-}" ] || { grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

if [ "$sample" = 1 ] && [ "$mode" != count ]; then
  command -v gshuf >/dev/null || { echo "--sample needs gshuf — brew install coreutils" >&2; exit 1; }
fi

q="$1"; n="${2:-25}"
esc() { printf '%s' "$1" | sed 's/[".]/\\&/g'; }

if [ "$mode" = cql ]; then cql="$q"; else cql="[word=\"$(esc "$q")\"%c]"; fi

strip_prompt() { sed "s/${CORPUS}> //g"; }

count_of() {
  printf 'A = %s;\nsize A;\n' "$1" | cqp -r "$CORPUS_REGISTRY" -D "$CORPUS" 2>/dev/null \
    | strip_prompt | grep -oE '[0-9]+' | tail -1
}

if [ "$mode" = count ]; then
  count_of "$cql"
  exit 0
fi

if [ "$sample" = 1 ]; then
  total="$(count_of "$cql")"
  total="${total:-0}"
  if [ "$total" -gt "$n" ]; then
    cats="$(gshuf -i "0-$((total-1))" -n "$n" | sort -n | awk '{printf "cat A %s %s;\n", $1, $1}')"
    echo "sampled $n of $total total matches (uniform random)" >&2
  else
    cats="cat A 0 $((n-1));"
    [ "$total" -gt 0 ] && echo "showing all $total matches (<= requested $n, no sampling needed)" >&2
  fi
else
  cats="cat A 0 $((n-1));"
fi

printf 'set Context 1 s;\nset PrettyPrint off;\nshow -cpos;\nset LeftKWICDelim "\t";\nset RightKWICDelim "\t";\nA = %s;\n%s\n' \
  "$cql" "$cats" \
| cqp -r "$CORPUS_REGISTRY" -D "$CORPUS" 2>/dev/null \
| strip_prompt \
| sed -E 's/^[[:space:]]*[0-9]+:[[:space:]]*//' \
| awk -F'\t' -v w="$W" '
  NF>=3 {
    l=$1; m=$2; r=$3;
    gsub(/^ +| +$/,"",l); gsub(/^ +| +$/,"",m); gsub(/^ +| +$/,"",r);
    if (length(l) > w) l = "…" substr(l, length(l)-w+2);
    if (length(r) > w) r = substr(r, 1, w-1) "…";
    printf "%*s  [ %s ]  %s\n", w, l, m, r;
  }'
