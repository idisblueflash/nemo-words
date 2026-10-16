---
id: SP-064
type: spike
parent: E01
status: in-progress
qa_status: bug
bugs:
  - ac: 1
    summary: "Four must-see lists keep a bare name as an item. The nametag is only an adjective, so the caption call and the gate still check the bare name."
    command: "node -e 'const ms=require(\"./spikes/sp-064/raw/must-see.json\");for(const w of [\"evicted\",\"devious\",\"polysemy\",\"toss\"])console.log(w,JSON.stringify(ms[w].items[0]))'"
    expected: "The list turns each name anchor into its visible sign, such as an item \"nametag reading \\\"Victor\\\"\", because scenario 1 says a name anchor becomes its visible sign. The bulge list does this with the item \"man with a nametag reading \\\"Bulb\\\"\"."
    actual: "The real lists for evicted, devious, polysemy and toss keep the bare names Victor, Dee, Melissa and Tom as item names. The nametag appears only in an adjective, such as {\"name\":\"Victor\",\"adjectives\":[\"worried\",\"nametag reading \\\"Victor\\\"\"]}. The caption prompt shows names only, so the captioner judges the bare name. In raw/captions.json it marks Victor hidden in 7 of 9 cells, and the gate puts those 7 cells out."
    found: 2026-10-17
timebox: 1d
depends_on: [SP-029]
concepts: [C-002, C-004, C-030, C-034, C-035, C-036, C-037]
---
# SP-064 Does Jev agree with Flash's image pick once it checks the must-see objects and the camera shot?

