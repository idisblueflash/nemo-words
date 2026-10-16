---
id: SP-029
type: spike
parent: E01
status: done
qa_status: passing
timebox: 1d
concepts: [C-001, C-002, C-004, C-030]
---
# SP-029 Does an auto image pick agree with Flash's picks?

**Why now:** Unblocks US-030. If a model rarely picks the cell Flash picked, US-030 changes shape before it's built.
**Method:** A vision model writes one caption for each cell of Flash's past grids. Then Jev judges the captions against the story in two rounds that mirror `scripts/image-picker.js`: first one cell per grid row, then the best of those three. Flash's cell is found again by a pixel match between each grid and its final crop, because no pick is recorded.
**Done when:** For the whole-word grids under `images/mnemonic/*.grid*.png` whose crop matches one cell clearly (about 82 words), we have the rate at which Jev's pick matches Flash's cell (exact match, and Flash's cell among Jev's three row picks), next to chance and to a rule that always picks cell 1, plus a go / no-go for auto image pick. **Go** if exact ≥ 45% and in-three ≥ 70% (chance 11% / 33%; the cell-1 rule gets 32% exact). The bar is fixed before the run. On no-go, a blind check of 20 missed words says whether Flash would accept Jev's cell anyway.

## Acceptance criteria

```gherkin
Given  the image grids in images/mnemonic/ and their final crops
  - When  the spike run finds Flash's cell for each grid
    - Then  it takes the cell whose pixels are nearest to the crop
    - And   it keeps a grid only when the match is clear (distance < 0.03, next-nearest cell ≥ 0.1)
    - And   it keeps only whole-word cards with a story, one grid per word
    - And   it lists every grid it left out, with the reason
```

```gherkin
Given  a kept grid
  - When  the spike run captions its cells
    - Then  each of the 9 cells gets one line of text that says what it shows
    - And   the captioner sees one cell at a time, never the story, the word or Flash's pick
```

```gherkin
Given  the 9 captions of a grid and the word's story
  - When  Jev picks in two rounds
    - Then  round 1 picks one cell per grid row, out of that row's 3 captions
    - And   round 2 picks the best of the three row picks
    - And   every pick comes from Jev's scores, and the scores are saved
```

```gherkin
Given  every kept word has been judged
  - When  the spike report is written
    - Then  it shows the exact-match rate (Jev's final cell = Flash's cell) and the in-three rate (Flash's cell is one of Jev's row picks)
    - And   it shows these next to chance (11% and 33%) and next to the always-cell-1 rule
    - And   it ends with go or no-go: go only if exact ≥ 45% and in-three ≥ 70%
```

```gherkin
Given  the result is no-go
  - When  the blind check runs on 20 words where Jev missed
    - Then  Flash sees his cell and Jev's cell side by side, unlabelled, his on the left for half the words
    - And   he chooses one, or rates them about the same
    - And   the report adds the share where Jev's cell was chosen or rated about the same
```

```gherkin
Given  the captioner or Jev fails on a cell (error or unusable answer)
  - When  the spike run hits it
    - Then  that word is reported as unjudged instead of being guessed
    - And   the rates are computed over the judged words only, with the count shown
```

## Logic sketch
- **Approach:** throwaway prototype under `spikes/sp-029/`, set up like SP-037 (own `package.json`, Jev key from `.env`, `NODE_USE_ENV_PROXY=1`). Only `judge-image` (the two-round pick) follows EN-036's step contract, so US-030 can promote it.
- **Measured at refine (2026-10-15):** 121 grid files; 107 have a crop named after the same word; 99 match one cell clearly (82 whole-word, 17 word-part); 8 crops came from a different grid of the same word. Flash's cells: 1→34, 2→10, 3→5, 4→8, 5→8, 6→11, 7→15, 8→5, 9→11, so cell 1 is 32% against 11% chance.
- **Entities:**
  - ImageGrid: word, gridPath, flashCell (1–9), matchDistance
  - CellCaption: grid, cell, text
  - ImageJudgment: rowPicks [3], finalCell, scores (raw), unjudged?
  - WordResult: exact?, inThree?
- **Rules:**
  - Cells are numbered 1–9 row-major, as in `crop-grid-cell.sh`.
  - Pixel match: grayscale, both resized to 48×48, RMS distance.
  - A word with several grids (`.grid-2`) uses the one that matches its crop.
  - Captions come from `claude -p` reading the cropped cell image; they're cached, so Jev can be re-run without re-captioning.
  - A pick is the highest score; ties go to the lower cell number, and the report counts ties (a cell-1 tie-break could inflate agreement).
  - The go bar is fixed before the run: exact ≥ 45% and in-three ≥ 70%.
- **Edge cases:** no clear crop match → left out and listed; no logged story → story taken from the card's `Back`; a comic word → only its single `.png` crop counts.

## Open questions
- [ ] Captions add a layer between the picture and Jev. In US-030 Jev reads `_vivian`'s own 1–9 list, so the real rate may differ.
- [ ] Flash's cell-1 habit may mean `_vivian` puts the most literal staging first, or that Flash reads from the top left. The spike doesn't separate the two.
