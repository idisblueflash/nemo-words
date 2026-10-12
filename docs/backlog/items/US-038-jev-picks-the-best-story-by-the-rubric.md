---
id: US-038
type: story
parent: E01
status: in-progress
qa_status: passing
---
# US-038 Jev picks the best story by the story rubric

As Flash, I want the auto-pick to choose the passing candidate that scores best on the story rubric, so that my card gets the best story of the batch, not just the first one that passed.

**Scope:** promote SP-037's `judge-story` CLI into the pipeline (one Jev question per `_nemo.md` judgment gate and score axis) and replace `pick-story`'s first-passing rule with a scored pick. **Drop the same-root-anchor gate:** in SP-037 its probabilities sat near 0.5 for every candidate (Flash's stories averaged 0.47, fresh ones 0.53), so it added noise, not judgment. The judgment gates left are vividness, scene coherence and animal harm.

**Why build it despite SP-037's no-go (2026-10-12 review):** the no-go measured agreement with Flash's old picks, which were often Claude suggestions accepted blindly, and Flash considers those unreliable. The blind check is the better evidence: Flash accepted Jev's pick or rated it about the same on 17 of 20 words. Jev also breaks the decision into one small question per gate and axis, and hallucinates less than a single Claude pick. US-033's kept-count shows whether Jev's picks keep holding up.

**Split out (2026-10-12 review):** sense lock with corpus context → US-043; concrete/abstract check → US-044; keyword choice per chunk → US-045.

## Acceptance criteria

```gherkin
Given  a word whose drafted stories include several that pass the hard gates
  - When  Flash runs the one-word command with that word
    - Then  the card gets the passing story with the highest rubric total (anchor fidelity + meaning-carry + vividness, out of 9)
    - And   the run report shows the picked story's total and its three axis scores
```

```gherkin
Given  a story that passes the hard gates but fails a judgment gate (vividness, scene coherence or animal harm)
  - When  the stories are ranked
    - Then  it is never picked while any story passes every gate, whatever its total
    - And   it is logged as a runner-up with the failed gate and question as its reject reason
```

```gherkin
Given  two passing stories with the same total
  - When  the stories are ranked
    - Then  the shorter one is picked, then the alphabetically first one, the same way on every run
```

```gherkin
Given  every drafted story fails a hard gate or a judgment gate
  - When  Flash runs the one-word command
    - Then  no card is made
    - And   the command stops with no-pick and lists each story with its failed gates
```

```gherkin
Given  the judgment service is unavailable while the stories are judged
  - When  Flash runs the one-word command
    - Then  the card gets the first story that passed the hard gates, as before this story
    - And   the run report says the pick was not judged and why
```

```gherkin
Given  a word with a logged story
  - When  Flash runs the one-word command
    - Then  the logged story is carded and no story is judged
```

## Logic sketch
- **Approach:** a new Jev step `judge-stories` between `check-stories` and `pick-story` in `dags/card.yaml`, promoting SP-037's `judge-story` minus the same-root-anchor gate; `pick-story` changes from first-passing to a scored pick. Stdlib only: the spike's SDK calls become `scripts/lib/jev.js` calls, as `tag-technique` does. The pipeline is a parallel feature beside the agent workflow, so it owns its rubric: `_nemo.md` is a reference only, never read at run time.
- **Entities** (names shared with US-028 and US-039):
  - StoryCandidate: sentence, pivot_words, rejectReasons[] (unchanged)
  - Judgment (new, per candidate that passed the hard gates): nouls (question id → p of pass), gateResults (vividness, scene-coherence, animal-harm → pass/fail + failing question), axisScores (anchor, meaning, vivid → 1–3), total (3–9)
  - StoryRubric (new, `scripts/story-rubric.json`): per gate a summary question plus split-out questions; per axis a label and three level texts
  - AlternatesEntry runner-ups: rejectReasons now also carry failed judgment gates
- **States:** adds `checked → judged → picked | no-pick`; a Jev failure goes `checked → unjudged → picked` (first-passing fallback) or `no-pick`.
- **Contracts:**
  - `judge-stories <word> <sense> <candidates-file> <checks-file> <chunk-keywords-file>` → one line per candidate, same order: `reasons\ttotal\tanchor,meaning,vivid\t<id>=<p>,…`. `reasons` is `-` when the candidate passed everything, else hard-gate reasons plus failed judgment gates as `gate: question`, comma-separated. A hard-gate fail isn't sent to Jev (score fields `-`). One `systemOne` call per candidate, all in parallel. Any call failing or an unusable answer → exit 2, stderr `stories not judged: <cause>; picked the first that passed the hard gates`.
  - `pick-story <candidates-file> <checks-file> <judgments-file|->` → `sentence\tpivots`, stderr `pick: total N (anchor a, meaning m, vivid v)` for the run report. With `-` it falls back to the first passing candidate in the checks file. No winner → exit 1, `no-pick: …` plus `sentence\treasons` per candidate, as today.
  - `dags/card.yaml`: `judge_stories` has `continue_on: exit_code [2], mark_success`, like `tag_technique`; a non-zero exit hands `pick-story` `-`. `log-card` reads the judgments file's `reasons` column for runner-ups when judging ran, the checks file otherwise.
- **Jev questions** (one request per candidate, 14 questions; text from `story-rubric.json`, seeded from `_nemo.md` at build time):
  - Gate summary Nouls (3): vividness, scene coherence, animal harm, each worded so yes = pass.
  - Axis Scores (3): anchor fidelity, meaning-carry, vividness over three levels; Jev answers 0–2, axis score = that + 1. `jev.js` gains a `score(instructions, levels)` helper beside `noul`.
  - Split-out Nouls (8, first draft), yes = pass:
    - vividness: one specific moment, not a generic situation? · more than a restatement of the definition? · drawable as a single picture?
    - scene-coherence: the whole sentence in one setting (not two places stitched together)? · every object physically there at the same time?
    - animal-harm: no animal hurt or injured? · no animal eaten, cooked or hunted? · no animal mistreated or made to suffer?
- **Rules:**
  - A Noul passes at p ≥ 0.5. A gate passes only when its summary and every split-out Noul pass.
  - Rank: passing every gate (hard + judgment) first, then total descending, then shorter sentence, then alphabetical.
  - An unusable Jev answer (missing, out of range) is a Jev failure → fallback; never guessed.
  - The logged-story path skips `judge-stories` along with the other drafting steps.
  - `story-rubric.json`'s test checks only its own shape: every gate has a summary and ≥ 1 split-out question, every axis 3 levels.
- **Edge cases:** every candidate failed a hard gate → no Jev call, no-pick; one candidate passed the hard gates → still judged, can still be no-pick; a malformed `story-rubric.json` → crash, exit 2, fallback (loud in the report); proxy from a CN address → already handled by `jev.js`.

## Open questions
- [ ] Split-out question wording is a first draft; it gets fixed when the story is built.
- [ ] Every Noul passes at p ≥ 0.5; a gate needs all 3–4 of its questions to pass, so false fails may stack. Raw p's are saved, so the cut-off can be re-tuned without calling Jev again.
- [ ] The split judge isn't the one SP-037's blind check validated (17/20). After the build, re-run `spikes/sp-037/blind.js` with it to see if that holds. Cost accepted.
- [ ] Each card now costs 5 candidates × 14 Jev questions; US-034 measures it.
- [ ] `jev.js`'s `score` helper follows SDK 0.6's wire format (the spike's `package.json` version).
- [ ] US-040 (in progress) also edits `dags/card.yaml` and `report.js`; expect a merge conflict, not a build dependency.
