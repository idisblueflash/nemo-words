"use strict";

// SP-066 AC3 (after stage 2, ADR-0035, ADR-0036) — Given the captions, the
// compare lines and the story of a word, when Jev picks a cell, then a name
// sign that can't be read never takes a cell out; when the cell's readable
// text doesn't show the name sign, must-see clarity is at the middle level (2)
// at most; and a drawing error on a must-see item puts plausible at its lowest
// level (1), and a drawing error on another object puts it at the middle level
// (2) at most. Code applies both caps to Jev's scores; Jev's state also gets
// name_sign_readable and the drawing errors.
//
// End to end through run.js against the fake claude and the mock Jev
// (test/helpers/). Grid alpha: cell n = lightness 30·(n−1). The fake captioner
// reads "VENICE, R.N." from lightness 150 (cells 6–9) and nothing below; with
// a "tile" item it draws a lamp wrong at 150–209 (cells 6, 7) and the tile
// itself wrong from 210 (cells 8, 9).

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");
const { nameSignReadable, applyCaps } = require("../lib/pick");

async function pickRun(kept, { byWord = {} } = {}) {
  const out = tmpDir();
  const jev = await startMockJev({ byWord }, out);
  try {
    const r = await runNode("run.js", ["--stage", "tuning"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), NEMO_JEV_ENV_FILE: jev.envFile }));
    assert.equal(r.code, 0, r.stderr);
    return { run: readJson(path.join(out, "run.json")), calls: jev.calls, stdout: r.stdout };
  } finally {
    await jev.close();
  }
}

const NURSE = { word: "nursey", grid: "alpha.grid.png", flashCell: 7, story: "Nurse Venice waves, lightness 120." };
const TILE = { word: "anomaly", grid: "alpha.grid.png", flashCell: 5, story: "An odd tile rattles, lightness 120." };

