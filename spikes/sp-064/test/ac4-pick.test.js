"use strict";

// SP-064 AC4 — Given the captions, the grid lines and the story of a word,
// when Jev picks a cell, then a cell with a hidden must-see item is out of
// the pick; Jev scores each remaining cell on plausible, vivid and must-see
// clarity, 1–3, from a rubric file; code adds the weighted scores, and the
// highest total is the pick (ties: higher plausible, then lower cell); code
// picks the alternative cell from the totals and the captions, with no
// second Jev call; and the scores, confidences, totals, margin and weakest
// confidence are saved.
//
// End to end through run.js against the fake claude and a mock Jev.
// kappa: L grid (cell n = lightness 30·(n−1)), story lightness 120, a moon
// that is hidden in cells 1–4 and partly cut in cell 5. Cells 8 and 9 are
// extreme close-ups. With weights 2·plausible + vivid + clarity:
//   cell 5: 2·3      + 2 + 1 = 9
//   cell 6: 2·2.7647 + 2 + 3 = 10.5294
//   cell 7: 2·2.5294 + 2 + 3 = 10.0588
//   cell 8: 2·2.2941 + 3 + 3 = 10.5882   ← main (an extreme close-up)
//   cell 9: 2·2.0588 + 3 + 3 = 10.1176
// The alternative is the next-highest total with a wider shot: cell 6.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { SPIKE, tmpDir, fixtureEnv, gridsFile, runNode, readJson } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");

const KEPT = [{ word: "kappa", grid: "alpha.grid.png", flashCell: 6, story: "Kappa waves at the moon, lightness 120." }];
const near = (a, b) => Math.abs(a - b) < 1e-3;

async function pickRun(byWord = {}) {
  const out = tmpDir();
  const jev = await startMockJev({ byWord }, out);
  try {
    const r = await runNode("run.js", [], fixtureEnv(out, { SP064_GRIDS: gridsFile(out, KEPT), NEMO_JEV_ENV_FILE: jev.envFile }));
    assert.equal(r.code, 0, r.stderr);
    return { run: readJson(path.join(out, "run.json")), calls: jev.calls };
  } finally {
    await jev.close();
  }
}

test("AC4: hidden-item cells are out; Jev scores the rest on three rubric axes in one request; code totals, picks and saves it all", async () => {
  const { run, calls } = await pickRun({ kappa: { cell_8_clarity: { score: 2, confidence: 0.48 } } });
  const kappa = run.words.find((w) => w.word === "kappa");
  const p = kappa.pick;

  // the gate
  assert.deepEqual(p.gatedOut, [1, 2, 3, 4]);
  assert.deepEqual(p.scored, [5, 6, 7, 8, 9]);
  assert.equal(p.gateSkipped, false);

  // one Jev request, one Score question per remaining cell and axis, worded from the rubric file
  assert.equal(calls.length, 1, "one Jev request per grid, no second call for the alternative");
  const { state, questions } = calls[0].body;
  assert.equal(state.story, KEPT[0].story);
  assert.deepEqual(Object.keys(state.cells), ["cell_5", "cell_6", "cell_7", "cell_8", "cell_9"]);
  assert.ok(state.cells.cell_5.differs, "each cell carries its grid line");
  assert.equal(state.cells.cell_5.shot, "medium");
  const rubric = readJson(path.join(SPIKE, "image-rubric.json"));
  assert.equal(Object.keys(questions).length, 15);
  for (const c of [5, 6, 7, 8, 9]) {
    for (const axis of ["plausible", "vivid", "clarity"]) {
      const q = questions[`cell_${c}_${axis}`];
      assert.equal(q.type, "score");
      assert.deepEqual(q.criteria, rubric.axes[axis].levels);
      assert.match(q.instructions, new RegExp(`cell_${c}\\b`));
      assert.ok(q.instructions.includes(rubric.axes[axis].label));
    }
  }

  // scores 1–3 (Jev's level + 1, decimals kept) with their confidences
  assert.ok(near(p.scores["6"].plausible.score, 2.7647));
  assert.equal(p.scores["6"].plausible.confidence, 0.9);
  assert.equal(p.scores["5"].clarity.score, 1);
  assert.equal(p.scores["8"].vivid.score, 3);

  // weighted totals, the pick, the margin and the weakest confidence
  assert.deepEqual(p.weights, { plausible: 2, vivid: 1, clarity: 1 });
  assert.ok(near(p.totals["5"], 9) && near(p.totals["6"], 10.5294) && near(p.totals["8"], 10.5882));
  assert.equal(p.mainCell, 8);
  assert.deepEqual(p.ranking, [8, 6, 9, 7, 5]);
  assert.ok(near(p.margin, 10.5882 - 10.5294));
  assert.equal(p.weakestConfidence, 0.48);
  assert.equal(p.tie, false);
  // the alternative: next-highest total with a wider shot than the extreme close-up
  assert.equal(p.alternativeCell, 6);
});
