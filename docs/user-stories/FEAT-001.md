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

The table above has already been corrected in three places against the real `en_US_RP_ipa.tsv` (word→GA→RP), the same way the seven rhotic rows were: the Obsidian source's notation doesn't always match what Kaikki actually stores, and [[US-004]]/[[US-006]] query the raw cell text, so a stale symbol here means a silent zero-match at build time, not just a cosmetic mismatch.

- **DRESS**: RP corrected from `e` to `ɛ` — real data (`step`, `neck`, `edge`, `friend`, `ready`) writes RP the same as GA, `ɛ`. Querying `/e/` would never match.
- **happY**: RP/GA corrected from `ɪ` to `i` — real data (`copy /ˈkɑpi/ /ˈkɒpi/`, `taxi`, `hockey`, `chelsea`, `sortie`) uses the same tense `i` FLEECE uses, never `ɪ`. Querying `/ɪ/` would both miss genuine happY words and false-positive on unrelated words with a stressed `ɪ` elsewhere (e.g. "committee").
- **lettER**: GA corrected from `ər` to `əɹ` (the general Kaikki-uses-narrow-`ɹ` fix), but this row has a second, unresolved issue: Kaikki alternates between the decomposed sequence `əɹ` (`paper /ˈpeɪ̯.pəɹ/`, `metre /ˈmiːtəɹ/`) and the single composed character `ɚ` (`calendar /ˈkæl.ən.dɚ/`, `stupor`, `succour`, `martyr`) for the *same* sound, inconsistently across words. A single substring query only catches half the set — build-set needs to query for both `əɹ` and `ɚ` (an OR, not yet specified anywhere) or it will systematically undercount lettER.

