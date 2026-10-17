"use strict";

// SP-066 AC3 (gate) — as in SP-064: when every cell of a grid has a hidden
// must-see item, all 9 cells are scored without the gate, and the report
// counts and lists these words.
//
// End to end through run.js: psi's story names a ghost, which the fake
// captioner marks hidden in every cell.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runStages, readJson } = require("./helpers/harness");
const { sp064RunFile } = require("./helpers/sp064-run");
const { startMockJev } = require("./helpers/mock-jev");

const KEPT = [
  { word: "psi", grid: "theta.grid.png", flashCell: 8, story: "Psi sees a ghost, lightness 30." },
  { word: "gamma", grid: "gamma.grid-2.png", flashCell: 7, story: "Gamma story, lightness 70." },
];

test("AC3: a grid whose every cell hides a must-see item has all 9 cells scored, and the report counts and lists it", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    // one tuning word: gamma, SP-064's only hit; psi is measured
    const sp064 = sp064RunFile(out, [
      { word: "psi", flashCell: 8, best: 1 },
      { word: "gamma", flashCell: 7, best: 7 },
    ]);
    const r = await runStages(fixtureEnv(out, { SP066_GRIDS: gridsFile(out, KEPT), NEMO_JEV_ENV_FILE: jev.envFile, SP066_SP064_RUN: sp064, SP066_TUNING_SIZE: "1" }));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(readJson(path.join(out, "split.json")).tuning, ["gamma"]);

    const run = readJson(path.join(out, "run.json"));
    const psi = run.words.find((w) => w.word === "psi").pick;
    assert.equal(psi.gateSkipped, true);
    assert.deepEqual(psi.scored, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(psi.gatedOut, []);
    assert.deepEqual(Object.keys(psi.totals).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // theta grid R (cell n = 240 − 30·(n−1)), story lightness 30: cell 8 is the
    // nearest, but its square is small (lowest vivid and clarity); cell 3
    // (lightness 180) shows it large and acting, so it wins (SP-066's vivid axis)
    assert.equal(psi.mainCell, 3);
    const psiCall = jev.calls.find((c) => c.body.state.word === "psi");
    assert.equal(Object.keys(psiCall.body.questions).length, 27);

    const gamma = run.words.find((w) => w.word === "gamma").pick;
    assert.equal(gamma.gateSkipped, false);

    const md = fs.readFileSync(path.join(out, "report.md"), "utf8");
    assert.match(md, /## Words where every cell hid a must-see item \(1\)\n\nGate skipped: 1 of 2 words \(2 judged\), next to SP-064's 0 of 2\. All 9 cells were scored without the gate\.\n\n- psi\n/);
    // the report re-picks with the weights fixed on gamma, so the main cell may differ
    assert.match(md, /\| psi \| 8 \| \d \|.*\| all \(gate skipped\) \|/);
  } finally {
    await jev.close();
  }
});
