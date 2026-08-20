# User Stories — Get Example Words

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
