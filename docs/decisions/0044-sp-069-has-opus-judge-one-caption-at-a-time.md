---
status: accepted
deciders: Flash Hu
date: 2026-10-18
backlog: [SP-069]
---

# 0044. SP-069 has Opus judge one caption at a time

Technical Story: SP-069 (refine, 2026-10-18)

## Context and Problem Statement

In SP-069, Opus judges the cell captions of Sonnet, Haiku and local vision models. The local models arrive in rounds: `qwen/qwen3-vl-4b` now, `phi-3.5-vision` and `llama-3.2-vision` when their download ends. The judging method decides how consistent the scores are and what a new round costs.

## Considered Options

* One caption at a time: Opus sees one cell, its must-see list and one caption, without the model's name; each judgment is cached by cell and model
* All models side by side: Opus sees all the captions of one cell together, in a random order

## Decision Outcome

Chosen option: "One caption at a time", because a new model in a later round needs only its own judgments, and the cached judgments of earlier rounds stay valid.

### Positive Consequences

* Round 2 pays only for the new models.
* Opus can't prefer a caption because of the model's name or its place in a list.

### Negative Consequences

* Opus has no other caption to compare with, so its scores can drift more from cell to cell than in a side-by-side judgment.

## Pros and Cons of the Options

### One caption at a time

* Good, because judgments are cached and reused across rounds.
* Bad, because each score is absolute, with no comparison.

### All models side by side

* Good, because a comparison gives more consistent scores.
* Bad, because every new model makes all the judgments of that cell again.
