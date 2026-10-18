"use strict";

// SP-066 AC3 (after stage 5, ADR-0039, C-050) — Jev scores must-see clarity in
// parts, one Score question each per scored cell, with the full caption in the
// state: completeness, size, state, name sign (only for a name anchor) and the
// main subject's view (only when the story has a main subject: front or
// three-quarter 3, side 2, back or from above 1). Must-see clarity is the
// mean of the parts that apply, its confidence the lowest of theirs, and code
// doesn't cap it. After the second stage 5 (ADR-0040, C-051): the view part
// applies whenever there is a main subject, an actor too; Jev's state gives
// the main subject as { name, actor }. An actor is never a must-see item, so
// the gate never checks it: a cell that doesn't show the actor stays scored,
// with main_view null, and its view part gets the lowest level (1).
//
// End to end through run.js against the fake claude and the mock Jev
// (test/helpers/). The mock scores the parts from the caption:
//   completeness  0 for a partly cut item (1 in a close-up), else 2
//   size          0 for a small item, 2 when every shown item is large, else 1
//   state         2
//   nameSign      2 when name_sign_readable, else 0
//   view          2 front or three-quarter, 1 side, else 0 (back, above, null)
// Grid alpha: cell n = lightness 30·(n−1); a shown item is small below 80,
// medium below 160, else large; the star's view: below 60 above, below 90
// back, below 150 side, below 210 three-quarter, else front.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { SPIKE, tmpDir, fixtureEnv, gridsFile, runNode, readJson } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");
const { toScores, clarityParts, PARTS } = require("../lib/pick");

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

const STAR = { word: "starry", grid: "alpha.grid.png", flashCell: 8, story: "A star shines, lightness 120." };
const partNames = (questions, cell) =>
  Object.keys(questions)
    .filter((q) => q.startsWith(`cell_${cell}_clarity_`))
    .map((q) => q.slice(`cell_${cell}_clarity_`.length));

test("AC3: with a main subject, Jev scores four clarity parts per cell, one question each, and clarity is their mean", async () => {
  const { run, calls } = await pickRun([STAR], { byWord: { starry: { cell_8_clarity_view: { score: 2, confidence: 0.3 } } } });
  const p = run.words[0].pick;
  const { state, questions } = calls[0].body;
  const rubric = readJson(path.join(SPIKE, "image-rubric.json"));

  assert.equal(calls.length, 1, "one Jev request per grid");
  assert.equal(Object.keys(questions).length, 9 * 9, "3 plausible parts, 2 vivid parts and 4 clarity parts per cell");
  assert.deepEqual(partNames(questions, 1), ["completeness", "size", "state", "view"]);
  assert.equal(questions.cell_1_clarity, undefined, "no single clarity question");
  for (const part of ["completeness", "size", "state", "view"]) {
    assert.deepEqual(questions[`cell_4_clarity_${part}`].criteria, rubric.axes.clarity.parts[part].levels);
  }
  // the full caption is in the state, with the main subject and its view
  assert.deepEqual(state.main_subject, { name: "star", actor: false });
  assert.equal(state.cells.cell_8.main_view, "front");
  assert.equal(state.cells.cell_4.main_view, "side");
  for (const k of ["objects", "shot", "angle", "step", "action", "extras", "must_see", "drawing_errors", "differs"]) assert.ok(k in state.cells.cell_4, k);

  // cell 4 (90): every item medium, seen from the side → (3 + 2 + 3 + 2) / 4
  assert.deepEqual(p.scores["4"].clarity.parts, {
    completeness: { score: 3, confidence: 0.9 },
    size: { score: 2, confidence: 0.9 },
    state: { score: 3, confidence: 0.9 },
    view: { score: 2, confidence: 0.9 },
  });
  assert.equal(p.scores["4"].clarity.score, 2.5);
  // cell 1 (0): small, from above → (3 + 1 + 3 + 1) / 4
  assert.equal(p.scores["1"].clarity.score, 2);
  // cell 8 (210): large and front, Jev's view answer overridden → 3, with confidence 0.3
  assert.equal(p.scores["8"].clarity.score, 3);
  assert.equal(p.scores["8"].clarity.confidence, 0.3, "clarity's confidence is the lowest of its parts");
  assert.equal(p.caps, undefined, "code caps nothing");
});

test("AC3: no name sign and no main subject: clarity is the mean of 3 parts; both: of 5 parts", async () => {
  const plain = (await pickRun([{ word: "plain", grid: "alpha.grid.png", flashCell: 1, story: "A cat chases a dog, lightness 120." }])).calls[0].body;
  assert.deepEqual(partNames(plain.questions, 5), ["completeness", "size", "state"]);
  assert.equal(plain.state.main_subject, null);
  assert.equal("main_view" in plain.state.cells.cell_5, false, "no main subject: no main_view");

  const { run, calls } = await pickRun([{ word: "nursey", grid: "nu.grid.png", flashCell: 5, story: "Nurse Venice holds a star, lightness 120." }]);
  const { questions, state } = calls[0].body;
  assert.deepEqual(partNames(questions, 5), ["completeness", "size", "state", "nameSign", "view"]);
  assert.equal(typeof state.cells.cell_5.name_sign_readable, "boolean");
  const c = run.words[0].pick.scores["5"].clarity;
  const parts = Object.values(c.parts).map((x) => x.score);
  assert.equal(parts.length, 5);
  assert.ok(Math.abs(c.score - parts.reduce((s, x) => s + x, 0) / 5) < 1e-6);
});

