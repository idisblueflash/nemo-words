---
name: shorten-story
description: |
  Shortens an already-existing 🎭 story (mnemonic sentence) for a word that's already
  been explained. Takes four inputs — the word, its plain-language explanation, its
  🔊 rhythm/sound anchor(s), and the current story text — and drafts three shorter
  candidate rewrites, each still hitting the sound anchor(s) in order, the meaning, and
  a single vivid scene. Then scores all three against those three elements and names the
  best fit. Use when the user says "shorten this story", "make <word>'s story shorter",
  or hands over a word + existing story that's too long/wordy and wants a tighter version.
  Not for brainstorming a brand-new story from scratch (see `_nemo`) — the story must
  already exist; this skill only compresses it. Not for saving the result — that's
  `update-anki-story`, and only after a human confirms the pick.
---

# Shorten Story

## Your role

You take a word's **existing** 🎭 story sentence — already written, already saved or
drafted, but too long or cluttered — and compress it into three tighter candidates
without losing what makes it work: the sound anchor(s), the meaning, and a single vivid
scene. You do not invent a new story from a blank page (that's `_nemo`'s job); you
rewrite the one you're given, shorter.

**What you need before you start:**

- The **word** itself
- Its **explanation** — plain-language definition (what it means)
- Its **rhythm** — the 🔊 sound anchor(s) already established for it (e.g. "concede"
  anchors on "seeds"; a two-chunk word may have two anchors that must appear in order)
- The **story** — the current story sentence, in full

If any of these is missing, check `grep -i "^<word>\b" anki/reading-room-terms.txt` and
`node scripts/find-mnemonic.js <word>` first (fast path to the word's saved card + logged
story) before asking the requester — don't invent a definition or sound anchor from
nothing, and don't shorten a story you haven't been given.

---

## Step 1 — Take the story apart

Before drafting anything, identify what the current story is actually doing:

1. **Which words in the sentence carry the sound anchor(s)?** List each anchor word/name
   and the pronunciation chunk it stands for, in left-to-right order.
2. **Which words carry the meaning?** What scene or action in the sentence depicts the
   word's actual definition?
3. **What is the single image?** One concrete, drawable moment — not a restated
   definition.

Anything in the current sentence that isn't doing one of those three jobs (connective
tissue, a second clause, redundant description) is the fat to cut.

---

## Step 2 — Draft three shortened candidates

Each candidate must satisfy all of:

1. **Shorter than the original**, and no more than 10 words. Count with `wc -w` — don't
   eyeball it:
   ```bash
   echo "candidate sentence here" | wc -w
   ```
2. **Same sound anchor(s), same order.** Don't swap to a different anchor and don't
   reorder multi-chunk anchors — the rhythm from Step 1 must still be audible when the
   sentence is read aloud. (Trimming a clause around an anchor is fine; replacing the
   anchor word itself is not — that's a new story, not a shortened one.)
3. **Same meaning still legible.** Cutting words must not cut the scene that depicts the
   definition — if the compressed sentence could describe a different word just as well,
   it's cut too much.
4. **Still one vivid, single scene.** Not a fragment or a list of nouns — it must remain
   something you could draw as one picture.

Vary *how* each candidate compresses (which clause gets dropped, which words get fused)
so the three are genuinely different attempts, not near-duplicates of each other.

---

## Step 3 — Score each candidate and pick the best

Score all three candidates against the same three elements, each on a simple
fit scale (✅ full / ⚠️ partial / ❌ lost):

| Candidate | 🔊 Rhythm (anchor order intact) | 📖 Meaning (definition still legible) | 🎬 Vivid scene (one drawable image) |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

The best candidate is the one with the most ✅s across all three columns — not just the
shortest, and not just the one that reads most smoothly. If two candidates tie, prefer
the shorter one; if still tied, prefer the one whose image is more specific/surprising
over a generic one.

A candidate that loses (❌) any single element is disqualified even if it's the
shortest — a short sentence that drops the sound anchor or the meaning isn't a shortened
story, it's a different, weaker one.

If **all three** candidates lose the same element, that element wasn't actually
compressible at this length — say so, and offer a fourth candidate a word or two longer
that keeps it, rather than forcing a bad pick from the table.

---

## Output format

Return exactly this:

```
## <Word> — shortened story candidates

Original: "<original story>" (<N> words)

1. "<candidate>" (<n> words)
   Anchors: "<chunk>" → <word>[, ...]
2. "<candidate>" (<n> words)
   Anchors: ...
3. "<candidate>" (<n> words)
   Anchors: ...

| Candidate | 🔊 Rhythm | 📖 Meaning | 🎬 Vivid scene |
|---|---|---|---|
| 1 | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/❌ |
| 2 | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/❌ |
| 3 | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/❌ |

**Best fit: Candidate <N>** — <one line on why it wins the table above>.
```

Then stop — do not save anything. If the requester confirms the pick, saving is a
separate step via the `update-anki-story` skill — never write the Anki collection or
the mnemonic log from inside this skill.

## What this skill doesn't do

- Doesn't invent a new story or new sound anchor — it only compresses an existing
  sentence around anchors that are already fixed. For a from-scratch story, use `_nemo`.
- Doesn't save the winning candidate anywhere — recommending "Candidate N" is not the
  same as writing it to Anki. That only happens once a human confirms.
- Doesn't silently pick when the table is tied or all candidates lose the same element
  — flag it instead of forcing a pick that isn't actually better.
