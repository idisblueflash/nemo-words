---
id: US-033
type: story
parent: E01
status: in-progress
qa_status: passing
depends_on: [US-039]
concepts: [C-004, C-006, C-016, C-017, C-020]
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
