---
status: accepted
deciders: Flash Hu
date: 2026-10-18
backlog: [SP-069]
---

# 0043. SP-069 judges a cheaper caption model by its Opus score alone

Technical Story: SP-069 (refine, 2026-10-18)

## Context and Problem Statement

SP-066 captions each of the 9 cells of a grid with Sonnet, so the image pick costs 9 Sonnet calls per word. SP-069 compares Haiku and local LM Studio vision models (`qwen/qwen3-vl-4b` first; `phi-3.5-vision` and `llama-3.2-vision` in a later round) with Sonnet's cached SP-066 captions, and Opus judges the captions. The spike needs a go bar that says when a cheaper model is good enough.

## Considered Options

* Opus score only: go when the model's mean Opus score is at least 90% of Sonnet's and at least 95% of its captions parse
* Opus score, then the Jev pick: a model that passes the Opus bar also goes through SP-066's Jev pick on the 20 grids, and goes only if Jev picks Flash's cell as often as with Sonnet's captions

## Decision Outcome

Chosen option: "Opus score only", because it answers the caption question with no Jev calls, and each new local model in a later round costs only its captions and their judgments.

### Positive Consequences

* The spike stays inside its 1-day timebox and spends nothing on Jev.
* Each round adds models with the same bar, so the results stay comparable.

### Negative Consequences

* A model that passes still has to show in the Jev pick that its captions lead to Flash's cell; a caption that Opus scores well can still lose detail that the pick needs.

## Pros and Cons of the Options

### Opus score only

* Good, because it needs no Jev calls.
* Good, because it measures the captions directly, part by part.
* Bad, because it doesn't show the effect on the image pick.

### Opus score, then the Jev pick

* Good, because it is closer to the real use in US-030.
* Bad, because it costs Jev calls for each model that passes, and Jev's own noise (2 or less on the 20 tuning words, ADR-0041) can hide a small difference.
