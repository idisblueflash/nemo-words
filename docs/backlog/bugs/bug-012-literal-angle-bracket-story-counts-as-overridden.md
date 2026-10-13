---
title: "An unchanged story that holds a literal < or > counts as overridden"
status: open
original_story: US-033
ac: 8
found: 2026-10-13
---
# bug-012 An unchanged story that holds a literal < or > counts as overridden

## Bug
Expected: an auto-picked story with a literal `<` or `>`, on a card whose story is unchanged, counts as kept. Actual: the word counts as overridden, and the `auto-picked:` and `now:` lines of the report are identical.

Likely cause: `judge` in `scripts/kept-count.js` cleans both sides with `storyFromBack`. That function strips tags, which is right for the live Back (HTML, where Anki stores `<cat>` as `&lt;cat&gt;`) but wrong for the log sentence (plain text), where `<cat>` is removed as if it were a tag.

## Reproduction
Round 1 (2026-10-13), on `main` at `8985e88`, with a throwaway log (`NEMO_MNEMONIC_LOG`) and a mock AnkiConnect (`ANKI_CONNECT_URL`):

- Log row: `{"word":"wary","sentence":"Tom's <cat> won't run.","date":"2026-10-01","picked_by":"auto"}`
- Mock note for `wary`: Back `Tom's &lt;cat&gt; won't run.`, one card with 2 reviews.

    node scripts/kept-count.js

Observed, exit 0:

    kept 0 of 1 (0%)
    19 more needed for a verdict
    not met yet: 0
    overridden:
    - wary
        auto-picked: Tom's <cat> won't run.
        now: Tom's <cat> won't run.

## Fix
