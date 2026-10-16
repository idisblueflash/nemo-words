---
status: accepted
deciders: Flash Hu
date: 2026-10-16
backlog: [US-063, US-059, C-031]
---

# 0030. A word rhyme keeps one keyword line per chunk

Technical Story: [US-063](../backlog/items/US-063-a-word-rhyme-from-the-stressed-vowel-to-the-end.md)

## Context and Problem Statement

`find-keywords` prints one line per chunk, and `log-card` and other steps match the lines
to the chunks by position. A word rhyme covers the stressed chunk and every chunk after it
(durable /ˈdʊ.ɹə.bəl/ → "incurable" covers three chunks). One keyword line per chunk can't
say that as it is, so the output format must change in some way.

## Decision Drivers

* The steps after `find-keywords` should change as little as possible.
* The card's IPA line and the log's syllables must stay the same.
* US-059 (one word for two chunks) has the same problem later.

## Considered Options

* Same lines, new tag: the stressed chunk's line is `ipa\tkeyword\tfreq\tword-rime`, and each later chunk's line is `ipa\t-`
* One merged line: the covered chunks become one line with their IPA joined

## Decision Outcome

Chosen option: "Same lines, new tag", because the number and order of the lines stay the
same (as with the closed chunk, ADR-0025), so no step that matches lines to chunks by
position has to change. `check-story` gets the sound to compare by joining the stressed
chunk's rime with the later chunks' IPA, which are still on their lines.

### Positive Consequences

* `log-card`, `chunk` and the IPA line need no change to how they count chunks.
* The new tag `word-rime` is read the same way as `rime` (US-046).

### Negative Consequences

* A covered chunk looks the same as a chunk with no anchor (`ipa\t-`); a step must look at
  the line above to know that it is covered.
* A later chunk that had its own exact keyword loses it when a word rhyme covers it.

## Pros and Cons of the Options

### Same lines, new tag

* Good, because the line count never changes.
* Bad, because "covered" is not written on the covered lines.

### One merged line

* Good, because one line holds the whole sound that the keyword matches.
* Bad, because the line count changes, so `log-card` and every step that matches lines to
  chunks by position must change.

## Links

* Follows the line rule of [ADR-0025](0025-a-closed-stressed-chunk-shares-its-consonant-with-the-next-chunk.md)
* Decided in the same refine as [ADR-0029](0029-the-word-rhyme-is-the-last-fallback-for-the-stressed-chunk.md)
