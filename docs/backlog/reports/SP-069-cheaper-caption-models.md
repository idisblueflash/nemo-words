# SP-069 Can a cheaper model caption the grid cells as well as Sonnet?

Date: 2026-10-19. Branch: worktree-sp-069. Code and caches: `spikes/sp-069/`.

## Summary

No model is a go yet.
The best model is the local `qwen/qwen3-vl-8b`.
On all 20 grids, its mean score is 88% of Sonnet's score, and 98% of its captions parse.
The go bar (ADR-0043) asks for at least 90% of Sonnet's score and at least 95% parsed.
So the 8B model passes the parse bar and misses the score bar by 2 points.
Haiku (87%) and `qwen/qwen3-vl-4b` (86%) scored lower than the 8B model on the first 5 grids.
Haiku also named 8 objects that the cells don't show.

The weak parts are the same for every model: the must-see marks and the size and place.
A JSON schema in LM Studio makes every caption parse, but it doesn't raise the score.

## What ran

- Grids: the 20 SP-066 tuning grids, 9 cells each (180 cells), in SP-066's order:
  anomaly, ventilator, period, surgeon, sweep, then 15 more.
- Sonnet: SP-066's cached captions, with no new calls.
- Judge: Opus scores each caption alone (ADR-0044), each part 1–3, and lists the objects
  that the caption names but the cell doesn't show.
- Stages: 1 → 3 → 5 → 20 grids.

| Model | Grids | Why it stopped there |
|---|---|---|
| `qwen/qwen3-vl-4b` | 5 (45 cells) | It scored lower than the 8B model. Flash ran stage 4 with the 8B model only. |
| Haiku | 5 (45 cells) | Same as above. It also costs money and invents objects. |
| `qwen/qwen3-vl-8b` | 20 (180 cells) | All stages ran. |
| `qwen/qwen3-vl-8b` + JSON schema | 5 (45 cells) | An extra test that Flash asked for after stage 4. |
| `phi-3.5-vision` | 0 | LM Studio's MLX backend answers every request with HTTP 400. |
| `llama-3.2-vision` (11B) | 0 | In the probe, its answers didn't match the pictures. |

So the **Done when** lines that ask for 180 cells have that answer for the 8B model only.
For Haiku and the 4B model, the answer is on 45 cells.
Flash chose to stop them there, because the 8B model was ahead on every stage.

## Done when 1: Opus's mean score next to Sonnet's

### All 20 grids (180 cells)

