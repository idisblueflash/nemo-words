---
status: accepted
deciders: Flash Hu
date: 2026-09-07
---

# 0009. Colour _vivian's line art with light gouache colour blocks

## Context and Problem Statement

ADR-0006 set the colour rule as a single flat spot colour on the one
mnemonic hook element, monochrome everywhere else. In practice that reads as
stark and under-illustrated — one orange object floating in black-and-white
line art. The deck wants a warmer, more finished look while still keeping
the line art (ADR-0008) doing the memory work and staying legible cropped
small. A set of light colouring treatments was surveyed to pick a new
default.

## Considered Options

* Selective orange accent (the ADR-0006 status quo — one spot colour on the
  hook)
* Light gouache colour blocks — soft, slightly chalky flat fills across the
  main shapes
* Coloured-pencil tinting
* Flat pastel fills
* Warm sepia wash
* Cool grey marker rendering
* Blue ink wash
* Muted storybook palette
* Soft watercolour wash

## Decision Outcome

Chosen option: "Light gouache colour blocks", because it fills the whole
scene with soft, naturalistic colour — warmer and more finished than a
single accent — while the flat, low-saturation blocks stay simple enough not
to fight the brush-pen line art or muddy a small crop. Washes (sepia, blue,
watercolour) and single-tone renderings were rejected as either too
monochrome (barely better than plain B&W) or too wet/uneven to stay crisp
at flashcard size.

### Positive Consequences

* Cards look finished and inviting, not like an uncoloured sketch
* Flat gouache blocks keep colour readable when a grid cell is cropped small
* Still a single fixed recipe layered on the ADR-0008 line style

### Negative Consequences

* Gives up the ADR-0006 selective-attention cue — colour no longer points
  at one element, so the line art alone must carry the "what to remember"
  emphasis
* Naturalistic full-scene colour buys less recall benefit than the
  evidence-backed single-cue approach it replaces
* More colour surface for the imagegen model to get wrong (bleed, wrong
  hue, over-saturation) and catch on review

## Links

* Supersedes ADR-0006 (B&W manga line art with one spot colour)
* Builds on ADR-0008 (brush-pen comic line style)
* [.claude/agents/_vivian.md](../../.claude/agents/_vivian.md)
