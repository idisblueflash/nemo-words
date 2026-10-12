---
id: US-040
type: story
parent: E01
status: in-progress
---
# US-040 Ambiguous words get routed without me

As Flash, I want a word the classifier can't place to be routed by a judgment call, so that it still ends up as a story card or on the word-part path instead of stopping.

**Scope (from US-028's split):** Jev answers "is this word built from classical Greek/Latin morphemes or an INN stem?" against word-workflow.md's routing rule.

**Widened after US-028's QA:** not just the classifier's *ambiguous* verdicts — Jev also second-checks its *general* and *medical* verdicts, since the misses US-028's QA found came back as clear verdicts from a hand-kept word list:
- classical/INN words the list doesn't know, routed general and carded: ibuprofen, ketoprofen, naproxen (-profen/-proxen), conduct (con- + duct);
- everyday words the list over-matches, stopped as word-part: trial, pathway, period, roster, episode, recurrent, adherence, substance, premise, trivial, exotic, apparently, apprenticeship.

**Before relying on it:** measure Jev's routing accuracy on a labelled set (the words above plus the existing card file's whole-word rows and word-part rows), the way SP-037 measures story picks — a spike or this story's first AC. Open cost: one network call per word, where routing is offline today.

## Acceptance criteria

```gherkin
Given  a word the classifier calls ambiguous, which is in fact plain English (e.g. wary)
  - When  Flash runs the one-word command with that word
    - Then  a story card is made the same way as for any general-English word
    - And   the run report says the route was a judgment call and how confident it was
```

```gherkin
Given  a word the classifier calls ambiguous, which is in fact built from classical morphemes
  - When  Flash runs the one-word command with that word
    - Then  no card is made
    - And   the command says the word belongs to the word-part path (_etta_mology), and that this was a judgment call
```

```gherkin
Given  a word the classifier calls medical, or finds no word-part match for
  - When  Flash runs the one-word command with that word
    - Then  it is routed the same way as before, with no judgment call
```

```gherkin
Given  the judgment call is too unsure to route an ambiguous word
  - When  Flash runs the one-word command with that word
    - Then  no card is made
    - And   the command says the word couldn't be routed automatically and shows the confidence
```

```gherkin
Given  the judgment service is unavailable
  - When  Flash runs the one-word command with an ambiguous word
    - Then  no card is made and nothing is written
    - And   the command says routing failed because the judgment service was down, and that it can be re-run
```

## Logic sketch
- **Approach:** a new Jev step `judge-route` runs right after `route` in `dags/card.yaml`; its stdout replaces `route`'s as the route that later steps read. `route` no longer stops on an ambiguous verdict: it prints `ambiguous\t<matched parts>` and exits 0. Any other route line passes through `judge-route` unchanged, with no Jev call.
- **Entities** (names shared with US-028):
  - Word.route: general | word-part | ambiguous (unchanged); new routedBy: classifier | judgment
  - RouteJudgment: word, matchedParts (the weak suffixes matched), pWordPart, verdict (general | word-part | unsure)
- **States:** routed(ambiguous) → judged → routed(general) | stopped(word-part) | stopped(unsure); a failed Jev call ends the run as failed (exit 2), not stopped.
- **Contract:** `judge-route <route-file>`
  - not `ambiguous` → prints the route line unchanged, exit 0, no Jev call.
  - judged general → prints `general`, exit 0; stderr note for the run report, e.g. `route: judgment call → general (p word-part 0.12)`.
  - judged word-part → exit 1, `word-part: <word> belongs to the word-part path (_etta_mology) — judgment call, p 0.84`.
  - unsure → exit 1, `ambiguous: <word> couldn't be routed automatically — judgment call unsure, p 0.55`.
  - Jev fails (not configured, unreachable, error, unusable answer) → exit 2, stderr `routing failed: judgment service unavailable (<cause>); re-run later`.
- **Jev question:** one `systemOne` call through `scripts/lib/jev.js` (as `tag-technique` uses) with one Noul. State: word, matchedParts. Question: "Is this word built from classical Greek/Latin morphemes or an INN drug stem, so that breaking it into parts teaches it better than a story?", carrying word-workflow.md's routing rule (morpheme structure gates, not domain) with one example each way: `adjoining` → word-part; `wary` → general (its `-ary` match is weak only).
- **Rules:**
  - pWordPart ≥ 0.7 → word-part; ≤ 0.3 → general; between → unsure.
  - Only `ambiguous` verdicts are judged. `medical` and `no match` route as before (overruling `medical` is US-042).
  - A logged story skips the judgment: `route` checks the mnemonic log before the classifier verdict, so a logged word routes `general` with its story and Jev is not called. Today the 7 logged ambiguous words (ominous, wary, …) would stop even though Flash already gave each a story.
  - The run report shows routedBy and pWordPart whenever a judgment was made.
- **Edge cases:** an already-carded word still stops first, with no judgment; Jev failing stops before `write-row`, so nothing is written; re-running is safe (no side effects).

## Open questions
- [ ] The 0.3 / 0.7 thresholds are a starting point. The 7 logged ambiguous words are known general and can test that side; no known word-part example among ambiguous verdicts yet, so the upper threshold is untested.
- [ ] Assumed a word judged word-part stops, like today's `medical` stop. Handing it to `_etta_mology` automatically is out of scope.
