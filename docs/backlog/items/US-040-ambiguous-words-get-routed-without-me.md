---
id: US-040
type: story
parent: E01
status: idea
---
# US-040 Ambiguous words get routed without me

As Flash, I want a word the classifier can't place to be routed by a judgment call, so that it still ends up as a story card or on the word-part path instead of stopping.

**Scope (from US-028's split):** Jev answers "is this word built from classical Greek/Latin morphemes or an INN stem?" against word-workflow.md's routing rule.

**Widened after US-028's QA:** not just the classifier's *ambiguous* verdicts — Jev also second-checks its *general* and *medical* verdicts, since the misses US-028's QA found came back as clear verdicts from a hand-kept word list:
- classical/INN words the list doesn't know, routed general and carded: ibuprofen, ketoprofen, naproxen (-profen/-proxen), conduct (con- + duct);
- everyday words the list over-matches, stopped as word-part: trial, pathway, period, roster, episode, recurrent, adherence, substance, premise, trivial, exotic, apparently, apprenticeship.

**Before relying on it:** measure Jev's routing accuracy on a labelled set (the words above plus the existing card file's whole-word rows and word-part rows), the way SP-037 measures story picks — a spike or this story's first AC. Open cost: one network call per word, where routing is offline today.
