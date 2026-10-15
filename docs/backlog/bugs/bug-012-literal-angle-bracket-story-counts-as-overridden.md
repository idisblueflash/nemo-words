---
title: "An unchanged story that holds a literal < or > counts as overridden"
status: fixed
original_story: US-033
ac: 8
concepts: [C-017]
found: 2026-10-13
---
# bug-012 An unchanged story that holds a literal < or > counts as overridden

## Bug
Expected: The word counts as kept. Scenario 8 of US-033 says so: the story was auto-picked, it holds a literal `<` or `>`, and the story on the card did not change.

Actual: The word counts as overridden. But the `auto-picked:` line and the `now:` line in the report are the same.

Likely cause: `judge` in `scripts/kept-count.js` cleans both stories with `storyFromBack`. That function removes HTML tags. This is right for the live Back, because the Back is HTML and Anki stores `<cat>` there as `&lt;cat&gt;`. It is wrong for the sentence in the log, because that sentence is plain text. So the function removes `<cat>` from it as if `<cat>` were a tag.

## Reproduction
Reported: Expected: an auto-picked story with a literal `<` or `>`, on a card whose story is unchanged, counts as kept. Actual: the word counts as overridden, and the `auto-picked:` and `now:` lines of the report are identical.

Reported likely cause: `judge` in `scripts/kept-count.js` cleans both sides with `storyFromBack`. That function strips tags, which is right for the live Back (HTML, where Anki stores `<cat>` as `&lt;cat&gt;`) but wrong for the log sentence (plain text), where `<cat>` is removed as if it were a tag.

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

Round 2 (2026-10-15), on `6a6250b`. Reopened from `qa` (found 2026-10-14).

Reported: An unchanged card that anki-sync.js wrote itself holds the story's < and > raw, not as entities; kept-count strips a tag-like piece (<cat>, or '< 5 >') from that Back and counts the word as overridden. Expected: kept 1 of 1 (100%): the story has a literal < and >, and nobody changed the card. Actual: kept 0 of 1 (0%); overridden: auto-picked: Tom's <cat> won't run. / now: Tom's won't run. (the same happens for 'He wrote 3 < 5 > 2 on the wall.' -> now: 'He wrote 3 2 on the wall.'). A Back that holds &lt;cat&gt; as entities counts as kept.

Repro: log row `{"word":"wary","sentence":"Tom's <cat> won't run.","date":"2026-10-01","picked_by":"auto"}`, mock note Back `Tom's <cat> won't run.` (as `composeBack` pushes it), 2 reviews, run with `node scripts/kept-count.js`. Observed: `kept 0 of 1 (0%)`, `now: Tom's won't run.`. The new test failed the same way (the two raw-Back tests red) before the fix.

Cause: `composeBack` in `scripts/anki-sync.js` writes the story raw, but `storyFromBack` strips anything that looks like a tag. Design note: the clean fix is for `composeBack` to escape `<`, `>` and `&` in the story, but that changes every live card on the next sync, so it was not done.

## Fix
`scripts/kept-count.js`: `judge` now cleans the log sentence with a new `plainStory` (whitespace only), and keeps `storyFromBack` for the live Back alone. Covered by `test/kept-count-us033-ac8-literal-angle-bracket.test.js`.

Round 2: `scripts/kept-count.js` `judge` also compares the log sentence with `rawStory(back)`, the story piece of the Back split only on `<br>` with the `<img>` and `<small>` pieces dropped and nothing stripped. The word is kept when either reading matches. `storyFromBack` and `anki-sync.js` are unchanged. Covered by three new tests in `test/kept-count-us033-ac8-literal-angle-bracket.test.js`.
