# FEAT-001. Get Example Words

## Background

J. C. Wells' [[Accents in English|*Accents in English* (1982)]] groups English words into 24 **Lexical Sets** — KIT, DRESS, TRAP, ... commA — each keyed by a representative keyword and defined by one vowel realization in RP (Received Pronunciation, standard British) and a corresponding realization in GA (General American). The full reference table, with a handful of example words per set, lives in the Obsidian vault at `/Users/husongtao/Projects/obsidian-values/nemo-english/notes/Lexical Sets Table.md`:

| Keyword | RP | GA | Example words                                          |
| ------- | -- | -- | ------------------------------------------------------ |
| KIT     | ɪ  | ɪ  | ship, sick, bridge, milk, myth, busy                   |
| DRESS   | ɛ  | ɛ  | step, neck, edge, shelf, friend, ready                 |
| TRAP    | æ  | æ  | tap, back, badge, scalp, hand, cancel                  |
| LOT     | ɒ  | ɑ  | stop, sock, dodge, romp, possible, quality             |
| STRUT   | ʌ  | ʌ  | cup, suck, budge, pulse, trunk, blood                  |
| FOOT    | ʊ  | ʊ  | put, bush, full, good, look, wolf                      |
| BATH    | ɑː | æ  | staff, brass, ask, dance, sample, calf                 |
| CLOTH   | ɒ  | ɔ  | cough, broth, cross, long, Boston                      |
| NURSE   | ɜː | ɜr | hurt, lurk, urge, burst, jerk, term                    |
| FLEECE  | iː | i  | creep, speak, leave, feel, key, people                 |
| FACE    | eɪ | eɪ | tape, cake, raid, veil, steak, day                     |
| PALM    | ɑː | ɑ  | psalm, father, bra, spa, lager                         |
| THOUGHT | ɔː | ɔ  | taught, sauce, hawk, jaw, broad                        |
| GOAT    | əʊ | oʊ | soap, joke, home, know, so, roll                       |
| GOOSE   | uː | u  | loop, shoot, tomb, mute, huge, view                    |
| PRICE   | aɪ | aɪ | ripe, write, arrive, high, try, buy                    |
| CHOICE  | ɔɪ | ɔɪ | adroit, noise, join, toy, royal                        |
| MOUTH   | aʊ | aʊ | out, loud, house, count, crowd, cow                    |
| NEAR    | ɪə | ɪr | beer, sincere, fear, beard, serum                      |
| SQUARE  | ɛə | ɛr | care, fair, pear, where, scarce, vary                  |
| START   | ɑː | ɑr | far, sharp, bark, carve, farm, heart                   |
| NORTH   | ɔː | ɔr | for, war, short, scorch, born, warm                    |
| FORCE   | ɔː | or | four, wore, sport, porch, borne, story                 |
| CURE    | ʊə | ʊr | poor, tourist, pure, plural, jury                      |
| happY   | i  | i  | copy, scampi, taxi, sortie, committee, hockey, Chelsea |
| lettER  | ə  | əɹ | paper, metre, calendar, stupor, succo(u)r, martyr      |
| commA   | ə  | ə  | catalpa, quota, vodka                                  |

The table above has already been corrected in three places against the real `en_US_RP_ipa.tsv` (word→GA→RP), the same way the seven rhotic rows were: the Obsidian source's notation doesn't always match what Kaikki actually stores, and [US-004](US-004.md)/[US-006](US-006.md) query the raw cell text, so a stale symbol here means a silent zero-match at build time, not just a cosmetic mismatch.

- **DRESS**: RP corrected from `e` to `ɛ` — real data (`step`, `neck`, `edge`, `friend`, `ready`) writes RP the same as GA, `ɛ`. Querying `/e/` would never match.
- **happY**: RP/GA corrected from `ɪ` to `i` — real data (`copy /ˈkɑpi/ /ˈkɒpi/`, `taxi`, `hockey`, `chelsea`, `sortie`) uses the same tense `i` FLEECE uses, never `ɪ`. Querying `/ɪ/` would both miss genuine happY words and false-positive on unrelated words with a stressed `ɪ` elsewhere (e.g. "committee").
- **lettER**: GA corrected from `ər` to `əɹ` (the general Kaikki-uses-narrow-`ɹ` fix), but this row has a second, unresolved issue: Kaikki alternates between the decomposed sequence `əɹ` (`paper /ˈpeɪ̯.pəɹ/`, `metre /ˈmiːtəɹ/`) and the single composed character `ɚ` (`calendar /ˈkæl.ən.dɚ/`, `stupor`, `succour`, `martyr`) for the *same* sound, inconsistently across words. A single substring query only catches half the set — build-set needs to query for both `əɹ` and `ɚ` (an OR, not yet specified anywhere) or it will systematically undercount lettER.

