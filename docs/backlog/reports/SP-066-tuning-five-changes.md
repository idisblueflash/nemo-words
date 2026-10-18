# SP-066 — The 5 changes, tested one at a time

Date: 2026-10-18. Branch: worktree-sp-066. PR #62 (draft).

## Summary

I tested the 5 changes one at a time on the 20 tuning words.
I kept 3 of them and took 2 back.
The pick is better than before, but it is still below the go bar.
The go bar has two parts: exact ≥ 45% and in-three ≥ 70%.
I stopped before the measure stage, because the measure words can run only one time.

## Noise check first

I ran Jev two times on the same captions.
Exact + in-three changed from 16 to 14.
So I counted a change of 2 or less as noise.
Such a change stayed only if it moved its own target word toward your cell.

## Results

Start weights: 2·1·1. "Sum" is exact + in-three, out of 40.
"Rank" is the mean rank of your cell (lower is better).

| Change | Exact | In-three | Sum | Rank | Kept? |
|---|---|---|---|---|---|
| Before (stage 20) | 6 | 10 | 16 | 3.45 | — |
| 1. Plausible in 3 parts | 4 | 10 | 14 | 3.45 | Yes |
| 2. Vivid in 2 parts | 5 | 12 | 17 | 2.95 | Yes |
| 3. Main subject rule (2 ways) | 5–6 | 12 | 17–18 | 3.45 / 2.90 | No |
| 4. Size word ("tiny") | 5 | 14 | 19 | 2.90 | Yes |
| 5. Odd faces (2 ways) | 4 | 10 | 14 | 3.60 | No |

Notes on each change:

1. **Plausible in 3 parts** (setting, drawing, actions).
   The sum went down by 2. That is noise.
   But overreach and flustered moved toward your cells. So I kept it.
2. **Vivid in 2 parts** (scene, onlooker).
   flustered is now exact. I kept it.
3. **Main subject rule.** I took it back.
   appeal did not move toward your cell.
4. **Size word.** cottage moved from rank 4 to rank 3. I kept it.
5. **Odd faces as drawing errors.** I took it back. The sum went down.

## Where the pick is now

- Exact: 5 of 20 (25%).
- In-three: 14 of 20 (70%).
- With weights tuned on these words (3·2·3): exact 6 (30%), in-three 15 (75%).

So in-three meets its bar.
Exact is far below 45%.

## Why the 2 changes failed

### Change 3: the main subject rule

- First way: I changed the must-see prompt.
  - The new rule made the bell ringer appeal's main subject, as you said.
  - The view score of your cell 9 went from 1.18 to 2.44.
  - But cell 9 still lost on the scene part.
  - The new rule also made all the captions again.
    That moved other words away from your cells.
    For example, cocked went from rank 3 to rank 8.
- Second way: I changed only the view question in the rubric.
  - Jev ignored the change.
  - Jev still gave cell 9 a view score of 1.09.

### Change 5: odd faces as drawing errors

- First way: the caption question lists odd faces and hands.
  The captioner found no odd face in appeal.
- Second way: a short question about faces only, on appeal cells 6, 9 and 1.
  It also found no odd face.
- I looked at cell 6 myself.
  The faces are drawn as caricatures (wide eyes, open mouths).
  That is the drawing style, so a check for drawing errors can't catch it.

## One more finding

Each change that makes the captions again moves the sum by up to 5.
That is larger than most of the changes themselves.
So these 20 words can't show small effects.

## Checks

- QA passed all 7 scenarios with the fake Claude and the mock Jev.
- The spike tests pass: 153 of 153.
- I wrote ADR-0039 and two concepts: C-048 (onlooker) and C-049 (axis part).
- The item's scenarios now describe only the 3 changes that I kept.
- Every stage has its own commit. Each roll-back also has its own commit.

QA suggested 2 new scenarios. No scenario covers them today:

1. An empty word list (`--words ""`) should stop with exit 2.
   Today it exits 0.
2. Sometimes the usage-limit answer gives the reset time as a number.
   Then the message should show a local time.
   Today it says only "later".

## Your decision

In-three now meets its bar. Exact (25%) is still far from 45%.

- **Option A: run the measure stage now.**
  This gives the real go or no-go on the 62 held-out words.
  After it runs, the design can't change.
- **Option B: do one more round of tuning first.**
  But on 20 words, the noise is about as large as the gains.

I recommend option A.
If you say go, I will run `--stage measure`.
