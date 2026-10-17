---
id: SP-066
type: spike
parent: E01
status: in-progress
qa_status: passing
timebox: 1d
depends_on: [SP-064]
concepts: [C-004, C-034, C-035, C-036, C-037, C-039, C-040, C-041, C-042, C-043, C-044, C-045, C-046, C-047]
---
# SP-066 Does Jev agree with Flash's image pick when vivid scores the scene, not the camera?

**Question:** If SP-064's pick follows ADR-0033 — the vivid axis scores what the story objects do to each other, and a camera angle adds nothing — does Jev reach the go bar SP-064 missed (exact ≥ 45% and in-three ≥ 70%, ADR-0031)?

**Why now:** SP-064 was no-go (exact 21%, in-three 42%, below the always-cell-1 rule's 38.7%). Its analysis (2026-10-17) found the causes before Jev, not in it: the vivid axis rewards strong angles and works against Flash (vivid alone: 6% exact, below the chance rate); captions give no object size, so must-see clarity can't see that an object is small (exotic, cell 4); the must-see list asks for nametags and abstract items `_vivian` never draws, so 31 of 82 grids skipped the gate; 20 grids have no compare lines; and the 20 tuning words are all SP-029 misses. US-030 and US-032 wait on an image pick that works.

**Changes to SP-064's run (to refine):**
- The vivid axis scores the scene: story objects that act on each other as the story says score highest; an angle scores lower only when it hides the action. An unusual angle is right when the story is about a view (the angle exception from the must-see call) or has one main object.
- The caption call adds one action line (what the story objects do to each other) and a size (large / medium / small) and place (front / back) for each must-see item.
- The must-see list comes from what the grid can show: no abstract items. A name anchor gives its carrier (a nurse) as a must-see item and the name as a name sign, which counts in must-see clarity and never gates a cell (Flash, after stage 2, ADR-0035).
- The caption lists drawing errors (an object that floats, looks pasted on, or breaks the lines of the wall or floor), and Jev sees them when it scores plausible (Flash, after stage 2, ADR-0036; after stage 5, ADR-0037 removed the code cap).
- Must-see clarity is scored in parts, one Jev question each: completeness, size, state, name sign and the view of the main subject; clarity is their mean (Flash, after stage 5, ADR-0037). The main subject is the person, animal or group that does the story's action, or the actor when the story names no person; never an object (Flash, after the second stage 5, ADR-0038).
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
    - And   it names the main subject: the one person, animal or group of them (a family) that does the story's action; one that only receives the action (the newborn) is not the main subject; an object (a tile, a pier, a broom) is never the main subject
    - And   when the story names no person but has an action that a person does (sweep: "grab the broom"), the main subject is that person, the actor; an actor is not a must-see item, so the gate never checks it
    - And   the list is cached, so a re-run doesn't call Claude again
```

```gherkin
Given  a cell of a kept grid and its word's must-see list
  - When  the spike run captions the cell and compares the grid's cells
    - Then  the caption gives everything that SP-064's caption gave, including the text that it can read in the cell, and also one action line: what the story objects do to each other
    - And   for each must-see item it gives a size (large / medium / small) and a place (front / back), next to visible / partly cut / hidden
    - And   it lists the cell's drawing errors: each object that doesn't fit the picture (it floats, looks pasted on, or breaks the lines of the wall or floor), and whether that object is a must-see item
    - And   an object that the scene shows as broken or crooked on purpose is not a drawing error, and a cell with no errors has an empty list
    - And   when the story has a main subject, it gives the view of the main subject (front, three-quarter, side, back, or from above), or none when the cell doesn't show it
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
    - And   Jev sees the cell's drawing errors and gives plausible a lower score for them, and code doesn't cap plausible
    - And   Jev scores must-see clarity in parts, one question each with the full caption:
            completeness (a crop that fits the shot, as in a close-up, costs less than a crop that cuts the story),
            size (an item that is small by nature, such as a headlamp, costs less than a small story item),
            state (each item in the state that its adjectives give),
            name sign (only for a name anchor: can the name be read),
            main-subject view (only when the story has a main subject: front or three-quarter 3, side 2, back or from above 1; an actor that the cell doesn't show 1)
    - And   must-see clarity is the mean of the parts that apply, and code doesn't cap it
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
  - MustSeeList: word, items [{name, adjectives}], nameSigns [{item, text}], mainSubject ({name, actor: true | false} or null), isSequence, angleCase (view | one-object | none)
  - CellCaption: SP-064's fields (with extras.readableText) + action (one line), mustSee {item name → {mark: visible | partly cut | hidden, size: large | medium | small, place: front | back}}, drawingErrors [{object, mustSee: true | false, note}], mainView (front | three-quarter | side | back | above; null when the story has no main subject or the cell doesn't show it)
  - GridDifferences: grid, lines [9]
  - CellScore: as in SP-064, and clarity also holds its parts {completeness, size, state, nameSign?, view?}, each with Jev's score and confidence
  - ImagePick: as in SP-064
  - WordSplit: seed, tuning [20 words], measure [62 words]
- **Rules:**
  - Split: a fixed seed draws 20 of the 82 words, stratified so 4 or 5 are SP-064 hits (SP-064's saved main cell is Flash's cell); the other 62 are the measure set.
  - Must-see list: only concrete objects a drawing can show. A name anchor gives its carrier as a must-see item (`nurse`) and the name as a name sign (`{item: nurse, text: Venice}`); a name sign is not a must-see item, so the gate never checks it. The repair prompt turns a bare name into its carrier plus a name sign. angleCase and mainSubject come from the same call. Main subject (ADR-0038): the person, animal or group of them that does the story's action (an item, `actor: false`); one that only receives the action is not it; when the story names no person but has an action that a person does, the person who does it (`actor: true`, a name such as "person who grabs the broom", not an item); otherwise null; an object is never the main subject. Code can't tell a person from an object, so the prompt gives the rule and the stage summary prints each main subject. A non-actor mainSubject that isn't one of the items gets the repair prompt once, and the word fails if it is still wrong. The captioner sees an actor's name, masked as item names are.
  - Name-sign check: code looks for each sign's text in the cell's readableText, ignoring case and punctuation, and a possessive ('s) counts as the name (bug-019). Jev's state gets `name_sign_readable`; it informs the name-sign part, and code caps nothing (ADR-0037).
  - Drawing error: Jev's state gets the cell's list, and Jev scores plausible with it; code caps nothing (ADR-0037). An object that the story shows as broken or crooked on purpose, or that the cell's edge cuts off, is not a drawing error (bug-018).
  - Vivid levels (ADR-0033): 3 = story objects large and acting on each other as the story says; 2 = clear but not acting on each other; 1 = small, far away or apart. An unusual angle lowers vivid only when it hides the action, never when angleCase is `view` or `one-object`.
  - Must-see clarity (ADR-0037): one Score question per scored cell and clarity part, each with the full caption; level 0–2 plus 1, as for the other axes. Parts: completeness (1 = a crop cuts off part of the story, 2 = an item partly cut but the crop fits the shot, 3 = every item fully visible); size (1 = a story item too small to see what it does, 2 = an item small by nature, such as a headlamp, 3 = every item large enough); state (1 = an item not in the state its adjectives give, 2 = some states unclear, 3 = every item in its state); name sign, only with a name sign (1 = can't be read, 2 = partly readable or misread, 3 = readable); view, only with a main subject (1 = back or from above, or an actor that the cell doesn't show; 2 = side; 3 = front or three-quarter). Clarity is the mean of the parts that apply; its confidence (for C-037) is the lowest confidence of its parts.
  - Gate, total, tie-break, alternative cell, margin and weakest confidence: as in SP-064 (ADR-0032).
  - Weights: SP-064's search (each weight 0–3; most exact, then most in-three, then nearest 2·1·1), on the 20 tuning words only.
  - Vivid alone: the scored cell with the highest vivid score (ties: lower cell); given for SP-066 and for SP-064 (from its saved scores) on the same 62 words.
  - Baselines on the 62 words: SP-064 and SP-029 from their saved results, chance 1/9 and 3/9, the always-cell-1 rule.
  - Gate skipped: counted over all 82 words, next to SP-064's 31 of 82.
  - Go bar (ADR-0031): exact ≥ 45% and in-three ≥ 70%.
- **Edge cases:** an actor that the cell doesn't show → the cell stays in, mainView null, view part at the lowest level; two people who both act → the one that does the main action of the story; the main subject hidden → the cell is gated out, and when every cell is gated out its view part gets the lowest level; a caption with no mainView while the list has a main subject → unusable; no name sign and no main subject → clarity is the mean of 3 parts; empty readableText → the name sign isn't readable; a carrier that the cell doesn't draw → hidden, gated as usual; two name signs → the cap applies if either one can't be read; a caption with no drawingErrors list → unusable (made again, or the word is unjudged); every cell gated out → all 9 scored; empty must-see list → no gate; fewer than 3 scored cells → in-three over the scored cells only; Claude or Jev failure → unjudged (scenario 6); usage limit → clean stop, no report (scenario 7).

## Staged run
- **Cases:** 82 words, about 82 must-see lists, 738 captions, 20 compare lines and 82 Jev requests (about 2,200 Score questions); after the stage-2 refine, the 20 must-see lists, the 27 captions of stages 1–2 and their 3 Jev requests are made again, because the prompts changed; after the stage-5 refine, the 20 must-see lists, the 45 captions of stages 1–5 and their 5 Jev requests are made again, and a Jev request has about 4 more questions per cell (about 6,000 Score questions in all); after the second stage 5 (ADR-0038), the 20 must-see lists, the captions of words whose main subject changes and the 5 Jev requests are made again; tuning: the 20 drawn words; measure: the other 62.
- **Stages:** 1 → 3 → 5 → rest of tuning (20) → measure (62); after the stage-2 refine, the stage-5 refine and the second stage-5 refine, they start again at 1
- **Early picks:** tuning words only: one SP-064 hit, one word with a name anchor, one word whose angleCase is `view` or `one-object`, one word that skipped the gate in SP-064, and one word with a main subject.
- **Check after each stage:** answers parse; every caption has the action line and a size and place per item; a re-run makes no new Claude calls for cached words; the gate-skip count is lower than SP-064's on the same words; every caption has a drawing-errors list; for name-anchor words, no cell is gated out only because its name can't be read; the count of cells with a drawing error; every caption that shows a main subject has a mainView; clarity's spread inside a grid is wider than in stage 5 before the stage-5 refine (mean 0.71); each word's main subject, marked when it is an actor, is a person, an animal or a group.
- **Stop for design if:** most tuning words still skip the gate; vivid alone stays below the chance rate on the tuning words; or angleCase is `none` for nearly every word, so the angle exceptions never apply; or drawing errors are marked in most cells, so the captioner can't tell them from the scene; or clarity still scores almost every cell of a grid the same; or the captioner gives most cells of a grid the same view; or Jev's clarity parts disagree with the caption (a partly cut mark with completeness 3); or most tuning words have no main subject; or the captioner leaves out the actor in most cells.

## Open questions
- [ ] SP-064's analysis looked at all 82 words (exotic was a measure word), so the 62 measure words aren't fully unseen.
- [ ] The name-sign match is plain text, so a drawn name that the captioner misreads ("Venise") counts as unreadable.
- [ ] The captioner may miss a drawing error, or call a crooked story object an error; the spike measures it once.
- [ ] For ventilator, Flash now thinks cells 1 and 7 are better than cell 8 (after stage 2). The label stays 8, so the comparison with SP-064 and SP-029 stays fair.
- [ ] The gate is noisy from run to run, and the spike measures it one time only.
- [ ] Captions still sit between the picture and Jev.
- [ ] The view order (front or three-quarter best, side in between, back or from above worst) comes from one grid (surgeon, Flash after stage 5); the tuning words test it.
- [ ] The clarity parts count equally in the mean; that is a guess, and 20 tuning words are too few to set their weights.
- [ ] A clarity part that only reads a caption field (completeness, name sign, view) can vary a little from run to run with Jev, which a code lookup wouldn't.
- [ ] After stage 5, Flash thinks anomaly cell 7 would be the most plausible cell without its drawing error (the crack is near the door that is knocked on). The label stays 1.
- [ ] The rule "the one that does the action" comes from 5 words (Flash, after the second stage 5); a story where two people act equally may still give either one.
- [ ] period's drawing-error marks are still uneven (the sea's edge marked in 4 of 9 cells); stage 20 shows whether this decides more words.
