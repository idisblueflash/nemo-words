---
status: accepted
deciders: Flash Hu
date: 2026-09-07
---

# 0006. Black-and-white manga line art with one spot colour as _vivian's mnemonic-image house style

## Context and Problem Statement

The `_vivian` subagent turns a vocabulary word plus its mnemonic sentence
into a picture whose job is to make the word stick. Until now the brief
let `_vivian` pick any single medium per word (e.g. "flat gouache
children's-book illustration"). That left the visual language of the deck
inconsistent and unanchored in any evidence about what actually aids
recall. A web survey of the memory literature was done to settle on a
default:

* Sparse line drawings are processed faster and retained longer than
  photographs or densely detailed illustrations, and stay legible when
  cropped small (Keith-Hirst on visual mnemonics; the drawing-and-memory
  work).
* Colour gives a memory boost mainly when it is *naturalistic*; arbitrary
  or stylised colour adds little over black-and-white (Scientific
  American / APA scene-recognition studies).
* A single spot colour against monochrome acts as a selective-attention
  cue, pulling the eye to one element rather than decorating the whole
  frame.

## Decision Drivers

* Recall effectiveness of the finished flashcard
* Legibility of a single cropped cell at flashcard size
* Visual consistency across the whole deck
* Keeping the generation brief simple and repeatable

## Considered Options

* Full-colour illustration (painted / gouache / flat vector), style
  chosen per word
* Plain black-and-white manga line art, no colour at all
* Black-and-white manga line art with one flat spot colour on the key
  mnemonic hook element

## Decision Outcome

Chosen option: "black-and-white manga line art with one flat spot colour
on the key mnemonic hook", because it takes the fast-processing,
crops-well simplicity of line art and adds colour only where the evidence
says colour helps — as a signal pointing at the one thing the learner
must remember, not as decoration. The spot colour is held on the same
object across all nine grid stagings so the cue is consistent. Default
accent is a warm red-orange (`#E8462B`); the user may override the look
for a specific word, but this is the default and the fallback.

### Positive Consequences

* Every card in the deck shares one recognisable visual language
* Cropped cells stay readable at small sizes
* The eye is drawn straight to the mnemonic hook on each card
* The generation brief is now a fixed recipe rather than a per-word
  style decision

### Negative Consequences

* Gives up the richer, more inviting look of full-colour illustration
* Manga line art with screentone is a narrower stylistic register that
  may not suit every sentence's mood
* Relies on the imagegen model reliably confining colour to one element —
  stray colour will need to be caught on review

## Pros and Cons of the Options

### Full-colour illustration, style per word

* Good, because full colour is inviting and each word can get a fitting
  mood
* Bad, because per-word style choices make the deck incoherent, and
  detailed colour art is slower to read and muddier when cropped small
* Bad, because stylised (non-natural) colour buys little recall benefit
  over black-and-white

### Plain black-and-white line art, no colour

* Good, because maximally simple, fast to process, consistent
* Bad, because it throws away the one cheap, evidence-backed lever —
  a spot colour as an attention cue on the memory hook

### B&W manga line art with one spot colour

* Good, because it combines line-art simplicity and legibility with a
  targeted attention cue exactly where recall research says colour helps
* Good, because it is a fixed, repeatable recipe that keeps the deck
  visually coherent
* Bad, because it commits the whole deck to one fairly specific
  illustration register and depends on the model keeping colour
  contained

## Links

* [.claude/agents/_vivian.md](../../.claude/agents/_vivian.md)