**Why now:** SP-029 was no-go (exact 15.9%, in-three 46.3%, both below the cell-1 rule), and Flash's notes on its blind check say why: he picks the cell that shows every story object clearly, then the one whose scene makes sense, then the most vivid shot. This spike tests a pick built on those notes before US-030 and US-032 take a shape.
**Method (agreed with Flash, 2026-10-16):** Jev answers only typed questions (Choice, Score, Noul) and can't write text, so every text step is Claude's and Jev only judges.
1. *Must-see list:* one text-only Claude call per story (no images) writes its must-see list.
2. *Cell captions, redone:* one Claude call per cell (about 738, cached like SP-029's) sees that cell and the must-see list, never the word, the full story or Flash's cell. It writes the objects with their adjectives, the shot, the angle, the action step (before / during / after) and what extra the cell shows (floor, background, more people, readable text), and marks each must-see item visible, partly cut or hidden. SP-029's old captions are kept only as a cross-check.
3. *Grid differences:* one Claude call per grid sees the 9 cut-out cells together, under the same blindness, and writes one line per cell on how it differs from the others ("cuts off the leg that cells 4 and 7 show").
4. *Gate:* a cell with a hidden must-see item is out of the pick.
5. *Pick:* one Jev request per grid, the way `judge-stories` scores stories (US-038). For each cell that passes the gate, one Score question per axis, with 1–3 levels kept in a rubric file like `scripts/story-rubric.json`: *plausible* (setting clues such as a floor, a hand or a height, and a sensible order), *vivid* (an extreme close-up or a strong camera angle scores highest) and *must-see clarity* (every item large and clear; a partly cut item scores lowest). Code adds the axes up with weights (a starting guess is 2 × plausible + vivid + must-see clarity, tuned on the 20 words), and the highest total is the pick. A tie goes to the higher plausible score, then to the lower cell number, and the report counts the ties because SP-029's lower-cell tie-break favours cell 1.
6. *Alternative cell:* code, not a second Jev call. It is the cell with the next-highest total that has a wider shot when the pick is an extreme close-up, or a different action step when the story is a sequence (shot and step come from step 2's captions).
7. *Low certainty goes to Flash:* Score gives a `confidence` per cell and axis, not per pick, so code makes the signal. Two candidates are measured: the *margin* (the best total minus the second-best) and the *weakest confidence* among the picked cell's axes. Flash checks the words below the cut-off, and his notes on them become ideas for new rules.
The comic path is out of scope.
**Done when:** Tuned on SP-029's 20 blind-check words and measured on the other 62, we have the exact and in-three rates next to SP-029, chance and the cell-1 rule; the same rates for each band (high / middle / low) of the margin and of the weakest confidence, and which of the two signals separates agreement from disagreement better; that signal's cut-off for sending a word to Flash and the share of words below it; the weights the tuning settled on and how many picks a tie decided; how often Flash's cell is the main or the alternative cell; and a go / no-go against a bar fixed before the run.

## Acceptance criteria

```gherkin
Given  a story of one of SP-029's 82 judged words
  - When  the spike run makes its must-see list
    - Then  one text-only Claude call lists the objects a cell must show, each with its adjectives
    - And   a name anchor becomes its visible sign (a nametag reading "Venice")
    - And   the list is saved and cached, so a re-run doesn't call Claude again
```

```gherkin
Given  a cell of a kept grid and its word's must-see list
  - When  the spike run captions the cell again
    - Then  the caption gives the objects with their adjectives, the shot, the angle, the action step (before / during / after) and the extras (floor, background, more people, readable text)
    - And   it marks each must-see item visible, partly cut or hidden by the item's name only, without its adjectives
    - And   the captioner sees only that cell and the list, never the word, the story or Flash's cell
```

```gherkin
Given  the 9 cells of a kept grid
  - When  the spike run compares them
    - Then  one Claude call sees all 9 cells together, under the same blindness
    - And   it writes one line per cell on how that cell differs from the others
```

```gherkin
Given  the captions, the grid lines and the story of a word
  - When  Jev picks a cell
    - Then  a cell with a hidden must-see item is out of the pick
    - And   Jev scores each remaining cell on plausible, vivid and must-see clarity, 1–3, from a rubric file
    - And   must-see clarity checks the items with their adjectives (a bare cob, a nametag that reads "Venice")
    - And   code adds the weighted scores, and the highest total is the pick (ties: higher plausible, then lower cell)
    - And   code picks the alternative cell from the totals and the captions, with no second Jev call
    - And   the scores, confidences, totals, margin and weakest confidence are saved
```

```gherkin
Given  the weights are fixed on the 20 blind-check words
  - When  the spike report is written for the other 62 words
    - Then  it shows the exact rate and the in-three rate (Flash's cell among the 3 highest totals), next to SP-029, chance and the always-cell-1 rule
    - And   it shows the same rates per band (high / middle / low) of the margin and of the weakest confidence, and names the better signal
    - And   it gives the weights, the tie count, and how often Flash's cell is the main or the alternative cell
    - And   it gives the margin cut-off and the weakest-confidence cut-off from the 62 measured words, and the share of words at or below each cut-off
    - And   it counts the words where the gate removed Flash's cell, and lists them
    - And   it gives the share of cells with a partly cut must-see item
    - And   it ends with go or no-go: go only if exact ≥ 45% and in-three ≥ 70%
```

```gherkin
Given  every cell of a grid has a hidden must-see item
  - When  Jev picks a cell
    - Then  all 9 cells are scored without the gate
    - And   the report counts and lists these words
```

```gherkin
Given  Claude or Jev fails for a word (an error or an unusable answer)
  - When  the spike run reaches that word
    - Then  the word is reported as unjudged instead of a guessed pick
    - And   the rates are over the judged words only, with the count shown
```

```gherkin
Given  Claude answers that the usage limit is reached
  - When  the spike run reaches the next call
    - Then  the run stops without a report and says when to run it again
    - And   the cached answers stay, so the next run continues from there
    - And   no word is marked unjudged because of the limit
```

## Logic sketch
- **Approach:** throwaway prototype under `spikes/sp-064/`, set up like SP-029. It reuses SP-029's grid list and Flash's cells (`spikes/sp-029/raw/grids.json`) and its 20 blind-check words (`raw/blind-pairs.json`). Claude calls go through `claude -p` and are cached; Jev uses the `.env` key and `NODE_USE_ENV_PROXY=1`.
- **Entities:**
  - MustSeeList: word, items [{name, adjectives}], isSequence
  - CellCaption: grid, cell, objects, shot, angle, step, extras, mustSee {item name → visible | partly cut | hidden}
  - GridDifferences: grid, lines [9]
  - CellScore: cell, plausible, vivid, clarity (each score + confidence), total
  - ImagePick: mainCell, alternativeCell, margin, weakestConfidence, gateSkipped?, tie?, unjudged?
  - WordResult: exact?, inThree?, mainOrAlternative?, gateRemovedFlashCell?, band per signal
- **Rules:**
  - Tuning set = the 20 blind-check words; measure set = the other 62. The weights are fixed on the tuning set; nothing changes once the measure run starts.
  - Axis scores are decimals 1–3, kept as US-038 keeps them. Total = wP·plausible + wV·vivid + wC·clarity, starting at 2, 1, 1.
  - Gate (ADR-0032): the caption marks each must-see item by its name only. A cell is out when one item is hidden; a partly cut item doesn't put it out.
  - Must-see clarity checks the items with their adjectives: a partly cut item, or one in the wrong state (a cob that isn't bare yet), gets the lowest score.
  - Alternative cell: the next-highest total with a wider shot when the main cell is an extreme close-up; with a different action step when the story is a sequence; otherwise the next-highest total. The must-see call says whether the story is a sequence.
  - Margin = best total − second-best total; with only one scored cell, it goes in the high band.
  - Weakest confidence = the lowest of the main cell's 3 confidences.
  - Bands are thirds of the 62 measured words, per signal; each signal's cut-off is the top edge of its low band. The better signal has the larger exact-rate gap between its high and low band.
  - Usage limit: when Claude's answer says the session or usage limit is reached, the run stops (exit 1) with no report and shows the reset time. Every other Claude or Jev failure follows scenario 7.
  - In-three = Flash's cell among the 3 highest totals. Go bar (fixed before the run, ADR-0027's bar kept): exact ≥ 45% and in-three ≥ 70%.
- **Edge cases:** every cell gated out → all 9 scored (scenario 6); usage limit → stop, no report (scenario 8); fewer than 3 scored cells → in-three over the scored cells only; empty must-see list → no gate; Claude or Jev failure → unjudged (scenario 7).

## Open questions
- [ ] The gate is noisy from run to run (gate check, scalpel: 1 cell out in one run, 3 in another); the spike measures it one time only.
- [ ] Almost every cell has a partly cut must-see item, so must-see clarity may not separate cells; the report gives the share.
- [ ] The 20 tuning words are all SP-029 misses, so harder than average; the weights may fit hard cases too closely.
- [ ] Captions still sit between the picture and Jev. In US-030 Jev may read `_vivian`'s own 1–9 list instead.
- [ ] About 900 Claude calls (82 must-see lists, 738 captions, 82 grid lines).
