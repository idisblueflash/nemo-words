"use strict";

// SP-066 AC3 — Given the captions, the compare lines and the story of a word,
// when Jev picks a cell, then the gate takes out a cell with a hidden
// must-see item, as in SP-064; vivid scores the scene (3 = story objects
// large and acting on each other as the story says, 2 = clear but not
// acting, 1 = small, far or apart); an unusual angle lowers vivid only when
// it hides the action, and not when the story is about a view or has one
// main object (C-042); must-see clarity uses each item's size, so a small
// item scores lowest; and code adds the weighted scores and picks the main
// cell and the alternative cell as in SP-064.
//
// End to end through run.js against the fake claude and a mock Jev that
// follows the rubric the way test/helpers/mock-jev.js says.
// kappa: L grid (cell n = lightness 30·(n−1)), story lightness 120, a moon
// hidden in cells 1–4 and partly cut in cell 5. The fake captioner: objects
// act on each other at lightness 100–199; a shown item is medium below 160,
// else large. So:
//   cell 5 (120): plausible 3,      vivid 2 (acting, medium), clarity 1 (partly cut)  total 9
//   cell 6 (150): plausible 2.7647, vivid 2 (acting, medium), clarity 2 (medium)      total 9.5294
//   cell 7 (180): plausible 2.5294, vivid 3 (acting, large),  clarity 3               total 11.0588 ← main
//   cell 8 (210): plausible 2.2941, vivid 2 (apart),          clarity 3               total 9.5882
//   cell 9 (240): plausible 2.0588, vivid 2 (apart),          clarity 3               total 9.1176
// with the start weights 2·plausible + vivid + clarity. The alternative is the
// next-highest total (cell 7 isn't an extreme close-up): cell 8.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { SPIKE, tmpDir, fixtureEnv, gridsFile, runNode, readJson } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");

const KAPPA = { word: "kappa", grid: "alpha.grid.png", flashCell: 6, story: "Kappa waves at the moon, lightness 120." };
const near = (a, b) => Math.abs(a - b) < 1e-3;

async function pickRun(kept = [KAPPA], { byWord = {}, env = {} } = {}) {
  const out = tmpDir();
  const jev = await startMockJev({ byWord }, out);
  try {
    const r = await runNode("run.js", ["--stage", "tuning"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), NEMO_JEV_ENV_FILE: jev.envFile, ...env }));
    assert.equal(r.code, 0, r.stderr);
    return { run: readJson(path.join(out, "run.json")), calls: jev.calls };
  } finally {
    await jev.close();
  }
}

test("AC3: the gate takes out hidden-item cells; Jev scores the rest in one request; code totals and picks the main and the alternative cell", async () => {
  const { run, calls } = await pickRun([KAPPA], { byWord: { kappa: { cell_7_clarity: { score: 2, confidence: 0.48 } } } });
  const p = run.words.find((w) => w.word === "kappa").pick;

  assert.deepEqual(p.gatedOut, [1, 2, 3, 4]);
  assert.deepEqual(p.scored, [5, 6, 7, 8, 9]);
  assert.equal(p.gateSkipped, false);

  assert.equal(calls.length, 1, "one Jev request per grid");
  const { state, questions } = calls[0].body;
  assert.deepEqual(Object.keys(state.cells), ["cell_5", "cell_6", "cell_7", "cell_8", "cell_9"]);
  assert.equal(Object.keys(questions).length, 15);
  const rubric = readJson(path.join(SPIKE, "image-rubric.json"));
  for (const axis of ["plausible", "vivid", "clarity"]) assert.deepEqual(questions[`cell_5_${axis}`].criteria, rubric.axes[axis].levels);

  assert.equal(p.scores["5"].vivid.score, 2);
  assert.equal(p.scores["7"].vivid.score, 3);
  assert.equal(p.scores["8"].vivid.score, 2);
  assert.equal(p.scores["5"].clarity.score, 1);
  assert.equal(p.scores["6"].clarity.score, 2);
  assert.deepEqual(p.weights, { plausible: 2, vivid: 1, clarity: 1 });
  assert.ok(near(p.totals["5"], 9) && near(p.totals["6"], 9.5294) && near(p.totals["7"], 11.0588) && near(p.totals["8"], 9.5882));
  assert.equal(p.mainCell, 7);
  assert.deepEqual(p.ranking, [7, 8, 6, 9, 5]);
  assert.equal(p.alternativeCell, 8);
  assert.ok(near(p.margin, 11.0588 - 9.5882));
  assert.equal(p.weakestConfidence, 0.48);
});

