---
status: accepted
deciders: Flash Hu
date: 2026-09-07
---

# 0008. Use a brush-pen comic line style for _vivian's line art

## Context and Problem Statement

ADR-0006 fixed the house style as black-and-white line art with one spot
colour, but left the *line quality* unspecified. In practice the imagegen
model defaults to a clean, even-weight contour that reads as "vector / AI
line-art" — mechanically uniform, little sense of a hand. That flatness
works against the goal of a memorable, characterful flashcard. A set of
freehand / varied-line-weight registers was surveyed to pick a default that
keeps the picture simple but feels hand-drawn.

## Considered Options

* Expressive ink sketch — loose hand-drawn strokes, thick/thin pressure
  changes, some broken lines
* Brush-pen comic — strong contrast between bold outer contours and thin
  interior details
* Loose children's illustration ink — playful shaky lines, soft pressure
  changes, very readable but not mechanical
* (also weighed: gesture line art, dry-brush ink, pencil-to-ink sketch,
  urban sketch line art, sumi-e comic line, scratchy indie-comic line)
* Status quo — clean even-weight line ("vector/AI line-art" look)

## Decision Outcome

Chosen option: "Brush-pen comic", because its bold outer contour / thin
interior contrast keeps a cropped cell instantly readable at flashcard size
(the ADR-0006 legibility driver) while the line-weight variation removes the
mechanical vector feel. Expressive ink sketch and loose children's ink were
the close runners-up; both trade a little small-size clarity for more
looseness, which the brush-pen contrast keeps without that cost.

### Positive Consequences

* Cards look hand-drawn, not machine-traced — more character, more memorable
* Bold outer contours hold up well when a grid cell is cropped small
* Still a single fixed recipe, layered on top of ADR-0006

### Negative Consequences

* Narrows the register further — one more constraint the imagegen prompt
  must land, and stray uniform-weight output will need catching on review
* Brush-pen contrast can lose fine interior detail on busy scenes

## Links

* Refines ADR-0006 (B&W manga line art with one spot colour)
* [.claude/agents/_vivian.md](../../.claude/agents/_vivian.md)
