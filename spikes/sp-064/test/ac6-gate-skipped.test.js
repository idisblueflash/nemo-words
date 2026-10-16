"use strict";

// SP-064 AC6 — Given every cell of a grid has a hidden must-see item, when
// Jev picks a cell, then all 9 cells are scored without the gate, and the
// report counts and lists these words.
//
// End to end through run.js: psi's story names a ghost, which the fake
// captioner marks hidden in every cell.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");

const KEPT = [
  { word: "psi", grid: "theta.grid.png", flashCell: 8, story: "Psi sees a ghost, lightness 30." },
  { word: "gamma", grid: "gamma.grid-2.png", flashCell: 7, story: "Gamma story, lightness 70." },
];

test("AC6: a grid whose every cell hides a must-see item has all 9 cells scored, and the report counts and lists it", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    const r = await runNode("run.js", [], fixtureEnv(out, { SP064_GRIDS: gridsFile(out, KEPT), NEMO_JEV_ENV_FILE: jev.envFile }));
    assert.equal(r.code, 0, r.stderr);

    const run = readJson(path.join(out, "run.json"));
    const psi = run.words.find((w) => w.word === "psi").pick;
    assert.equal(psi.gateSkipped, true);
    assert.deepEqual(psi.scored, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(psi.gatedOut, []);
    assert.deepEqual(Object.keys(psi.totals).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // theta grid R (cell n = 240 − 30·(n−1)), story lightness 30: cell 8 is nearest
    assert.equal(psi.mainCell, 8);
    const psiCall = jev.calls.find((c) => c.body.state.word === "psi");
    assert.equal(Object.keys(psiCall.body.questions).length, 27);

    const gamma = run.words.find((w) => w.word === "gamma").pick;
    assert.equal(gamma.gateSkipped, false);

    const md = fs.readFileSync(path.join(out, "report.md"), "utf8");
    assert.match(md, /## Words where every cell hid a must-see item \(1\)\n\nAll 9 cells were scored without the gate\.\n\n- psi\n/);
    assert.match(md, /\| psi \| 8 \| 8 \|.*\| all \(gate skipped\) \|/);
  } finally {
    await jev.close();
  }
});
