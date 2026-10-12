---
id: US-033
type: story
parent: E01
status: ready
depends_on: [US-039]
---
# US-033 See how many auto-picked cards I kept

As Flash, I want a count of auto-picked cards I kept versus overrode across my last 20 words, so that I know whether auto-pick is good enough.

An auto-picked word is one whose mnemonic-log row says `picked_by: "auto"`: the card pipeline (`node scripts/card.js <word>`) picked its story, not Flash (US-039).

## Acceptance criteria

```gherkin
Given  at least 20 auto-picked words whose cards Flash has reviewed in Anki
  - When  Flash runs the kept-count command
    - Then  it reports "kept N of 20 (P%)" over the 20 most recently auto-picked of those words
    - And   it says whether that meets E01's 70% target
    - And   it lists each overridden word with its auto-picked story and its story now
```

```gherkin
Given  an auto-picked card whose story Flash changed in the Anki app, or replaced with a saved one
  - When  Flash runs the kept-count command
    - Then  that word counts as overridden
```

```gherkin
Given  fewer than 20 reviewed auto-picked words
  - When  Flash runs the kept-count command
    - Then  it reports the count over the words there are, e.g. "kept 5 of 6"
    - And   it says how many more are needed for a verdict, and gives no verdict
```

```gherkin
Given  auto-picked words whose cards Flash hasn't reviewed yet
  - When  Flash runs the kept-count command
    - Then  those words aren't counted
    - And   the report says how many are "not met yet"
```

```gherkin
Given  an auto-picked word whose card was deleted from Anki
  - When  Flash runs the kept-count command
    - Then  that word counts as overridden, marked "card removed"
```

```gherkin
Given  no auto-picked word has a reviewed card yet
  - When  Flash runs the kept-count command
    - Then  it stops with "no reviewed auto-picked cards yet"
```

```gherkin
Given  Anki isn't running
  - When  Flash runs the kept-count command
    - Then  it fails with "can't reach Anki; re-run with Anki open"
    - And   no count is reported
```

## Logic sketch
- **Entities:**
  - AutoPick: word, sentence, date. From a `data/mnemonics/log.jsonl` row with `picked_by: "auto"`; when a word has several auto rows, the latest wins.
  - LiveCard: note id, Back field, review count. Read from Anki through AnkiConnect.
  - KeptVerdict: `kept` | `overridden` | `removed` | `not-met`.
  - KeptReport: kept, total, percent, verdict or "N more needed", the not-met count, the overridden list.
- **Command:** `node scripts/kept-count.js`. Read-only; it writes nothing. Exit 0 = report printed; exit 1 (clean stop) = no reviewed auto-picked cards yet; exit 2 = Anki unreachable or the log unreadable. Honours `NEMO_MNEMONIC_LOG` and `ANKI_CONNECT_URL`.
- **Rules:**
  - Find the card by the word's `Front`, with the same deck query `anki-sync.js` uses. No note → `removed`. Every card of the note has 0 reviews → `not-met`.
  - Story now: split the live Back on `<br>`, drop the `<img>` and `<small>` pieces (image, gloss and IPA, as `composeBack` adds them), decode HTML entities, trim and collapse whitespace.
  - `kept` = the story now equals the auto-picked sentence (cleaned the same way). Any other difference, even a typo fix, is `overridden`: E01 asks about cards kept unchanged.
  - Window: the reviewed words (`kept`, `overridden`, `removed`), newest auto-pick first, take 20. `not-met` words are only counted, never put in the window.
  - Verdict only when the window holds 20: "meets target" at kept ≥ 14 (70%), otherwise "below target".
- **Edge cases:** Anki's editor adding `&nbsp;` or `<div>` (the clean-up removes them, so they aren't false overrides); US-051's control-arm cards are never logged as auto-picks, so they never appear; an empty log or no auto rows → the same clean stop as no reviewed cards.

## Open questions
- [ ] Only the story is compared. When US-030 lands, the auto-picked image should join the check.
- [ ] A one-word typo fix counts as an override. If that proves too strict, a later story could add "lightly edited".
- [ ] `/prepare-words` auto-saved cards aren't counted: they have no `picked_by: "auto"`.
- [ ] No `_david` run: the real log has no auto-picked rows yet (0 of 160), so there's nothing to measure. This command is the measurement.

## Acceptance criteria

```gherkin
Given  25 auto-made cards, with the newest 20 all reviewed in Anki at least once
  - When  Flash runs the kept-count command
    - Then  it looks only at the newest 20 auto-made words
    - And   it prints how many were kept and how many were overridden, with the kept rate as a percent
    - And   it says whether the rate meets E01's 70% target
```

```gherkin
Given  an auto-made card whose story Flash rewrote in the Anki app
  - When  Flash runs the kept-count command
    - Then  that word counts as overridden
    - And   it is listed by name with its auto-picked story and the story on the card now
```

```gherkin
Given  some of the newest 20 auto-made cards have never been reviewed
  - When  Flash runs the kept-count command
    - Then  those words are listed as not yet reviewed
    - And   they are left out of the kept rate
```

```gherkin
Given  an auto-made word whose card is no longer in Anki
  - When  Flash runs the kept-count command
    - Then  the word is listed as missing
    - And   it is left out of the kept rate
```

```gherkin
Given  the mnemonic log has no auto-made cards, or none of them has been reviewed
  - When  Flash runs the kept-count command
    - Then  it says there is nothing to count yet and prints no rate
```

```gherkin
Given  Anki is not running
  - When  Flash runs the kept-count command
    - Then  it stops and says Anki can't be reached
    - And   it prints no count
```

## Logic sketch
- **Approach:** one read-only script, `node scripts/kept-count.js`. It reads the mnemonic log, asks AnkiConnect about each card, and prints a report. It writes nothing.
- **Entities:**
  - LogRow (existing): only `word`, `sentence` and `picked_by` are used.
  - KeptEntry: `word`, `autoStory`, `cardStory`, `reviewed`, verdict `kept` | `overridden` | `unreviewed` | `missing`.
- **Rules:**
  - Auto-made words are the rows with `picked_by: auto`. The log is append-only, so line order is time order. Take the newest 20 distinct words by the line of their auto row; a word with several auto rows uses its newest one. A later Flash row for the same word does not remove it from the window: the live card decides.
  - Find the card the way `anki-sync.js` does: deck plus exact `Front` match, using a row's `Deck` override when it has one.
  - Story on the card: take `Back`, remove the `<img>`, the gloss `<small>` and the IPA line, strip the remaining HTML and normalise whitespace. `kept` means this equals the auto-picked sentence (whitespace-normalised, case-sensitive). Otherwise `overridden`.
  - Reviewed means Anki's review count for the card is above 0. A card with no review is `unreviewed`.
  - Rate = kept ÷ (kept + overridden), rounded to a whole percent. The target is met at 70% or more. `unreviewed` and `missing` words are listed but not counted.
  - Exit codes: `0` when a report is printed (including "nothing to count yet"); `1` when Anki can't be reached (clean stop, no count); `2` on a crash.
- **Edge cases:** fewer than 20 auto-made words → use all of them and say how many; empty log or no auto rows → "nothing to count yet"; `ANKI_CONNECT_URL` overrides the Anki address as elsewhere.

## Open questions
- [ ] Exact match means a small typo fix counts as overridden. Assumed good enough for a first version.
- [ ] The window is the last 20 auto-made words, not the last 20 reviewed ones.
- [ ] On 2026-10-12 the log has 160 rows and none with `picked_by: auto`, so the first real run will say "nothing to count yet". No `_david` run was needed: there is no auto-pick data to measure yet.
