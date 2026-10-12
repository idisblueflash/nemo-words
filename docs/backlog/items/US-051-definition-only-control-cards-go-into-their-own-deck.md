---
id: US-051
type: story
parent: E02
status: in-progress
depends_on: [US-041]
---
# US-051 Definition-only control cards go into their own deck

As Flash, I want some of my new words carded as definition-only cards in a separate control deck, so that my own Anki reviews can show whether mnemonic cards are remembered longer.

**Why first (review, 2026-10-12):** assumption #1 is the riskiest and had no story. E02's success signal needs at least 30 definition-only cards with weeks of review data, so the control deck must start early.

## Acceptance criteria

```gherkin
Given  a new general-English word that has a sound anchor and no logged story
  - When  Flash runs the one-word command and the draw puts it in the control arm
    - Then  a card appears in the 00 Reading Room::03 Control Definitions deck
    - And   its back shows the plain definition, the gloss and the IPA line, with no story and no image
    - And   no story is drafted or judged for it, and nothing is written to the mnemonic log
    - And   the run report says "control arm: definition-only card"
```

```gherkin
Given  a new general-English word that has a sound anchor and no logged story
  - When  the draw puts it in the story arm
    - Then  it is carded in 00 Reading Room::Terms with a story, as before
    - And   the card is tagged as a story-arm card, so the comparison can find it later
    - And   the run report says "story arm"
```

```gherkin
Given  the experiment has 3 more control cards than story-arm cards (or the reverse)
  - When  Flash runs the one-word command on a new word
    - Then  the word goes to the arm with fewer cards, with no chance draw
```

```gherkin
Given  a word with a logged story, a word with no sound anchor, or a word on the word-part path
  - When  Flash runs the one-word command
    - Then  no draw happens, and the word is handled as before this story
    - And   it doesn't count toward either arm
```

```gherkin
Given  a word already carded as a control card
  - When  Flash runs the one-word command on it again
    - Then  the command stops with "already carded", showing the control card's back
    - And   the word is not moved to the story arm
```

```gherkin
Given  the draw put a word in the story arm, but every drafted story failed a gate
  - When  the run stops with no-pick
    - Then  no card is made, and the word doesn't count toward either arm
```

## Logic sketch
- **Approach:** a new step, `draw-arm`, runs right after `find-keywords`, so the draw happens only for words that would get a story card today. The draw comes after the no-anchor stop on purpose. If it came before, every hard-to-anchor word would land in control, and the two arms would not match. The story arm runs the rest of the pipeline unchanged and adds only a tag. The control arm skips `compose-stories` → `story` and `tag-technique` / `log-card`, then rejoins at writing the row, `sync` and `report`. Dagu's skip cascade means the control branch can't simply depend on skipped story steps. It needs its own write path, or a join that tolerates skipped steps. The builder decides which.
- **Entities** (names shared with US-028 / US-041):
  - Arm: `control` | `story`, one per drawn word; printed by `draw-arm` and read by the write, report and log steps
  - ArmCounts: control, story; worked out each run from the card file, never stored on its own. Control = rows tagged `retention-control`; story = rows tagged `retention-story`; only rows with a non-empty Back count
  - CardRow (card file, `Front\tBack\tImage\tIPA\tGloss\tDeck\tTags`):
    - control: Back = `define`'s definition sentence (line 2), plain text; Gloss and IPA as for a story card; Image empty; Deck = `00 Reading Room::03 Control Definitions`; Tags = `retention-control`
    - story arm: as today, plus Tags = `reading-room-terms retention-story` (a row's Tags column replaces the `#tags` header, ADR-0016, so the header tag is repeated)
  - RunReport: gains one line, `control arm: definition-only card` or `story arm`
- **States:** adds `anchored → drawn(control | story)`. `drawn(story)` continues as `drafted → … → picked | no-pick`, and `drawn(control)` goes to `written → synced`. A run that stops after the draw (no-pick, sync failure before a row exists) leaves no tagged row, so it never counts. A sync failure after the row is written does count, because the row stands.
- **Rules:**
  - The draw: if |control − story| ≥ 3, the word goes to the arm with fewer cards. Otherwise it is a 50/50 chance.
  - `NEMO_ARM=control|story` forces the arm, for tests and for Flash to override by hand. It is a DAG param, forwarded by `card.js` like the other overrides. Any other value → exit 2.
  - Only the one-word command draws. Logged-story words, word-part words, no-anchor words, and the hand-made paths (`update-anki-story`, `/new-word-card`, `/prepare-words`) never draw and get no arm tag.
  - A control card's Back holds no story, sound anchor or image. The gloss and IPA are the same as a story card's, so the story and the image are the only differences between the arms.
  - A control word gets no mnemonic-log row and no runner-ups entry. Its arm tag on the card file row is the experiment's record.
  - `route`'s "already carded" check already covers control rows (a non-empty Back), so a re-run stops. No new code is needed; pin it with a test.
  - `anki-sync.js` already honours a row's Deck/Tags and creates missing decks, so the control deck appears on first sync.
- **Edge cases:**
  - A word's row exists with an empty Back (listed but not carded yet): the draw applies. The control path sets the row's Deck/Tags, overwriting what was there. The story path keeps today's patch behaviour and adds the story tag.
  - An empty experiment (0/0): a plain 50/50 draw.
  - The card file can't be read for counting: the run fails (exit 2) before anything is written. It never falls back to a draw that ignores the cap.
  - Two runs at once: the counts can be off by one. That is acceptable, because the cap is a soft balance and not an invariant.

## Open questions
- [ ] No-pick bias: a story-arm word that fails every gate drops out, but the same word in control would have been carded. If the no-pick rate is high, the control arm keeps a few harder words. Watch the counts. A later story could redraw such a word into control, or exclude it from both arms.
- [ ] Turning a control word into a story card by hand later (`update-anki-story`) would quietly break the experiment. For now, Flash avoids it. A guard can come later if it happens.
- [ ] Comparing the arms (lapse rate, reaching a 21-day interval) is E02's next story, not this one. It finds the cards by the two tags.
- [ ] No `_david` run first: this story adds a new step, but it doesn't change the rules of an existing story step and doesn't rest on measured claims about the data.
- [ ] US-046 (in progress) also edits around `find-keywords` / the DAG. Expect a merge conflict, not a build dependency.
