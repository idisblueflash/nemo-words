---
status: accepted
deciders: Flash Hu
date: 2026-10-15
backlog: [US-060, US-063, C-011, C-046]
---

# 0028. An open short-vowel chunk gets no rhyme, and des is never a keyword

Technical Story: [US-060](../backlog/items/US-060-the-rhyme-rule-refuses-ye-yeah-des-and-huh.md), [investigation-008](../investigations/investigation-008-us-060-weak-rhyme-words.md)

## Context and Problem Statement

After US-050, 30 stressed chunks in the 316-word set still get the rhyme des, yeah, ye or
huh. Each one is a stressed chunk whose rime is one short vowel /ɪ ɛ æ ʌ ʊ/ and whose
closed chunk has no keyword. These words can't carry a picture. Refusing only those four
gives no picturable rhyme in their place: 20 chunks get no anchor and 10 get "ke" or "ca".
Only 7 rhyme words reach the 5e-7 frequency limit for such a rime (des, ye, ke, yeah, huh,
ca, sta), and none is picturable. Separately, "des" is the exact keyword of an unstressed
/dɪ/ chunk in 7 words (dismiss, descendant), so their stories must contain "des".
Refusing these words makes more words stop with "no sound anchor found": from 7 to 22.

## Decision Drivers

* A keyword must carry a picture, or the story can't use it.
* A rule should cover the whole group, not leave its next member (ke, ca) in place.
* Fewer words should stop with "no sound anchor found".

## Considered Options

* Rule on the rime: an open short-vowel chunk gets no rhyme
* A list of 7 refused words (des, ye, yeah, huh, ke, ca, sta)
* A list of 4 refused words (des, ye, yeah, huh), as the story's title says

## Decision Outcome

Chosen option: "Rule on the rime", because no word with a lone short-vowel rime is
picturable at any frequency (27 such words in the dictionary), so the rule states the real
cause and also covers words a list would miss. Flash also chose, on 2026-10-15:

* "des" is never a keyword of any kind (exact, closed or rhyme), not only as a rhyme. On
  its own this adds 0 stops; with the rhyme rule it adds 1 (dismissal).
* US-060 depends on US-063 (a word rhyme from the stressed vowel to the end), not built
  alone now and not merged into US-063. With US-063, about 3 more words stop than today
  (curriculum, prevalence, vigilance), not about 15.

### Positive Consequences

* No card is built on des, ye, yeah, huh, ke, ca or sta.
* The rule reuses `SHORT_VOWELS` from `scripts/lib/closed-chunk.js`, the same vowel set as
  the closed chunk (ADR-0025).
* Other chunks keep the keyword they get today.

### Negative Consequences

* US-060 can't be built until US-063 is ready; it stays `refined` until then.
* Built alone, it would make about 15 more words stop.
* Weak exact and closed keywords (gen, dev, sen, co, de, ka, eh) are not covered; they are a
  known gap.
* Old cards and log rows built on these words do not change.

## Pros and Cons of the Options

### Rule on the rime

* Good, because it covers all 7 weak words and any new ones from a new dictionary.
* Good, because it uses a vowel set the code already has.
* Bad, because it refuses a whole class of rimes, with no exception for a good word.

### A list of 7 refused words

* Good, because it has the same effect as the rule on today's data.
* Bad, because a new weak word (another dictionary or frequency data) slips through.

### A list of 4 refused words

* Good, because it matches the story's title.
* Bad, because 10 chunks then get "ke" or "ca", which are no easier to picture.

## Links

* Builds on [ADR-0025](0025-a-closed-stressed-chunk-shares-its-consonant-with-the-next-chunk.md)
* [investigation-008](../investigations/investigation-008-us-060-weak-rhyme-words.md)