Also confirmed (not a notation bug, a genuine GA merger already known from [[US-012]]'s background): **THOUGHT** has an empty GA cell for most checked words (`taught`, `sauce`, `hawk`, `jaw` all have GA = `""`; only `broad` carries GA `ɔ`), same as CLOTH — this is real data collapse from the cot-caught-type merger, not something a table fix can recover.

That table is the seed data and the target shape for `lexical-sets.edn`: [[US-004]] builds each row above (keyword + RP + GA → \~60 ranked example words, replacing the table's hand-picked 5-7) from the real dictionary; [[US-006]] extends the table to GA combinations Wells' 24 keywords don't cover (e.g. dialects/mergers not in his scheme) by picking a new keyword and defining pair the same way. [[US-005]] is how a downstream AI agent then turns "I need words for the /ɜr/ sound" into a ready word list for composing a mnemonic story — the actual end-user-facing feature this backlog exists to build.

### Why Kaikki (Kikka)

"The real dictionary" above is [Kaikki (Wiktextract)](https://kaikki.org/dictionary/English), the source `en_US_RP_ipa.tsv` in [[US-001]] is extracted from. This surfaced as a concrete gap during mnemonic-card grooming — see `[[gnarly]]`, the case that exposed it — and got resolved against [[Open Sourced English Dictionary Grid]], which scores every candidate open dictionary (Cambridge, Kaikki, ipa-dict, CMUdict, WikiPron) on five criteria: has stress marks, covers both RP and GenAm, ships as a downloadable local dict (not just a live lookup site), and supports IPA→word search (needed for [[US-001]]'s substring queries). Kaikki is the only source that clears all four — Cambridge has no local dict, ipa-dict has different stressing style, WikiPron is US-only, CMUdict has no native IPA and no RP. The team had already downloaded and extracted the full Kaikki `.jsonl` (3.2 GB) before this comparison, which removed the one soft objection ("don't want to pull down a huge file") from consideration.

One consequence of that choice worth calling out explicitly, because it drives how [[US-001]]'s substring-match ACs read: Kaikki's GA transcriptions for r-colored vowels use narrow-IPA notation — the vowel followed directly by `ɹ`, no length mark (e.g. `/ɑɹ/`), not the Cambridge-dictionary convention (`/ɑːr/`). Confirmed against the actual `en_US_RP_ipa.tsv`: `car\t/kɑɹ/\t/kɑː/` and `gnarly\t/ˈnɑɹli/\t/ˈnɑːli/` — GA is `/ˈnɑɹli/`, not `/ˈnɑːrli/`. [[US-001]]'s lookup is a raw substring match against Kaikki's cell text as stored, so callers must query in Kaikki's actual style (`/ɑɹ/`, narrow IPA with `ɹ`), not the Cambridge `/ɑːr/` form — this is why the AC fixtures in [[US-001]] use `/ɑɹ/`, not `/ɑːr/`.

The four-source cross-reference tool in `src/nemo_words/ipa.clj` (ipa-dict, WikiPron, CMUdict, ipa-dict-uk) is archived, not part of the lookup path: it did its job during source selection — surfacing the `gnarly` disagreement (`/ˈnɑɹli/` vs `/nˈɑːli/` vs `/nɑɹli/` vs `/nˈɑɹli/`) that started this whole comparison, and confirming ipa-dict's `en_US`/`en_UK` files could *not* be merged as a simpler alternative to Kaikki (the two files place the stress mark differently — US marks the whole stressed syllable from its onset, UK marks only the stressed vowel, see `[[stressing logic different between en_US and en_UK in ipa-dict]]` — so pairing them into one RP/GA row per word would silently mix two incompatible stress conventions). That comparison is what settled on Kaikki as *the* dictionary (its `genam`/`rp` columns share one stressing style by construction). Once that decision was made, the other four sources were archived — [[US-001]] onward reads only Kaikki, with no ongoing cross-reference step in the pipeline.

## Must have

- [ ] [[US-001]] Support IPA search for both RP and GA
- [ ] [[US-003]] CLI for word frequency with Google's API
- [ ] [[US-004]] Prepare the custom example words
- [ ] [[US-005]] Use the Lexical Sets
- [ ] [[US-010]] Generic top-N ranking filter
- [ ] [[US-011]] Upsert a set into lexical-sets.edn
- [ ] [[US-012]] Filter out onset-r false positives from rhotic lexical-set lookups

## Should have

- [ ] [[US-006]] Extend the Lexical Sets
  - [ ] [[US-007]] Find the dominant RP+GA pairing for a missing GA combination
  - [ ] [[US-008]] Select and rank the example words for a new set — superseded by [[US-010]]

## Could have

- [x] [[US-002]] PoC on Google Books Ngram Views API — Done
- [ ] [[US-009]] Pick the representative keyword for a new set

## Won't have

*(none yet)*

## Ordering

Every leaf story is a pure (or thinly-impure) Clojure function with a frozen data contract, so — once the shapes below are agreed — all of them can be built and unit-tested in parallel on plain maps/vectors, with no dependency on each other's implementation and no subprocess involved. Only [[US-001]], [[US-003]] and [[US-005]] also get a thin CLI wrapper, because they have real external consumers (an AI agent, ad hoc shell use). [[US-004]] and [[US-006]] are the two composition stories, wiring the finished functions together in-process.

```
Parallel functions (independently unit-testable on Clojure data):

  [[US-001]] ipa/lookup-rows      dict + opts      ->  [{:word :rp :ga}]
  [[US-002]] -> [[US-003]] freq/annotate-freq  rows ->  rows + :freq
  [[US-007]] pairs/dominant-pair  triples          ->  [rp ga]
  [[US-009]] keyword/pick-keyword rows             ->  keyword
  [[US-010]] rank/top-n           rows + score + n  ->  top-n rows
  [[US-011]] sets/upsert + save!  sets + kw + rows  ->  lexical-sets.edn
  [[US-012]] rime/filter-coda     rows + key + sound ->  rows (rhotic sets only)

                    │  (all seven land)
                    ▼
  [[US-004]] build-set  = lookup-rows -> [filter-coda, rhotic sets only] -> annotate-freq
                           -> top-n -> upsert -> save!
                    │
                    ▼
  [[US-005]] pick-example-words-by-ipa  (reads lexical-sets.edn; thin CLI)
                    │
                    ▼
  [[US-006]] extend-set = lookup-rows -> dominant-pair -> lookup-rows
                           -> [filter-coda, rhotic sets only] -> annotate-freq
                           -> top-n -> pick-keyword -> upsert -> save!
```

- **Parallel:** [[US-001]], [[US-002]]→[[US-003]], [[US-007]], [[US-009]], [[US-010]], [[US-011]], [[US-012]] — seven independent functions, buildable in any order or concurrently.
- **Sequential:** [[US-004]] needs US-001/US-003/US-010/US-011/US-012 done; [[US-005]] needs US-004's output file; [[US-006]] needs all seven functions plus US-004's composition as a template. [[US-008]] is folded into [[US-010]] and needs no separate work.

