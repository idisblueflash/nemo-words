# FEAT-001. Get Example Words

## Background
J. C. Wells' [[Accents in English|*Accents in English* (1982)]] groups English words into 24 **Lexical Sets** — KIT, DRESS, TRAP, ... commA — each keyed by a representative keyword and defined by one vowel realization in RP (Received Pronunciation, standard British) and a corresponding realization in GA (General American). The full reference table, with a handful of example words per set, lives in the Obsidian vault at `/Users/husongtao/Projects/obsidian-values/nemo-english/notes/Lexical Sets Table.md`:

| Keyword | RP  | GA  | Example words |
| ------- | --- | --- | -------------- |
| KIT     | ɪ   | ɪ   | ship, sick, bridge, milk, myth, busy |
| DRESS   | e   | ɛ   | step, neck, edge, shelf, friend, ready |
| TRAP    | æ   | æ   | tap, back, badge, scalp, hand, cancel |
| LOT     | ɒ   | ɑ   | stop, sock, dodge, romp, possible, quality |
| STRUT   | ʌ   | ʌ   | cup, suck, budge, pulse, trunk, blood |
| FOOT    | ʊ   | ʊ   | put, bush, full, good, look, wolf |
| BATH    | ɑː  | æ   | staff, brass, ask, dance, sample, calf |
| CLOTH   | ɒ   | ɔ   | cough, broth, cross, long, Boston |
| NURSE   | ɜː  | ɜr  | hurt, lurk, urge, burst, jerk, term |
| FLEECE  | iː  | i   | creep, speak, leave, feel, key, people |
| FACE    | eɪ  | eɪ  | tape, cake, raid, veil, steak, day |
| PALM    | ɑː  | ɑ   | psalm, father, bra, spa, lager |
| THOUGHT | ɔː  | ɔ   | taught, sauce, hawk, jaw, broad |
| GOAT    | əʊ  | oʊ  | soap, joke, home, know, so, roll |
| GOOSE   | uː  | u   | loop, shoot, tomb, mute, huge, view |
| PRICE   | aɪ  | aɪ  | ripe, write, arrive, high, try, buy |
| CHOICE  | ɔɪ  | ɔɪ  | adroit, noise, join, toy, royal |
| MOUTH   | aʊ  | aʊ  | out, loud, house, count, crowd, cow |
| NEAR    | ɪə  | ɪr  | beer, sincere, fear, beard, serum |
| SQUARE  | ɛə  | ɛr  | care, fair, pear, where, scarce, vary |
| START   | ɑː  | ɑr  | far, sharp, bark, carve, farm, heart |
| NORTH   | ɔː  | ɔr  | for, war, short, scorch, born, warm |
| FORCE   | ɔː  | or  | four, wore, sport, porch, borne, story |
| CURE    | ʊə  | ʊr  | poor, tourist, pure, plural, jury |
| happY   | ɪ   | ɪ   | copy, scampi, taxi, sortie, committee, hockey, Chelsea |
| lettER  | ə   | ər  | paper, metre, calendar, stupor, succo(u)r, martyr |
| commA   | ə   | ə   | catalpa, quota, vodka |

That table is the seed data and the target shape for `lexical-sets.edn`: [[US-004]] builds each row above (keyword + RP + GA → ~60 ranked example words, replacing the table's hand-picked 5-7) from the real dictionary; [[US-006]] extends the table to GA combinations Wells' 24 keywords don't cover (e.g. dialects/mergers not in his scheme) by picking a new keyword and defining pair the same way. [[US-005]] is how a downstream AI agent then turns "I need words for the /ɜr/ sound" into a ready word list for composing a mnemonic story — the actual end-user-facing feature this backlog exists to build.

## Must have
- [ ] [[US-001]] Support IPA search for both RP and GA
- [ ] [[US-003]] CLI for word frequency with Google's API
- [ ] [[US-004]] Prepare the custom example words
- [ ] [[US-005]] Use the Lexical Sets
- [ ] [[US-010]] Generic top-N ranking filter
- [ ] [[US-011]] Upsert a set into lexical-sets.edn

## Should have
- [ ] [[US-006]] Extend the Lexical Sets
	- [ ] [[US-007]] Find the dominant RP+GA pairing for a missing GA combination
	- [ ] [[US-008]] Select and rank the example words for a new set — superseded by [[US-010]]

## Could have
- [x] [[US-002]] PoC on Google Books Ngram Views API — Done
- [ ] [[US-009]] Pick the representative keyword for a new set

## Won't have
_(none yet)_

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

                    │  (all six land)
                    ▼
  [[US-004]] build-set  = lookup-rows -> annotate-freq -> top-n -> upsert -> save!
                    │
                    ▼
  [[US-005]] pick-example-words-by-ipa  (reads lexical-sets.edn; thin CLI)
                    │
                    ▼
  [[US-006]] extend-set = lookup-rows -> dominant-pair -> lookup-rows -> annotate-freq
                           -> top-n -> pick-keyword -> upsert -> save!
```

- **Parallel:** [[US-001]], [[US-002]]→[[US-003]], [[US-007]], [[US-009]], [[US-010]], [[US-011]] — six independent functions, buildable in any order or concurrently.
- **Sequential:** [[US-004]] needs US-001/US-003/US-010/US-011 done; [[US-005]] needs US-004's output file; [[US-006]] needs all six functions plus US-004's composition as a template. [[US-008]] is folded into [[US-010]] and needs no separate work.