| Part | Sonnet | `qwen3-vl-8b` |
|---|---|---|
| **Mean** | **2.86** | **2.53 (88% of Sonnet's)** |
| must-see marks | 2.72 | 2.03 |
| size and place | 2.88 | 2.24 |
| action line | 2.91 | 2.69 |
| drawing errors | 2.94 | 2.93 |
| onlookers | 2.85 | 2.77 |
| main-subject view | 2.87 | 2.47 |

### The first 5 grids (45 cells), every model

| Part | Sonnet | `qwen3-vl-4b` | Haiku | `qwen3-vl-8b` | `qwen3-vl-8b` + schema |
|---|---|---|---|---|---|
| **Mean** | **2.86** | **2.45 (86%)** | **2.48 (87%)** | **2.56 (90%)** | **2.52 (88%)** |
| must-see marks | 2.67 | 2.11 | 2.09 | 2.14 | 2.00 |
| size and place | 2.91 | 2.25 | 2.39 | 2.41 | 2.40 |
| action line | 2.91 | 2.45 | 2.36 | 2.59 | 2.58 |
| drawing errors | 2.87 | 2.77 | 2.70 | 2.77 | 2.80 |
| onlookers | 2.93 | 2.86 | 2.84 | 2.95 | 2.91 |
| main-subject view | 2.89 | 2.23 | 2.57 | 2.54 | 2.44 |

The 8B model's share of Sonnet's score over the stages: 91% (1 grid), 88% (3 grids),
90% (5 grids), 88% (20 grids). It stays near the bar, and the bigger set puts it below.

Where the cheaper models lose points:

- **Must-see marks.** The models often mark an item "visible" when the edge of the cell
  cuts it, or when only a small part of it shows. Sonnet marks it "partly cut".
- **Size and place.** The models guess the size and place of items less well than Sonnet.
- **Main-subject view.** The models often give the wrong view (front, side or
  three-quarter) of the main subject.
- **Drawing errors and onlookers.** The cheaper models are almost as good as Sonnet here.

The checks after each stage held: a re-run made no new calls, and Opus gave Sonnet's
captions scores that differ between cells (on 20 grids, 0.83 between the lowest and the
highest caption). Opus scored Sonnet's captions high (2.86), so the judge prompt is not
the problem.

## Done when 2: captions that parse, and invented objects

| Model | Cells | Parsed | Invented objects |
|---|---|---|---|
| Sonnet | 180 | 180 (100%) | 0 |
| `qwen3-vl-8b` | 180 | 177 (98.3%) | 3 |
| `qwen3-vl-4b` | 45 | 44 (97.8%) | 2 |
| Haiku | 45 | 44 (97.8%) | 8 |
| `qwen3-vl-8b` + schema | 45 | 45 (100%) | 0 |

Why captions failed to parse:

- `qwen3-vl-8b`: anomaly cell 7 and appeal cell 2 give an onlooker `"does": "react"`, not
  `"reacts"`. Appeal cell 3 has no action line.
- `qwen3-vl-4b`: anomaly cell 1 gives `"does": "points at the cracked tile"`.
- Haiku: anomaly cell 4 gives the shot `"overhead"`, which is not in the list of shots.

The objects that the captions named but the cells don't show:

- `qwen3-vl-8b`: a desk (spilled cell 4), a shield (wore cell 9), a "fourth gray bird"
  (hypernym cell 9).
- `qwen3-vl-4b`: a patient (surgeon cells 2 and 4).
- Haiku: a window (anomaly cells 1, 2 and 8), the sky and chairs (period cells 4 and 8),
  a medical gas container and overhead lights (surgeon cells 2 and 5), headphones
  (sweep cell 4).

### The JSON schema test

LM Studio takes a JSON schema as `response_format` and lets the model write only JSON that
fits it (`spikes/sp-069/lib/schema.js`). The schema holds the fixed lists (marks, sizes,
places, views, what an onlooker does) and asks for an action line that is not empty.
Run it as the model `qwen/qwen3-vl-8b+schema`.

- All 45 captions parse, 1 more than without the schema.
- The mean score is 2.52, against 2.56 without the schema. Opus's scores change a little
  from run to run, so the schema is about neutral for the score.
- The model is about 15% faster: 18.8 s for each cell, against 22.2 s.

The schema fixes the format of a caption, but not what the model sees.

## Done when 3: cost or time for each grid

| Model | Time for each cell | Time for each grid | Cost for each grid |
|---|---|---|---|
| `qwen3-vl-8b` | 22.0 s | about 3.3 min | $0 |
| `qwen3-vl-8b` + schema | 18.8 s | about 2.8 min | $0 |
| `qwen3-vl-4b` | 13.0 s | about 2.0 min | $0 |
| Haiku | 20.7 s (4 at a time) | about 0.8 min | $0.24 |

The local models run on the Mac mini, one request at a time. Haiku's cost comes from the
`claude -p` cost of each call, which includes the prompt cache.

## Done when 4: go / no-go

| Model | Score (bar: 90% of Sonnet's) | Parsed (bar: 95%) | Verdict |
|---|---|---|---|
| `qwen3-vl-8b` | 88% on 180 cells | 98.3% | **no-go**: the score is 2 points below the bar |
| `qwen3-vl-8b` + schema | 88% on 45 cells | 100% | **no-go**: the score is below the bar |
| Haiku | 87% on 45 cells | 97.8% | **no-go**: the score is below the bar, and it invents objects |
| `qwen3-vl-4b` | 86% on 45 cells | 97.8% | **no-go**: the score is below the bar |
| `phi-3.5-vision` | — | — | not run: HTTP 400 from LM Studio's MLX backend |
| `llama-3.2-vision` | — | — | not run: its answers don't match the pictures |

**Verdict: no-go.** No cheaper model reaches 90% of Sonnet's score.
The 8B model is the closest: it is free, it parses well, and it is 2 points below the bar.

Possible next steps:

- A prompt change for the must-see marks, so that a local model marks an item "partly cut"
  when the edge of the cell cuts it. Must-see is the part with the biggest gap
  (2.03 against 2.72).
- A bigger local vision model, when one is available on the Mac mini.
- The go bar compares scores only. A model near the bar may still give the same Jev
  pick as Sonnet's captions (ADR-0043 leaves that test for later).
