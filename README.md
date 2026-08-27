# nemo-words

Tools for finding example words for J. C. Wells' English Lexical Sets, backed
by a Kaikki-derived RP/GA IPA dictionary (`resources/data/en_US_RP_ipa.tsv`).

**Non-commercial project.** The RP pronunciation data is derived from the
[BEEP dictionary](https://www.speech.cs.cmu.edu/comfort/details1.html),
which is licensed for non-commercial research use only. Both this
repository and any distributed build (including the release jar below,
whose bundled `ga_rp.tsv` is derived from `beep_uk.dict`) are for
personal/research use, not commercial use — see
[ADR-0002](docs/decisions/0002-switch-cmudict-beep-primary-dictionary.md)
for the dictionary-selection background.

## Download a release

No Clojure CLI needed — just a JVM (Java 11+). Download the latest
`nemo-words.jar` from the
[Releases page](https://github.com/idisblueflash/nemo-words/releases), then
run any subcommand documented below directly:

```sh
java -jar nemo-words.jar ipa-lookup --word car
java -jar nemo-words.jar pick-example-words-by-ipa "ɜɹ"
```

The jar bundles `ga_rp.tsv` and `lexical-sets.edn`, so the read-only
subcommands (`word-freq`, `ipa-lookup`, `pick-example-words-by-ipa`) work
standalone from any directory — that's the release jar's full supported
surface. `build-set`, `populate-lexical-sets`, and `build-ga-rp-dict` write
to or read raw dict files not bundled in the jar; they're source-checkout
tools for maintaining this repo's own data, not supported for downloaded-jar
users (see [US-025](docs/user-stories/US-025.md) for details). Clone the
repo and use `clojure -M -m nemo-words.core <subcommand>` instead if you
need them.

To build the jar yourself from a source checkout:

```sh
clojure -T:build uberjar
# -> target/nemo-words.jar
```

## Setup: populate the initial Lexical Sets

`resources/lexical-sets.edn` — the keyword -> `{:rp :ga :words}` lookup table
consumed by `pick-example-words-by-ipa` — is a **local, regenerable build
artifact**, not checked into git (see `.gitignore`). A fresh checkout has no
`lexical-sets.edn` until you build it.

Bootstrap all 26 Wells sets in one shot:

```sh
clojure -M -m nemo-words.core populate-lexical-sets
```

This runs `build-set` ([US-004](docs/user-stories/US-004.md)) once per row of
`nemo-words.build-set/lexical-sets-table` (the seed data lifted from
[FEAT-001](docs/user-stories/FEAT-001.md)'s reference table), verifying every
seed word against the current dictionary and dropping any that no longer
match, then upserts/saves the result into `resources/lexical-sets.edn`. It
prints one summary line per set:

```
KIT        kept 0/6        dropped: ["ship" "sick" "bridge" "milk" "myth" "busy"]
DRESS      kept 4/6        dropped: ["neck" "shelf"]
...
BATH       kept 6/6
...
```

`kept`/`dropped` come straight from `build-set`'s dict verification — a
dropped word no longer resolves to that set's RP/GA pair in the current
dictionary (word missing from the dict entirely, or a real notation/data
quirk like `ɚ`/`ɝ` vs the decomposed vowel+`ɹ` sequence for the same rhotic
sound — see [US-015](docs/user-stories/US-015.md) for details). This is
expected, not a bug: re-run the command any time the dictionary changes to
re-verify and refresh the file.

Safe to re-run any time — every row is an idempotent upsert
([US-004](docs/user-stories/US-004.md)/[US-011](docs/user-stories/US-011.md)),
so re-running never duplicates entries or disturbs sets not in the table.

To (re)build or fix a single set instead of the whole table:

```sh
clojure -M -m nemo-words.core build-set <keyword> <rp> <ga> <word> [<word> ...]

# e.g.
clojure -M -m nemo-words.core build-set nurse ɜː ɜɹ hurt lurk urge burst jerk term
```

See [US-004](docs/user-stories/US-004.md) (single-set build) and
[US-015](docs/user-stories/US-015.md) (the CLI + the full 26-row seed table)
for the underlying design.

## Other CLI subcommands

- `word-freq [<word> ...] | --file <path>` — print `word\tfreq` TSV, using
  Google's Ngram Viewer API ([US-003](docs/user-stories/US-003.md)).
- `ipa-lookup --word <w> | --rp <ipa> | --ga <ipa> | --pair <rp> <ga> | --pair-substring <rp> <ga>`
  — query the dictionary, print `word\tRP\tGA` TSV ([US-001](docs/user-stories/US-001.md)).
- `pick-example-words-by-ipa <IPA query>` — search `lexical-sets.edn` by GA
  substring, print an EDN vector of matching sets ([US-005](docs/user-stories/US-005.md)).
  Requires `lexical-sets.edn` to exist — run `populate-lexical-sets` first.

## Tests

```sh
clojure -M:test
```