Also confirmed (not a notation bug, a genuine GA merger already known from [US-012](US-012.md)'s background): **THOUGHT** has an empty GA cell for most checked words (`taught`, `sauce`, `hawk`, `jaw` all have GA = `""`; only `broad` carries GA `ɔ`), same as CLOTH — this is real data collapse from the cot-caught-type merger, not something a table fix can recover.

That table is the seed data for `lexical-sets.edn`: [US-004](US-004.md) registers each row above (keyword + RP + GA + its hand-picked words) into `lexical-sets.edn` as-is, only re-verifying each seed word still matches that pair in the real dictionary (dropping any that don't); [US-006](US-006.md) extends the table to GA combinations Wells' 24 keywords don't cover (e.g. dialects/mergers not in his scheme) by picking a new keyword and defining pair the same way. `lexical-sets.edn`'s word list is a human-facing quick overview only, never searched programmatically — [US-014](US-014.md) is where the real per-target-word example search happens, hitting the dictionary fresh (unbounded, unsaved) and scoring candidates by how well their onset/coda echo the target word's own syllable, the actual end-user-facing feature this backlog exists to build. [US-005](US-005.md) is a simpler adjacent lookup: turning "I need words for the /ɜr/ sound" into `lexical-sets.edn`'s overview list for a downstream AI agent.

### Why Kaikki (Kikka)

**Superseded**: this section is kept as the historical record of why
Kaikki was originally chosen — see [0002-switch-cmudict-beep-primary-dictionary](../decisions/0002-switch-cmudict-beep-primary-dictionary.md)
for why the project switched to CMUdict (GA) + BEEP (RP) instead, and
[FEAT-002](FEAT-002.md) for the feature that rebuilds the dictionary file this
section describes. `en_US_RP_ipa.tsv` below no longer exists once
[FEAT-002](FEAT-002.md) ships — it's replaced by `resources/data/ga_rp.tsv`, in the
raw ARPABET/MRPA-token format [0003-match-nucleus-against-arpabet-mrpa-tokens](../decisions/0003-match-nucleus-against-arpabet-mrpa-tokens.md)
decided on, not Kaikki's native IPA.

"The real dictionary" above is [Kaikki (Wiktextract)](https://kaikki.org/dictionary/English), the source `en_US_RP_ipa.tsv` in [US-001](US-001.md) is extracted from. This surfaced as a concrete gap during mnemonic-card grooming — see `[[gnarly]]`, the case that exposed it — and got resolved against [[Open Sourced English Dictionary Grid]], which scores every candidate open dictionary (Cambridge, Kaikki, ipa-dict, CMUdict, WikiPron) on five criteria: has stress marks, covers both RP and GenAm, ships as a downloadable local dict (not just a live lookup site), and supports IPA→word search (needed for [US-001](US-001.md)'s substring queries). Kaikki is the only source that clears all four — Cambridge has no local dict, ipa-dict has different stressing style, WikiPron is US-only, CMUdict has no native IPA and no RP. The team had already downloaded and extracted the full Kaikki `.jsonl` (3.2 GB) before this comparison, which removed the one soft objection ("don't want to pull down a huge file") from consideration.

One consequence of that choice worth calling out explicitly, because it drives how [US-001](US-001.md)'s substring-match ACs read: Kaikki's GA transcriptions for r-colored vowels use narrow-IPA notation — the vowel followed directly by `ɹ`, no length mark (e.g. `/ɑɹ/`), not the Cambridge-dictionary convention (`/ɑːr/`). Confirmed against the actual `en_US_RP_ipa.tsv`: `car\t/kɑɹ/\t/kɑː/` and `gnarly\t/ˈnɑɹli/\t/ˈnɑːli/` — GA is `/ˈnɑɹli/`, not `/ˈnɑːrli/`. [US-001](US-001.md)'s lookup is a raw substring match against Kaikki's cell text as stored, so callers must query in Kaikki's actual style (`/ɑɹ/`, narrow IPA with `ɹ`), not the Cambridge `/ɑːr/` form — this is why the AC fixtures in [US-001](US-001.md) use `/ɑɹ/`, not `/ɑːr/`.

The four-source cross-reference tool in `src/nemo_words/ipa.clj` (ipa-dict, WikiPron, CMUdict, ipa-dict-uk) is archived, not part of the lookup path: it did its job during source selection — surfacing the `gnarly` disagreement (`/ˈnɑɹli/` vs `/nˈɑːli/` vs `/nɑɹli/` vs `/nˈɑɹli/`) that started this whole comparison, and confirming ipa-dict's `en_US`/`en_UK` files could *not* be merged as a simpler alternative to Kaikki (the two files place the stress mark differently — US marks the whole stressed syllable from its onset, UK marks only the stressed vowel, see `[[stressing logic different between en_US and en_UK in ipa-dict]]` — so pairing them into one RP/GA row per word would silently mix two incompatible stress conventions). That comparison is what settled on Kaikki as *the* dictionary (its `genam`/`rp` columns share one stressing style by construction). Once that decision was made, the other four sources were archived — [US-001](US-001.md) onward reads only Kaikki, with no ongoing cross-reference step in the pipeline.

## Must have

- [x] [US-001](US-001.md) Support IPA search for both RP and GA
- [x] [US-003](US-003.md) CLI for word frequency with Google's API
- [x] [US-004](US-004.md) Prepare the custom example words
- [x] [US-005](US-005.md) Use the Lexical Sets
- [x] [US-010](US-010.md) Generic top-N ranking filter
- [x] [US-011](US-011.md) Upsert a set into lexical-sets.edn
- [x] [US-012](US-012.md) Filter out onset-r false positives from rhotic lexical-set lookups
- [x] [US-015](US-015.md) CLI to populate the initial Lexical Sets
- [x] [US-016](US-016.md) A better kaikki IPA dictionary extractor
- [ ] [FEAT-002](FEAT-002.md) Build the CMUdict (GA) + BEEP (RP) pronunciation dictionary (own feature — see FEAT-002)

## Should have

- [x] [US-006](US-006.md) Extend the Lexical Sets
  - [x] [US-007](US-007.md) Find the dominant RP+GA pairing for a missing GA combination
    - [x] [US-013](US-013.md) Extract the RP+GA nucleus fragment for one row
  - [ ] [US-008](US-008.md) Select and rank the example words for a new set — superseded by [US-010](US-010.md)
- [x] [US-014](US-014.md) Find the best-matched example word for a target word's syllable

## Could have

- [x] [US-002](US-002.md) PoC on Google Books Ngram Views API — Done
- [x] [US-009](US-009.md) Pick the representative keyword for a new set

## Won't have

*(none yet)*

## Ordering

Every leaf story is a pure (or thinly-impure) Clojure function with a frozen data contract, so — once the shapes below are agreed — all of them can be built and unit-tested in parallel on plain maps/vectors, with no dependency on each other's implementation and no subprocess involved. Only [US-001](US-001.md), [US-003](US-003.md) and [US-005](US-005.md) also get a thin CLI wrapper, because they have real external consumers (an AI agent, ad hoc shell use). [US-004](US-004.md) and [US-006](US-006.md) are the two composition stories, wiring the finished functions together in-process.

```
Parallel functions (independently unit-testable on Clojure data):

  :done [US-001](US-001.md) ipa/lookup-rows      dict + opts      ->  [{:word :rp :ga}]
  :done [US-002](US-002.md) -> [US-003](US-003.md) freq/annotate-freq  rows ->  rows + :freq   (used by [US-006](US-006.md) only)
  :done [US-013](US-013.md) pairs/extract-nucleus rp + ga + target-ga -> [rp-nucleus ga-nucleus] | nil
  :done [US-014](US-014.md)'s pairs/extract-syllable    rp + ga + target-ga -> {:onset :nucleus :coda} | nil  (sibling of extract-nucleus)
  :done [US-007](US-007.md) pairs/dominant-pair  triples + target-ga  ->  [rp-nucleus ga-nucleus]
  :done [US-009](US-009.md) keyword/pick-keyword rows             ->  keyword
  :done [US-010](US-010.md) rank/top-n           rows + score + n  ->  top-n rows   (used by [US-006](US-006.md) only)
  :done [US-011](US-011.md) sets/upsert + save!  sets + kw + rows  ->  lexical-sets.edn
  :done [US-012](US-012.md) rime/filter-coda     rows + key + sound ->  rows (rhotic sets only)

                    │
                    ▼
  :done [US-004](US-004.md) build-set  = [seed row: keyword, rp, ga, words] -> verify each word against dict -> upsert -> save!
                    │                                             (registers lexical-sets.edn's human-facing overview only)
                    ▼
  :done [US-005](US-005.md) pick-example-words-by-ipa  (reads lexical-sets.edn; thin CLI)

  :done [US-006](US-006.md) extend-set = lookup-rows -> dominant-pair [uses extract-nucleus] -> lookup-rows
                           -> [filter-coda, rhotic sets only] -> annotate-freq
                           -> top-n -> pick-keyword -> upsert -> save!

  [US-014](US-014.md) best-candidates = lookup-rows [target word's own row] -> extract-syllable
                           -> lookup-rows [full pair pool, unbounded, unsaved] -> extract-syllable per row
                           -> match/score -> sort by :score desc
                           (never touches lexical-sets.edn; independent of US-004/US-005/US-006)
```

- **Parallel:** [US-001](US-001.md), [US-002](US-002.md)→[US-003](US-003.md), [US-013](US-013.md)→[US-007](US-007.md), [US-009](US-009.md), [US-010](US-010.md), [US-011](US-011.md), [US-012](US-012.md), [US-014](US-014.md)'s `extract-syllable`/`score` — independent functions, buildable in any order or concurrently ([US-007](US-007.md) composes [US-013](US-013.md) in-process but both are still unit-testable on plain data ahead of [US-006](US-006.md)).
- **Sequential:** [US-004](US-004.md) just needs [US-001](US-001.md) (to verify seed words) and [US-011](US-011.md); [US-005](US-005.md) needs [US-004](US-004.md)'s output file; [US-006](US-006.md) needs US-001/US-003/US-007/US-009/US-010/US-011/US-012 plus [US-004](US-004.md)'s composition as a template; [US-014](US-014.md) needs [US-001](US-001.md) and its own `extract-syllable`/`score`, nothing else — it doesn't depend on [US-004](US-004.md) or [US-006](US-006.md) at all. [US-008](US-008.md) is folded into [US-010](US-010.md) and needs no separate work.

