---
status: accepted
deciders: Flash Hu
date: 2026-10-16
backlog: [US-063, US-060, C-011, C-031]
---

# 0029. The word rhyme is the last fallback for the stressed chunk

Technical Story: [US-063](../backlog/items/US-063-a-word-rhyme-from-the-stressed-vowel-to-the-end.md)

## Context and Problem Statement

US-063 adds a word rhyme: a common word with the same sound as the headword from the
stressed vowel to the end of the word (levee → heavy, durable → incurable, bulge →
indulge). The stressed chunk already has three ways to get an anchor: the closed chunk
(ADR-0025), the exact match and the one-chunk rhyme (US-046). The word rhyme needs a place
in that order. investigation-007 section 6 found a word-rhyme candidate for 227 of 316
words, so where it runs decides how many cards change.

## Decision Drivers

* Fewer words should stop with "no sound anchor found".
* Cards that get an anchor today should not change without a measurement behind it.
* US-060 depends on US-063 to give the words that it stops an anchor (ADR-0028).

## Considered Options

* Last fallback: only when the closed chunk, the exact match and the one-chunk rhyme give nothing
* Before the one-chunk rhyme: the word rhyme wins when both exist

## Decision Outcome

Chosen option: "Last fallback", because it gives an anchor to the words that stop
(bulge, durable, garage today; 13 of the 16 words that US-060 would stop, investigation-008
section 6) and changes no card that gets an anchor today. The other order was never
measured.

### Positive Consequences

* Stops on the 316-word set go from 7 to 4.
* With US-060 built after it, about 3 more words stop than today, not about 15.
* Every card that has a stressed-chunk anchor today keeps it.

### Negative Consequences

* A word that has a weak one-chunk rhyme keeps it, even when a word rhyme that sounds like
  the whole word exists (levee keeps its one-chunk result, not "heavy").
* A later item must measure the other order if Flash wants word rhymes to win more often.

## Pros and Cons of the Options

### Last fallback

* Good, because it only adds anchors; it replaces none.
* Good, because the numbers it gives are measured (investigation-007 and investigation-008).
* Bad, because it rarely runs before US-060 removes the weak one-chunk rhymes.

### Before the one-chunk rhyme

* Good, because more cards get an anchor that sounds like the whole word, as in Flash's own
  rows (levee → heavy, coaster → toaster).
* Bad, because many cards change, and nobody measured whether the change is better.

## Links

* Builds on [ADR-0025](0025-a-closed-stressed-chunk-shares-its-consonant-with-the-next-chunk.md) and [ADR-0028](0028-an-open-short-vowel-chunk-gets-no-rhyme-and-des-is-never-a-keyword.md)
* [investigation-007](../investigations/investigation-007-us-050-span-shift-contains-anchors.md), [investigation-008](../investigations/investigation-008-us-060-weak-rhyme-words.md)
