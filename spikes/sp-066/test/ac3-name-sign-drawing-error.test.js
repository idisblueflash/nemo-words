"use strict";

// SP-066 AC3 (after stage 5, ADR-0039, which replaces the caps of ADR-0037 and
// ADR-0038) — Given the captions, the compare lines and the story of a word,
// when Jev picks a cell, then a name sign that can't be read never takes a
// cell out; Jev sees the cell's drawing errors and gives plausible a lower
// score for them, and code doesn't cap plausible; the name sign is a clarity
// part of its own, and code doesn't cap clarity. Jev's state keeps
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
const { nameSignReadable } = require("../lib/pick");

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

test("AC3: a name sign that can't be read never takes a cell out; it is one clarity part, and code doesn't cap clarity", async () => {
  // Jev gives cell 1 its top level on every part but the name sign
  const top = { score: 2, confidence: 0.9 };
  const { run, calls } = await pickRun([NURSE], { byWord: { nursey: { cell_1_clarity_completeness: top, cell_1_clarity_size: top, cell_1_clarity_state: top } } });
  const p = run.words[0].pick;
  assert.deepEqual(p.gatedOut, [], "no cell is gated out for its name");
  assert.deepEqual(p.scored, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(p.gateSkipped, false);
  assert.equal(p.scores["1"].clarity.parts.nameSign.score, 1, "cell 1 can't read Venice: the lowest name-sign level");
  assert.equal(p.scores["1"].clarity.score, 2.5, "the mean of 3, 3, 3 and 1: above ADR-0037's old cap of 2");
  assert.equal(p.scores["8"].clarity.parts.nameSign.score, 3, "cell 8 reads VENICE, R.N.");
  assert.equal(p.caps, undefined, "code caps nothing");

  const { state } = calls[0].body;
  assert.deepEqual(state.name_signs, [{ item: "nurse", text: "Venice" }]);
  assert.equal(state.cells.cell_1.name_sign_readable, false);
  assert.equal(state.cells.cell_8.name_sign_readable, true);
  assert.ok(!state.must_see.some((i) => /Venice/.test(i.name)), "the name sign is not a must-see item");
});

test("AC3: Jev scores plausible with the drawing errors in its state, and code doesn't cap plausible", async () => {
  // Jev lowers cell 9 (the tile drawn wrong) to its middle level
  const { run, calls } = await pickRun([TILE], { byWord: { anomaly: { cell_9_plausible: { score: 1, confidence: 0.8 } } } });
  const p = run.words[0].pick;
  const near = (a, b) => Math.abs(a - b) < 1e-3;
  // the mock's plausible: 1 + 2·(1 − |120 − Y| / 255)
  assert.equal(p.scores["5"].plausible.score, 3);
  assert.ok(near(p.scores["6"].plausible.score, 2.7647), "a lamp drawn wrong: Jev's score, not capped at 2");
  assert.ok(near(p.scores["8"].plausible.score, 2.2941), "the tile drawn wrong: Jev's score, not put at 1");
  assert.equal(p.scores["9"].plausible.score, 2, "Jev's own lower score stands");
  assert.equal(p.caps, undefined, "code caps nothing");
  assert.ok(near(p.totals["8"], 2 * 2.2941 + p.scores["8"].vivid.score + p.scores["8"].clarity.score));

  const { state } = calls[0].body;
  assert.deepEqual(state.cells.cell_9.drawing_errors, [{ object: "tile", mustSee: true, note: "sits on top of the grout lines" }]);
  assert.deepEqual(state.cells.cell_1.drawing_errors, []);
  assert.equal(state.cells.cell_1.name_sign_readable, undefined, "no name sign: no name_sign_readable");
});

test("AC3 (ADR-0041): the questions tell Jev about the name sign and the drawing errors; the drawing part of plausible ranks an error on a must-see item lowest", async () => {
  const text = (q) => q.prompt || JSON.stringify(q);
  const { calls } = await pickRun([TILE]);
  const q = calls[0].body.questions.cell_1_plausible_drawing;
  assert.match(text(q), /name_sign_readable/);
  assert.match(text(q), /drawing_errors/);
  assert.match(q.criteria[0], /must-see item is drawn wrong/);
  assert.match(q.criteria[1], /another object is drawn wrong/);
  assert.match(q.criteria[2], /no drawing error/);
  const nurse = await pickRun([NURSE]);
  assert.match(text(nurse.calls[0].body.questions.cell_1_clarity_nameSign), /name_sign_readable/);
});

test("name-sign check: a possessive form of the name counts as the name (bug-019)", () => {
  const sign = [{ item: "nurse", text: "Venice" }];
  for (const t of ["NURSE VENICE'S STATION", "Venice\u2019s", "venice's", "VENICE\u2019S"]) {
    assert.equal(nameSignReadable(sign, { extras: { readableText: t } }), true, t);
  }
  assert.equal(nameSignReadable(sign, { extras: { readableText: "Venices" } }), false);
  assert.equal(nameSignReadable(sign, { extras: { readableText: "Venicean" } }), false);
  assert.equal(nameSignReadable(sign, { extras: { readableText: "Venice's" } }), true);
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