test("AC3: Jev's state holds each cell's action line, each item's mark, size and place, and the story's angleCase", async () => {
  const { calls } = await pickRun();
  const { state } = calls[0].body;
  assert.equal(state.angle_case, "none");
  assert.equal(state.cells.cell_7.action, "the square pushes the moon: the objects act on each other");
  assert.deepEqual(state.cells.cell_5.must_see.moon, { mark: "partly cut", size: "medium", place: "front" });
  assert.deepEqual(state.cells.cell_9.must_see.moon, { mark: "visible", size: "large", place: "back" });
  assert.ok(state.cells.cell_5.differs, "each cell carries its compare line");
});

test("AC3: the vivid axis scores the scene, not the camera", () => {
  const vivid = readJson(path.join(SPIKE, "image-rubric.json")).axes.vivid;
  assert.match(vivid.levels[0], /small, far away or apart/);
  assert.match(vivid.levels[1], /clear, but .*don't act on each other/);
  assert.match(vivid.levels[2], /large and act on each other as the story says/);
  for (const level of vivid.levels) assert.doesNotMatch(level, /close-up|strong camera angle|eye level/);
  // the angle exception (C-042) is in the vivid question
  assert.match(vivid.check, /angle lowers vivid only when it hides the action/);
  assert.match(vivid.check, /angle_case/);
  assert.match(vivid.check, /"view"/);
  assert.match(vivid.check, /"one-object"/);
});

test("AC3: an unusual angle lowers vivid when the story is neither about a view nor about one main object, and not when it is", async () => {
  // cells from lightness 180 are shot from a high angle
  const env = { FAKE_CLAUDE_HIGH_ANGLE: "180" };
  const none = (await pickRun([KAPPA], { env })).run.words[0].pick;
  const view = (await pickRun([{ ...KAPPA, story: "Kappa looks at the moon view, lightness 120." }], { env })).run.words[0].pick;
  const one = (await pickRun([{ ...KAPPA, story: "A lone moon over Kappa, lightness 120." }], { env })).run.words[0].pick;
  assert.equal(none.scores["7"].vivid.score, 2, "the high angle costs a level when angleCase is none");
  assert.equal(view.scores["7"].vivid.score, 3, "not when the story is about a view");
  assert.equal(one.scores["7"].vivid.score, 3, "not when the story has one main object");
  assert.equal(none.scores["6"].vivid.score, view.scores["6"].vivid.score, "an eye-level cell is the same either way");
});

test("AC3: must-see clarity uses each item's size, so a small item scores lowest", async () => {
  const clarity = readJson(path.join(SPIKE, "image-rubric.json")).axes.clarity;
  assert.match(clarity.levels[0], /small/);
  assert.match(clarity.levels[0], /partly cut/);
  assert.match(clarity.levels[0], /bare/);
  // after stage 2 (ADR-0035): an unreadable name sign is the middle level, not the lowest
  assert.doesNotMatch(clarity.levels[0], /Venice/);
  assert.match(clarity.levels[1], /name sign can't be read/);
  assert.match(clarity.levels[2], /large/);
  assert.match(clarity.check, /size/);
  assert.match(clarity.check, /a small item gets the lowest level/);

  // psi: R grid (cell n = 240 − 30·(n−1)), only the square: cells 7–9 show it small
  const psi = { word: "psi", grid: "theta.grid.png", flashCell: 1, story: "Psi story, lightness 120." };
  const { run, calls } = await pickRun([psi]);
  const p = run.words[0].pick;
  assert.equal(calls[0].body.state.cells.cell_8.must_see.square.size, "small");
  for (const c of [7, 8, 9]) assert.equal(p.scores[c].clarity.score, 1, `cell ${c}: small item, lowest clarity`);
  assert.equal(p.scores[1].clarity.score, 3);
});
