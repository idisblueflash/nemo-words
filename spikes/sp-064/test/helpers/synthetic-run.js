"use strict";

// Builds a raw run (run.json) of 20 tuning + 62 measured words with known
// outcomes, for the report tests. Each word has 3 scored cells (all medium
// shots, step "during", not a sequence), and cells 4–9 gated out:
//   cell 1: plausible 1, vivid v, clarity 3   total 5 + v
//   cell 2: plausible 3, vivid 1, clarity 1   total 8        (with 2, 1, 1)
//   cell 3: plausible 2, vivid 1, clarity 1   total 6
// Tuning words: v = 2 and Flash's cell 2, so weights with plausible 2 get
// all 20 right; plausible 1 gets them all wrong (cell 1 wins).
// Measured word i (0–61): v = 3 − 0.03·i, so the margin is 0.03·i (word 0 is
// a tie, decided by the higher plausible); the main cell's weakest
// confidence is 0.99 − 0.005·i. Flash's cell:
//   i 0–20   cell 9   miss, not in three, neither main nor alternative
//   i 21–40  even → 2 (exact), odd → 1 (in three, the alternative)
//   i 41–61  cell 2   exact
// So with 2, 1, 1: exact 31/62, in three 41/62, main 31, alternative 10.

const s = (plausible, vivid, clarity, conf = 0.9) => ({
  plausible: { score: plausible, confidence: conf },
  vivid: { score: vivid, confidence: conf },
  clarity: { score: clarity, confidence: conf },
});

function pick(v, conf, extra = {}) {
  return {
    scored: [1, 2, 3],
    gatedOut: [4, 5, 6, 7, 8, 9],
    gateSkipped: false,
    scores: { 1: s(1, v, 3), 2: s(3, 1, 1, conf), 3: s(2, 1, 1) },
    shots: { 1: "medium", 2: "medium", 3: "medium" },
    steps: { 1: "during", 2: "during", 3: "during" },
    isSequence: false,
    ...extra,
  };
}

function measuredFlash(i) {
  if (i <= 20) return 9;
  if (i <= 40) return i % 2 === 0 ? 2 : 1;
  return 2;
}

function syntheticRun() {
  const words = [];
  for (let i = 0; i < 20; i++) {
    words.push({ word: `t${i}`, grid: `t${i}.grid.png`, flashCell: 2, story: `story t${i}`, tuning: true, pick: pick(2, 0.9) });
  }
  for (let i = 0; i < 62; i++) {
    const v = Math.round((3 - 0.03 * i) * 1e6) / 1e6;
    const conf = Math.round((0.99 - 0.005 * i) * 1e6) / 1e6;
    words.push({ word: `m${i}`, grid: `m${i}.grid.png`, flashCell: measuredFlash(i), story: `story m${i}`, tuning: false, pick: pick(v, conf) });
  }
  return { date: "2026-10-16", words, leftOut: [{ word: "beta", grid: "beta.grid.png", reason: "no clear match" }] };
}

// SP-029's run over the same words: rows 1, 4, 7 and final cell 1 for the
// measured words (exact and in three for the 10 words whose cell is 1),
// final cell 5 for the tuning words.
function syntheticSp029Run(run) {
  return {
    date: "2026-10-12",
    words: run.words.map((w) => ({
      word: w.word,
      grid: w.grid,
      flashCell: w.flashCell,
      judgment: { rows: [{ pick: 1 }, { pick: 4 }, { pick: 7 }], final: { pick: w.tuning ? 5 : 1 } },
    })),
    leftOut: [],
  };
}

module.exports = { syntheticRun, syntheticSp029Run, pick, s };