test("AC3: a name sign that can't be read never takes a cell out, and caps must-see clarity at the middle level", async () => {
  // Jev would give cells 1 and 8 its top clarity level
  const top = { score: 2, confidence: 0.9 };
  const { run, calls } = await pickRun([NURSE], { byWord: { nursey: { cell_1_clarity: top, cell_8_clarity: top } } });
  const p = run.words[0].pick;
  assert.deepEqual(p.gatedOut, [], "no cell is gated out for its name");
  assert.deepEqual(p.scored, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(p.gateSkipped, false);
  assert.equal(p.scores["1"].clarity.score, 2, "cell 1 can't read Venice: clarity at 2 at most");
  assert.equal(p.scores["8"].clarity.score, 3, "cell 8 reads VENICE, R.N.: no cap");
  assert.equal(p.answers.cell_1_clarity.score, 2, "Jev's own answer is kept as it was");
  assert.deepEqual(p.caps["1"], { clarity: "name sign not readable" });
  assert.equal(p.caps["8"], undefined);

  const { state } = calls[0].body;
  assert.deepEqual(state.name_signs, [{ item: "nurse", text: "Venice" }]);
  assert.equal(state.cells.cell_1.name_sign_readable, false);
  assert.equal(state.cells.cell_8.name_sign_readable, true);
  assert.ok(!state.must_see.some((i) => /Venice/.test(i.name)), "the name sign is not a must-see item");
});

test("AC3: a drawing error on a must-see item puts plausible at 1; one on another object caps it at 2", async () => {
  const { run, calls } = await pickRun([TILE]);
  const p = run.words[0].pick;
  // the mock's plausible: 1 + 2·(1 − |120 − Y| / 255)
  assert.equal(p.scores["5"].plausible.score, 3, "no drawing error: no cap");
  assert.equal(p.scores["6"].plausible.score, 2, "a lamp drawn wrong: 2.76 capped at 2");
  assert.equal(p.scores["7"].plausible.score, 2, "a lamp drawn wrong: 2.53 capped at 2");
  assert.equal(p.scores["9"].plausible.score, 1, "the tile drawn wrong: 2.06 down to 1");
  assert.equal(p.scores["8"].plausible.score, 1);
  assert.deepEqual(p.caps["9"], { plausible: "drawing error on a must-see item" });
  assert.deepEqual(p.caps["6"], { plausible: "drawing error on another object" });
  // the totals use the capped scores: 2·plausible + vivid + clarity
  assert.equal(p.totals["9"], 2 * 1 + p.scores["9"].vivid.score + p.scores["9"].clarity.score);

  const { state } = calls[0].body;
  assert.deepEqual(state.cells.cell_9.drawing_errors, [{ object: "tile", mustSee: true, note: "sits on top of the grout lines" }]);
  assert.deepEqual(state.cells.cell_1.drawing_errors, []);
  assert.equal(state.cells.cell_1.name_sign_readable, undefined, "no name sign: no name_sign_readable");
});

test("AC3: the questions tell Jev about the name sign and the drawing errors", async () => {
  const { calls } = await pickRun([TILE]);
  const q = calls[0].body.questions.cell_1_plausible.prompt || JSON.stringify(calls[0].body.questions.cell_1_plausible);
  assert.match(q, /name_sign_readable/);
  assert.match(q, /drawing errors/);
});

test("name-sign check: case and punctuation don't count; empty or missing readable text can't show it", () => {
  assert.equal(nameSignReadable([{ item: "nurse", text: "Venice" }], { extras: { readableText: "VENICE, R.N." } }), true);
  assert.equal(nameSignReadable([{ item: "nurse", text: "Dr. O'Neil" }], { extras: { readableText: "dr oneil" } }), true);
  assert.equal(nameSignReadable([{ item: "nurse", text: "Venice" }], { extras: { readableText: "Venise" } }), false, "a misread name counts as unreadable");
  assert.equal(nameSignReadable([{ item: "nurse", text: "Venice" }], { extras: { readableText: "" } }), false);
  assert.equal(nameSignReadable([{ item: "nurse", text: "Venice" }], { extras: { readableText: null } }), false);
  assert.equal(nameSignReadable([{ item: "girl", text: "Al" }], { extras: { readableText: "hospital" } }), false, "a whole-word match only");
  // two name signs: unreadable if either one can't be read
  const two = [{ item: "nurse", text: "Venice" }, { item: "doctor", text: "Rob" }];
  assert.equal(nameSignReadable(two, { extras: { readableText: "Venice / Rob" } }), true);
  assert.equal(nameSignReadable(two, { extras: { readableText: "Venice" } }), false);
  // no name sign: nothing to read
  assert.equal(nameSignReadable([], { extras: { readableText: "" } }), null);
});

test("applyCaps: clarity at 2 at most for an unreadable sign; plausible 1 for a must-see drawing error, else at 2 at most", () => {
  const s = (p, v, c) => ({ plausible: { score: p, confidence: 0.9 }, vivid: { score: v, confidence: 0.9 }, clarity: { score: c, confidence: 0.9 } });
  const captions = {
    1: { extras: { readableText: "" }, drawingErrors: [] },
    2: { extras: { readableText: "Venice" }, drawingErrors: [{ object: "lamp", mustSee: false, note: "" }] },
    3: { extras: { readableText: "Venice" }, drawingErrors: [{ object: "lamp", mustSee: false, note: "" }, { object: "nurse", mustSee: true, note: "" }] },
    4: { extras: { readableText: "" }, drawingErrors: [{ object: "lamp", mustSee: false, note: "" }] },
  };
  const signs = [{ item: "nurse", text: "Venice" }];
  const { scores, caps } = applyCaps({ 1: s(3, 3, 3), 2: s(2.5, 3, 3), 3: s(3, 3, 3), 4: s(1.5, 2, 1.5) }, captions, signs);
  assert.deepEqual([scores[1].clarity.score, scores[1].plausible.score], [2, 3]);
  assert.deepEqual([scores[2].clarity.score, scores[2].plausible.score], [3, 2]);
  assert.deepEqual([scores[3].clarity.score, scores[3].plausible.score], [3, 1]);
  assert.deepEqual([scores[4].clarity.score, scores[4].plausible.score], [1.5, 1.5], "a cap never raises a score");
  assert.deepEqual(caps[4], { clarity: "name sign not readable", plausible: "drawing error on another object" });
  assert.equal(scores[1].clarity.confidence, 0.9, "the confidence stays Jev's");
});
