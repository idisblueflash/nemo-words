---
status: accepted
deciders: Flash Hu
date: 2026-09-09
---

# 0010. _vivian style-QA compares against the anchor image, not an adjective checklist

## Context and Problem Statement

ADR-0008 (brush-pen line) and ADR-0009 (light gouache blocks) fixed the
house style, and `docs/mnemonics/style-anchor.png` is its canonical
example: soft tapered brush/pencil contour with visible tooth and a slight
wobble, semi-transparent washes that bleed past the ink edge, a muted
natural palette, loose hatching for shadow — painterly, hand-media.

`_vivian.md` step 4 told the agent to style-QA each generated sheet
**against the written house-style criteria, explicitly not against the
anchor** ("check it against the house-style criteria, not against the
anchor, which has its own flaws"). The written criteria reward "cel-shaded,
at most 3 flat value steps, hard edges, one flat colour per area" and
penalise "volumetric/rendered shading, soft gradients". Read literally with
no reference image in hand, that description matches a **generic flat-vector
illustration** — thick uniform digital ink, hard cel fills, high contrast —
better than it matches the anchor, which is softer and more painterly than
its own prose spec.

Observed on the `ancestor` grid (2026-09-09): pass 1 was close to the
anchor (warm washes, textured clay, organic line, sketchy backgrounds).
_vivian's QA scored pass 1's soft washes as "volumetric rendered shading,
gradients" and regenerated. Pass 2 "cleaned up" — crisper lines, flatter
colour, more contrast — into flat-vector, and QA passed it as the
deliverable. The reroll made it worse and the QA judgment was inverted.

Two structural causes:

1. **The QA lever is unanchored.** Judging against adjectives instead of
   the reference image lets "on-style" drift wherever the adjective list
   points — and the list points at flat-vector.
2. **Rerolls drift toward the model's prior.** Told "regenerate to fix
   drift", gpt-image-2 reliably crisps lines, flattens colour and raises
   contrast — toward its flat-illustration default and away from
   hand-media. A QA loop whose only action is "regenerate" makes a
   borderline pass *worse* on average.

## Considered Options

* **Keep QA against the written checklist** (status quo) — self-consistent
  with the ADR prose, but the prose itself mis-describes the anchor, so
  this bakes in the drift.
* **QA as a direct A/B visual comparison against `style-anchor.png`** —
  "does this look like it came from the same hand as the anchor?" — with
  the checklist demoted to a list of *named failure modes* (things the
  anchor is NOT), and a conservative reroll rule.
* **Drop QA entirely, always hand back both passes** — removes the
  inverted judgment but loses the cheap catch of a genuinely broken sheet.
* **Fix the anchor / regenerate a cleaner anchor** — doesn't address the
  process bug; a "cleaner" anchor would push *further* toward flat-vector,
  which is the wrong direction.

## Decision Outcome

Chosen option: **QA as a direct A/B visual comparison against the anchor
image**, with three changes to `_vivian.md`:

1. **Step 4 QA is "same hand as `style-anchor.png`?"** — open the saved
   grid and the anchor together and judge whether they read as the same
   illustrator's work: line character (tapered, toothy, slightly wobbly —
   not uniform digital ink), colour handling (soft washes that break the
   ink edge — not hard flat cel fills), contrast (gentle — not high),
   palette (muted natural). The adjective list stays only as *named reject
   states*: "flat vector / uniform bold digital ink / high-contrast cel /
   glossy 3D render" — not as positive targets.

2. **Conservative reroll rule.** A pass that is *close* is **kept**, not
   rerolled — second passes drift toward flat-vector. Reroll only on a
   clear, describable failure (garbled scene, wrong hook, texture the
   anchor plainly doesn't have). When rerolling, the reroll prompt
   re-attaches the anchor and says "keep the hand-media feel — soft washes,
   toothy tapered line — do NOT clean up or sharpen the line."

3. **Report both passes.** When a reroll happened, hand back *both* grid
   paths and describe how they differ against the anchor; do not
   self-declare one "the deliverable". The human picks which is on-style.

The "if a regenerated sheet comes out cleaner than the anchor, the anchor
should be promoted" note is removed — cleaner is the wrong direction.

### Positive Consequences

* QA judgment is pinned to a fixed reference, so "on-style" can't wander.
* The systematic reroll-toward-flat-vector drift is stopped at the source:
  borderline passes are kept, not "improved".
* The human sees both passes when they disagree, instead of trusting an
  inverted auto-pick.
* Same root fix applies to `_cora` and to any future parallel batch — the
  reference image, not prose, is the arbiter.

### Negative Consequences

* QA now depends on the anchor being genuinely representative; a bad anchor
  silently sets a bad bar (mitigated: anchor changes are a deliberate,
  human-reviewed swap, still never silent).
* "Close enough, keep it" is a judgment call — some mildly off sheets ship
  that a stricter loop would have rerolled. Accepted: the reroll cure was
  worse than the disease.
* Slightly more caller/human involvement when a reroll happens (two grids
  to look at instead of one).

## Links

* Builds on ADR-0008 (brush-pen comic line style) and ADR-0009 (light
  gouache colour blocks) — unchanged; this ADR only changes how conformance
  to them is *checked*.
* [.claude/agents/_vivian.md](../../.claude/agents/_vivian.md)
* [docs/mnemonics/style-anchor.png](../mnemonics/style-anchor.png)
