---
id: SP-066
type: spike
parent: E01
status: in-progress
qa_status: passing
timebox: 1d
depends_on: [SP-064]
concepts: [C-004, C-034, C-035, C-036, C-037, C-039, C-040, C-041, C-042, C-043, C-044]
---
# SP-066 Does Jev agree with Flash's image pick when vivid scores the scene, not the camera?

**Question:** If SP-064's pick follows ADR-0033 — the vivid axis scores what the story objects do to each other, and a camera angle adds nothing — does Jev reach the go bar SP-064 missed (exact ≥ 45% and in-three ≥ 70%, ADR-0031)?

**Why now:** SP-064 was no-go (exact 21%, in-three 42%, below the always-cell-1 rule's 38.7%). Its analysis (2026-10-17) found the causes before Jev, not in it: the vivid axis rewards strong angles and works against Flash (vivid alone: 6% exact, below the chance rate); captions give no object size, so must-see clarity can't see that an object is small (exotic, cell 4); the must-see list asks for nametags and abstract items `_vivian` never draws, so 31 of 82 grids skipped the gate; 20 grids have no compare lines; and the 20 tuning words are all SP-029 misses. US-030 and US-032 wait on an image pick that works.

**Changes to SP-064's run (to refine):**
- The vivid axis scores the scene: story objects that act on each other as the story says score highest; an angle scores lower only when it hides the action. An unusual angle is right when the story is about a view (the angle exception from the must-see call) or has one main object.
- The caption call adds one action line (what the story objects do to each other) and a size (large / medium / small) and place (front / back) for each must-see item.
- The must-see list comes from what the grid can show: no abstract items. A name anchor gives its carrier (a nurse) as a must-see item and the name as a name sign, which counts in must-see clarity and never gates a cell (Flash, after stage 2, ADR-0035).
- The caption lists drawing errors (an object that floats, looks pasted on, or breaks the lines of the wall or floor), and a drawing error lowers plausible (Flash, after stage 2, ADR-0036).
- The missing compare lines are filled in. (Stage 1 found that SP-064 already has 9 compare lines for all 82 grids.)
- The tuning set mixes hits and misses, not only SP-029's misses: a seeded draw of 20 of the 82 words, and the other 62 are measured (Flash, 2026-10-17).

**Done when:** measured on the 62 words outside the new tuning set, we have the exact and in-three rates next to SP-064, SP-029, the chance rate and the always-cell-1 rule on those same 62 words; the vivid axis's own exact rate next to SP-064's 6%; how often the gate is skipped next to SP-064's 31 of 82; and go / no-go against the same bar.

## Acceptance criteria

```gherkin
Given  a story of one of the 82 judged words
  - When  the spike run makes its must-see list
    - Then  one text-only Claude call lists only objects that a drawing can show, each with its adjectives
    - And   it lists no abstract items (a time, a relation, a feeling with no visible sign)
    - And   a name anchor gives the person or thing that carries the name as a must-see item (a nurse), and its name sign: the text that the picture should show ("Venice")
    - And   it says if the story is about a view, has one main object, or neither
    - And   the list is cached, so a re-run doesn't call Claude again
```

```gherkin
Given  a cell of a kept grid and its word's must-see list
  - When  the spike run captions the cell and compares the grid's cells
    - Then  the caption gives everything that SP-064's caption gave, including the text that it can read in the cell, and also one action line: what the story objects do to each other
    - And   for each must-see item it gives a size (large / medium / small) and a place (front / back), next to visible / partly cut / hidden
    - And   it lists the cell's drawing errors: each object that doesn't fit the picture (it floats, looks pasted on, or breaks the lines of the wall or floor), and whether that object is a must-see item
    - And   an object that the scene shows as broken or crooked on purpose is not a drawing error, and a cell with no errors has an empty list
    - And   every kept grid has 9 compare lines
    - And   the captioner and the comparer see no word, no story and no Flash's cell
```

```gherkin
Given  the captions, the compare lines and the story of a word
  - When  Jev picks a cell
    - Then  the gate takes out a cell with a hidden must-see item, as in SP-064 (all 9 are scored when every cell is gated out)
    - And   a name sign that can't be read never takes a cell out
    - And   vivid scores the scene: 3 = story objects large and acting on each other as the story says, 2 = clear but not acting, 1 = small, far or apart
    - And   an unusual angle lowers vivid only when it hides the action, and not when the story is about a view or has one main object
    - And   must-see clarity uses each item's size, so a small item scores lowest
    - And   when the cell's readable text doesn't show the name sign, must-see clarity is at the middle level at most
    - And   a drawing error on a must-see item puts plausible at its lowest level, and a drawing error on another object puts it at the middle level at most
    - And   code adds the weighted scores and picks the main cell and the alternative cell as in SP-064
```

```gherkin
Given  the 82 judged words and their SP-064 results
  - When  the spike run splits them
    - Then  a seeded draw puts 20 words in the tuning set, 4 or 5 of them SP-064 hits (main cell = Flash's cell), and the other 62 in the measure set
    - And   a re-run makes the same split
    - And   the run takes a case limit or a word list, and a re-run reuses its cached answers, so a stage pays only for its new words
    - And   the measure words run once, after the weights are fixed on the tuning words
```

```gherkin
Given  the weights are fixed on the 20 tuning words
  - When  the spike report is written for the 62 measured words
    - Then  it shows the exact and in-three rates next to SP-064, SP-029, the chance rate and the always-cell-1 rule, all on the same 62 words
    - And   it shows the exact rate of vivid alone next to SP-064's vivid alone, on the same 62 words
    - And   it shows how many of the 82 words skipped the gate, next to SP-064's 31 of 82
    - And   it gives the weights, the tuning words and the tie count
    - And   it ends with go or no-go: go only if exact ≥ 45% and in-three ≥ 70% (ADR-0031)
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
    - And   the cached answers stay, and no word is marked unjudged because of the limit
```

## Logic sketch
- **Approach:** throwaway prototype under `spikes/sp-066/`, copied from `spikes/sp-064/` and changed only where this spike says. It reuses SP-029's grid list and Flash's cells (`spikes/sp-029/raw/grids.json`), SP-064's 62 cached compare lines, and SP-064's saved picks (`spikes/sp-064/raw/run.json`) for the baselines and each word's hit or miss. Claude calls go through `claude -p` and are cached; Jev uses the `.env` key and `NODE_USE_ENV_PROXY=1`.
- **Entities:**
  - MustSeeList: word, items [{name, adjectives}], nameSigns [{item, text}], isSequence, angleCase (view | one-object | none)
  - CellCaption: SP-064's fields (with extras.readableText) + action (one line), mustSee {item name → {mark: visible | partly cut | hidden, size: large | medium | small, place: front | back}}, drawingErrors [{object, mustSee: true | false, note}]
  - GridDifferences: grid, lines [9]
  - CellScore, ImagePick: as in SP-064
  - WordSplit: seed, tuning [20 words], measure [62 words]
- **Rules:**
  - Split: a fixed seed draws 20 of the 82 words, stratified so 4 or 5 are SP-064 hits (SP-064's saved main cell is Flash's cell); the other 62 are the measure set.
  - Must-see list: only concrete objects a drawing can show. A name anchor gives its carrier as a must-see item (`nurse`) and the name as a name sign (`{item: nurse, text: Venice}`); a name sign is not a must-see item, so the gate never checks it. The repair prompt turns a bare name into its carrier plus a name sign. angleCase comes from the same call.
  - Name-sign check: code looks for each sign's text in the cell's readableText, ignoring case and punctuation. If any sign isn't there, code caps must-see clarity at 2 (the middle level). Jev's state also gets `name_sign_readable`.
  - Drawing error: code caps plausible at 1 for a drawing error on a must-see item, and at 2 for a drawing error on another object. Jev's state also gets the list. An object that the story shows as broken or crooked on purpose is not a drawing error.
  - Vivid levels (ADR-0033): 3 = story objects large and acting on each other as the story says; 2 = clear but not acting on each other; 1 = small, far away or apart. An unusual angle lowers vivid only when it hides the action, never when angleCase is `view` or `one-object`.
  - Must-see clarity: SP-064's levels, with "small" taken from the caption's size; a `small` item gets the lowest level.
  - Gate, total, tie-break, alternative cell, margin and weakest confidence: as in SP-064 (ADR-0032).
  - Weights: SP-064's search (each weight 0–3; most exact, then most in-three, then nearest 2·1·1), on the 20 tuning words only.
  - Vivid alone: the scored cell with the highest vivid score (ties: lower cell); given for SP-066 and for SP-064 (from its saved scores) on the same 62 words.
  - Baselines on the 62 words: SP-064 and SP-029 from their saved results, chance 1/9 and 3/9, the always-cell-1 rule.
  - Gate skipped: counted over all 82 words, next to SP-064's 31 of 82.
  - Go bar (ADR-0031): exact ≥ 45% and in-three ≥ 70%.
- **Edge cases:** empty readableText → the name sign isn't readable; a carrier that the cell doesn't draw → hidden, gated as usual; two name signs → the cap applies if either one can't be read; a caption with no drawingErrors list → unusable (made again, or the word is unjudged); every cell gated out → all 9 scored; empty must-see list → no gate; fewer than 3 scored cells → in-three over the scored cells only; Claude or Jev failure → unjudged (scenario 6); usage limit → clean stop, no report (scenario 7).

## Staged run
- **Cases:** 82 words, about 82 must-see lists, 738 captions, 20 compare lines and 82 Jev requests (about 2,200 Score questions); after the stage-2 refine, the 20 must-see lists, the 27 captions of stages 1–2 and their 3 Jev requests are made again, because the prompts changed; tuning: the 20 drawn words; measure: the other 62.
- **Stages:** 1 → 3 → 5 → rest of tuning (20) → measure (62); after the stage-2 refine, they start again at 1
- **Early picks:** tuning words only: one SP-064 hit, one word with a name anchor, one word whose angleCase is `view` or `one-object`, and one word that skipped the gate in SP-064.
- **Check after each stage:** answers parse; every caption has the action line and a size and place per item; a re-run makes no new Claude calls for cached words; the gate-skip count is lower than SP-064's on the same words; every caption has a drawing-errors list; for name-anchor words, no cell is gated out only because its name can't be read; the count of cells with a drawing error.
- **Stop for design if:** most tuning words still skip the gate; vivid alone stays below the chance rate on the tuning words; or angleCase is `none` for nearly every word, so the angle exceptions never apply; or drawing errors are marked in most cells, so the captioner can't tell them from the scene.

## Open questions
- [ ] SP-064's analysis looked at all 82 words (exotic was a measure word), so the 62 measure words aren't fully unseen.
- [ ] The name-sign match is plain text, so a drawn name that the captioner misreads ("Venise") counts as unreadable.
- [ ] The captioner may miss a drawing error, or call a crooked story object an error; the spike measures it once.
- [ ] For ventilator, Flash now thinks cells 1 and 7 are better than cell 8 (after stage 2). The label stays 8, so the comparison with SP-064 and SP-029 stays fair.
- [ ] The gate is noisy from run to run, and the spike measures it one time only.
- [ ] Captions still sit between the picture and Jev.