test("AC3: the main subject hidden in every cell: all 9 are scored, and each view part gets the lowest level", async () => {
  const { run, calls } = await pickRun([{ word: "haunted", grid: "alpha.grid.png", flashCell: 1, story: "A ghost haunts the hall, lightness 120." }]);
  const p = run.words[0].pick;
  assert.equal(p.gateSkipped, true);
  assert.deepEqual(p.scored, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(calls[0].body.state.main_subject, { name: "ghost", actor: false });
  for (let c = 1; c <= 9; c++) {
    assert.equal(calls[0].body.state.cells[`cell_${c}`].main_view, null);
    assert.equal(p.scores[c].clarity.parts.view.score, 1, `cell ${c}`);
  }
});

test("AC3: the rubric gives each clarity part its levels; the view part's order is front or three-quarter, side, back or above", () => {
  const { clarity } = readJson(path.join(SPIKE, "image-rubric.json")).axes;
  assert.deepEqual(Object.keys(clarity.parts), ["completeness", "size", "state", "nameSign", "view"]);
  for (const part of Object.values(clarity.parts)) {
    assert.ok(part.label);
    assert.equal(part.levels.length, 3);
  }
  const { completeness, size, state, nameSign, view } = clarity.parts;
  assert.match(completeness.levels[0], /cuts off part of the story/);
  assert.match(completeness.levels[1], /fits the shot/);
  assert.match(completeness.levels[2], /fully visible/);
  assert.match(size.levels[0], /too small to see what it does/);
  assert.match(size.levels[1], /small by nature.*headlamp/);
  assert.match(state.levels[0], /state its adjectives give/);
  assert.match(state.levels[1], /unclear/);
  assert.match(nameSign.levels[0], /can't be read/);
  assert.match(nameSign.levels[1], /partly readable or misread/);
  assert.match(nameSign.levels[2], /can be read/);
  assert.match(view.levels[0], /back or from above/);
  assert.match(view.levels[0], /an actor that the cell doesn't show/);
  assert.match(view.levels[1], /side/);
  assert.match(view.levels[2], /front or in three-quarter/);
  assert.match(view.check, /main_view/);
  assert.match(view.check, /null.*lowest level/);
});

test("clarityParts: completeness, size and state always; the name sign only with one, the view only with a main subject", () => {
  assert.deepEqual(PARTS, ["completeness", "size", "state", "nameSign", "view"]);
  assert.deepEqual(clarityParts({ nameSigns: [], mainSubject: null }), ["completeness", "size", "state"]);
  assert.deepEqual(clarityParts({ nameSigns: [{ item: "nurse", text: "Venice" }], mainSubject: null }), ["completeness", "size", "state", "nameSign"]);
  assert.deepEqual(clarityParts({ mainSubject: { name: "surgeon", actor: false } }), ["completeness", "size", "state", "view"]);
  assert.deepEqual(clarityParts({ mainSubject: { name: "person who sweeps", actor: true } }), ["completeness", "size", "state", "view"], "an actor has a view part too");
});

test("toScores: clarity is the mean of its parts (level + 1), with the lowest confidence; a missing part answer is a JevError", () => {
  const a = (score, confidence = 0.9) => ({ type: "score", score, confidence });
  const answers = {
    cell_1_plausible: a(2),
    cell_1_vivid: a(1),
    cell_1_clarity_completeness: a(2),
    cell_1_clarity_size: a(1, 0.4),
    cell_1_clarity_state: a(2),
    cell_1_clarity_view: a(2, 0.7),
  };
  const s = toScores(answers, [1], ["completeness", "size", "state", "view"]);
  assert.deepEqual(s[1].plausible, { score: 3, confidence: 0.9 });
  assert.equal(s[1].clarity.score, 2.75);
  assert.equal(s[1].clarity.confidence, 0.4);
  assert.deepEqual(s[1].clarity.parts.view, { score: 3, confidence: 0.7 });
  assert.equal(toScores(answers, [1], ["completeness", "size", "state"])[1].clarity.score, Math.round((8 / 3) * 1e6) / 1e6);
  assert.throws(() => toScores(answers, [1], ["completeness", "size", "state", "nameSign"]), /unusable Jev answer for cell_1_clarity_nameSign/);
});

test("AC3: an actor that a cell doesn't show: the cell stays scored, and its view part gets the lowest level", async () => {
  const { run, calls } = await pickRun([{ word: "sweepy", grid: "alpha.grid.png", flashCell: 2, story: "Swing deep into the corner; grab the broom, lightness 120." }]);
  const p = run.words[0].pick;
  const { state, questions } = calls[0].body;
  assert.deepEqual(state.main_subject, { name: "person who grabs the broom", actor: true });
  assert.equal(p.gateSkipped, false);
  assert.deepEqual(p.gatedOut, [], "the gate never checks an actor");
  assert.deepEqual(p.scored, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(partNames(questions, 1), ["completeness", "size", "state", "view"]);
  // alpha: cell n = lightness 30·(n−1); the actor isn't shown below 90
  for (const c of [1, 2, 3]) {
    assert.equal(state.cells[`cell_${c}`].main_view, null, `cell ${c}`);
    assert.equal(p.scores[c].clarity.parts.view.score, 1, `cell ${c}`);
  }
  assert.equal(state.cells.cell_4.main_view, "side");
  assert.equal(p.scores[4].clarity.parts.view.score, 2);
  assert.match(JSON.stringify(questions.cell_1_clarity_view), /actor/);
});
