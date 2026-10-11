---
id: SP-037
type: spike
parent: E01
status: ready
timebox: 1d
---
# SP-037 Does Jev pick the story Flash would?

**Why now:** Unblocks US-038 (Jev judges and picks the story). If Jev rarely agrees with Flash, the auto-pick changes shape before it's built.
**Method:** A prototype `judge-story` CLI turns each gate and score axis in `_nemo.md` into one Jev question about a candidate. No past candidates are saved (`data/mnemonics/alternates.jsonl` doesn't exist yet), so for each test word, Flash's logged story is mixed in with fresh `_nemo` candidates.
**Done when:** For 20 words from `data/mnemonics/log.jsonl`, we have the rate at which Jev ranks Flash's story first and in the top two, plus a go / no-go for auto story pick. **Go** if Flash's story ranks 1st for at least 40% of judged words (chance is about 17%) and in the top 2 for at least 65% (chance is about 33%); otherwise no-go. The bar is fixed before the run.

## Acceptance criteria

```gherkin
Given  20 words sampled from the mnemonic log, each with Flash's logged story
  - When  the spike run builds each word's candidate set
    - Then  each set holds Flash's story plus 5 fresh candidates from the current story-drafting step
    - And   a fresh candidate that matches Flash's story word-for-word is dropped and replaced
    - And   the candidates are shuffled, and nothing marks which one is Flash's
```

```gherkin
Given  one candidate story and its word's sense, IPA and keywords
  - When  the prototype story judge scores it
    - Then  it gives a pass/fail for each judgment gate in the story rubric (vividness, scene coherence, same-root anchor, animal harm)
    - And   it gives a 1–3 score for each axis (anchor fidelity, meaning-carry, vividness) and a total out of 9
    - And   each answer comes from its own Jev question, one question per gate or axis
```

```gherkin
Given  every candidate for a word has been judged
  - When  the candidates are ranked
    - Then  a candidate that fails any gate ranks below every candidate that passes
    - And   ties on the total are broken the same way on every run
```

```gherkin
Given  all 20 words have been ranked
  - When  the spike report is written
    - Then  it shows the share of words where Flash's story ranks 1st, and the share where it's in the top 2
    - And   it shows these next to the rate expected by chance
    - And   it lists each word where Flash's story failed a gate, along with that gate
    - And   it ends with a go or no-go for auto story pick, against the threshold agreed in advance
```

```gherkin
Given  Jev can't answer a question for a candidate (error or unusable answer)
  - When  the spike run hits it
    - Then  that word is reported as unjudged instead of being guessed
    - And   the rates are computed over the judged words only, with the count shown
```

## Logic sketch
- **Approach:** throwaway prototype under `spikes/sp-037/`, not `scripts/`. Only `judge-story` follows EN-036's step contract, so US-038 can promote it instead of rewriting it. Jev is called through TypeSafe's JS SDK (`@typesafe-ai/sdk`, `new TypeSafeClient()`, key `TYPESAFE_API_KEY` from the repo's gitignored `.env`); the spike has its own `package.json` because `scripts/` is stdlib-only. Whether US-038 keeps the SDK or calls the HTTP API with `fetch` is decided there.
- **Entities** (names shared with US-028):
  - TestWord: word, sense, syllables, keyword, flashSentence, flashPivots
  - StoryCandidate: sentence, pivot_words, source (flash | fresh; hidden from the judge)
  - Judgment: gateResults (gate → probability of yes, pass at ≥ 0.5), axisScores (axis → 1–3, decimal), total, raw probabilities, unjudged?
  - WordResult: flashRank, candidateCount, failedGates for Flash's story
- **Steps:**

  | Step | Executor | Does |
  |---|---|---|
  | `sample` | code | 20 words, fixed seed; skips rows whose sentence contains the headword (8 of 160 today); latest row per word |
  | `draft` | `claude -p` | 5 fresh candidates from a prompt built on `_nemo.md`'s process and gates; given word, sense and IPA, never Flash's story |
  | `judge-story` | code + Jev | hard gates in code first (headword, ≤ 10 words, pivot order — US-028's `check-story` rules), then one `systemOne` call per candidate |
  | `rank` | code | passing candidates first, then total descending; ties → shorter sentence, then alphabetical |
  | `report` | code | `spikes/sp-037/report.md` |

- **`judge-story` contract:** `judge-story <word> <sense> <sentence> <pivots> <chunk-keywords-file>` → one line per gate `gate\tpass|fail\tp`, one per axis `axis\tscore`, then `total\tN`; exit 2 if Jev fails. The state is word, sense, IPA chunks, sentence and pivots; all questions go in the one call and run in parallel:
  - Noul per judgment gate: vividness, scene coherence, same-root anchor, animal harm.
  - Score per axis, three levels taken verbatim from `_nemo.md`'s 1/2/3 rubric text: anchor fidelity, meaning-carry, vividness. Jev returns 0–2; axis score = that + 1.
- **Rules:**
  - A fresh candidate equal to Flash's after normalizing (lowercase, punctuation stripped) is redrafted once, then dropped.
  - Chance baseline per word is 1/n for 1st and 2/n for top 2, n = that word's candidate count; the report averages it.
  - Raw probabilities are saved, so a different gate cut-off or axis weight re-ranks without calling Jev again.
  - The go / no-go bar is the one in **Done when**, fixed before the run.
- **Edge cases:** fewer than 5 usable fresh candidates → run with what came back, smaller n; Flash's story fails a hard gate → listed and counted as a miss; Jev fails on any candidate → the whole word is unjudged; a combo keyword like "company + tense" → split on `+` for pivots.

## Open questions
- [ ] Log rows don't record whether Flash picked the story or `/prepare-words` auto-picked it. Assumed all are Flash's picks, since `alternates.jsonl` (which `/prepare-words` writes) doesn't exist.
- [ ] Fresh candidates follow today's `_nemo.md`, while some logged stories predate its later rules. Assumed acceptable; the report's failed-gate list shows how much it matters.
- [ ] A Noul pass cut-off of 0.5 is a starting point; the saved probabilities let the report try others.
- [ ] `TYPESAFE_API_KEY` goes in `.env` at the repo root (Flash is adding it).
