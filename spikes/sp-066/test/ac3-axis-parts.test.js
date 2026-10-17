"use strict";

// SP-066 AC3 (after stage 20, ADR-0039, C-049) — Given the captions, the
// compare lines and the story of a word, when Jev picks a cell, then Jev
// scores plausible in parts, one question each: setting, drawing and story
// actions; plausible is the mean of its parts, with the lowest confidence of
// its parts. The story-actions part rewards the beginning actions in the
// story's order, and the result can be left out, unless the word names it.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");
const { toScores, axisParts, loadRubric } = require("../lib/pick");

const SPIKE = path.join(__dirname, "..");
const TILE = { word: "anomaly", grid: "alpha.grid.png", flashCell: 5, story: "An odd tile rattles, lightness 120." };

async function pickRun(kept, { byWord = {} } = {}) {
  const out = tmpDir();
  const jev = await startMockJev({ byWord }, out);
  try {
    const r = await runNode("run.js", ["--stage", "tuning"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), NEMO_JEV_ENV_FILE: jev.envFile }));
    assert.equal(r.code, 0, r.stderr);
    return { run: readJson(path.join(out, "run.json")), calls: jev.calls };
  } finally {
    await jev.close();
  }
}

test("AC3 (ADR-0039): the rubric gives plausible 3 parts, each with a label and 3 levels", () => {
  const rubric = loadRubric();
  const p = rubric.axes.plausible;
  assert.deepEqual(Object.keys(p.parts), ["setting", "drawing", "actions"]);
  for (const part of Object.values(p.parts)) {
    assert.ok(part.label);
    assert.equal(part.levels.length, 3);
  }
  assert.equal(p.levels, undefined, "plausible has no levels of its own");
  assert.match(p.parts.actions.check, /result .*can be left out/);
  assert.match(p.parts.actions.check, /word itself names the result/);
  assert.deepEqual(axisParts(rubric, { mainSubject: null }).plausible, ["setting", "drawing", "actions"]);
});

test("AC3 (ADR-0039): Jev answers one question per plausible part, and plausible is their mean with the lowest confidence", async () => {
  const { run, calls } = await pickRun([TILE], {
    byWord: { anomaly: { cell_5_plausible_setting: { score: 2, confidence: 0.9 }, cell_5_plausible_drawing: { score: 2, confidence: 0.6 }, cell_5_plausible_actions: { score: 0, confidence: 0.8 } } },
  });
  const { questions } = calls[0].body;
  for (const part of ["setting", "drawing", "actions"]) assert.ok(questions[`cell_5_plausible_${part}`], part);
  assert.equal(questions.cell_5_plausible, undefined, "no plausible question of its own");
  const s = run.words[0].pick.scores["5"].plausible;
  assert.equal(s.score, Math.round((7 / 3) * 1e6) / 1e6, "(3 + 3 + 1) / 3");
  assert.equal(s.confidence, 0.6);
  assert.deepEqual(s.parts.actions, { score: 1, confidence: 0.8 });
});

test("toScores (ADR-0039): an axis in parts is their mean; a missing part answer is a JevError", () => {
  const a = (score, confidence = 0.9) => ({ score, confidence });
  const answers = {
    cell_1_plausible_setting: a(2),
    cell_1_plausible_drawing: a(1, 0.5),
    cell_1_plausible_actions: a(2),
    cell_1_vivid: a(1),
    cell_1_clarity_completeness: a(2),
    cell_1_clarity_size: a(2),
    cell_1_clarity_state: a(2),
  };
  const parts = { plausible: ["setting", "drawing", "actions"], vivid: null, clarity: ["completeness", "size", "state"] };
  const s = toScores(answers, [1], parts)[1];
  assert.equal(s.plausible.score, Math.round((8 / 3) * 1e6) / 1e6);
  assert.equal(s.plausible.confidence, 0.5);
  assert.equal(s.vivid.score, 2);
  const { cell_1_plausible_actions, ...missing } = answers;
  assert.throws(() => toScores(missing, [1], parts), /unusable Jev answer for cell_1_plausible_actions/);
});
