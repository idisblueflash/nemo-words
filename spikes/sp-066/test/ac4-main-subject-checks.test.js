"use strict";

// SP-066 AC4 (after stage 5, ADR-0037) — the Staged run's early picks gain one
// word with a main subject, and the summary after each stage gives the two new
// checks: the captions that show the main subject but have no mainView
// (should be 0), and clarity's mean spread inside a grid (max − min over the
// scored cells, then the mean over the judged words), next to 0.71, stage 5's
// value before the refine.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson } = require("./helpers/harness");
const { sp064RunFile } = require("./helpers/sp064-run");
const { startMockJev } = require("./helpers/mock-jev");
const { tuningOrder, hasMainSubject } = require("../lib/split");
const { stageSummary } = require("../lib/stage");

test("AC4 (early picks): a word with a main subject is an early pick of its own", () => {
  assert.equal(hasMainSubject({ items: [{ name: "surgeon" }], mainSubject: "surgeon" }), true);
  assert.equal(hasMainSubject({ items: [{ name: "cat" }], mainSubject: null }), false);
  assert.equal(hasMainSubject({ items: [] }), false, "an old list with no mainSubject");
  assert.equal(hasMainSubject(undefined), false);
  const tuning = [{ word: "p" }, { word: "m" }];
  const lists = { p: { mainSubject: null, nameSigns: [], angleCase: "none" }, m: { mainSubject: "star", nameSigns: [], angleCase: "none" } };
  const o = tuningOrder(tuning, { lists });
  assert.deepEqual(o.order, ["m", "p"]);
  assert.deepEqual(o.early, [{ word: "m", roles: ["main subject"] }]);
  assert.ok(!o.missing.includes("main subject"));
  assert.ok(tuningOrder([{ word: "p" }], { lists }).missing.includes("main subject"));
});

test("AC4: run.js puts the word with a main subject among the early picks", async () => {
  const out = tmpDir();
  const kept = [
    { word: "p", grid: "alpha.grid.png", flashCell: 1, story: "A cat sits, lightness 10." },
    { word: "m", grid: "eta.grid.png", flashCell: 1, story: "A star shines, lightness 10." },
  ];
  const sp064 = sp064RunFile(out, [
    { word: "p", flashCell: 1, best: 2 },
    { word: "m", flashCell: 1, best: 2 },
  ]);
  const r = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), SP066_SP064_RUN: sp064, SP066_TUNING_SIZE: "2" }));
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /early picks: m \(main subject\)/);
  assert.equal(readJson(path.join(out, "split.json")).tuningOrder[0], "m");
});

test("AC4: the stage summary counts captions with a mainView where needed, and gives clarity's mean spread next to 0.71", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    const kept = [
      { word: "starry", grid: "alpha.grid.png", flashCell: 8, story: "A star shines, lightness 120." },
      { word: "plain", grid: "theta.grid.png", flashCell: 1, story: "A cat chases a dog, lightness 120." },
    ];
    const sp064 = sp064RunFile(out, [
      { word: "starry", flashCell: 8, best: 2 },
      { word: "plain", flashCell: 1, best: 2 },
    ]);
    const r = await runNode("run.js", ["--stage", "tuning"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), SP066_SP064_RUN: sp064, SP066_TUNING_SIZE: "2", NEMO_JEV_ENV_FILE: jev.envFile }));
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /Main-subject words: 1; captions that show the main subject with no mainView: 0 of 9/);
    // the spread per word, from the saved picks
    const run = readJson(path.join(out, "run.json"));
    const spreads = run.words.map((w) => {
      const v = w.pick.scored.map((c) => w.pick.scores[c].clarity.score);
      return Math.max(...v) - Math.min(...v);
    });
    const mean = (spreads.reduce((s, x) => s + x, 0) / spreads.length).toFixed(2);
    assert.match(r.stdout, new RegExp(`Clarity's spread inside a grid \\(max − min\\): mean ${mean.replace(".", "\\.")} over 2 judged grids; stage 5 before the refine: 0\\.71`));
  } finally {
    await jev.close();
  }
});

test("stageSummary: a caption that shows the main subject but has no mainView is counted; a hidden one isn't", () => {
  const cell = (c) => ({
    action: "the surgeon operates",
    extras: { readableText: "" },
    drawingErrors: [],
    mustSee: { surgeon: c === 1 ? { mark: "hidden", size: null, place: null } : { mark: "visible", size: "large", place: "front" } },
    mainView: c <= 3 ? null : "side",
  });
  const captions = { "s.grid.png": Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => [c, cell(c)])) };
  const lists = { s: { items: [{ name: "surgeon", adjectives: [] }], nameSigns: [], mainSubject: "surgeon", angleCase: "none" } };
  const sc = (x) => ({ plausible: { score: 2 }, vivid: { score: 2 }, clarity: { score: x } });
  const scores = Object.fromEntries([2, 3, 4, 5, 6, 7, 8, 9].map((c) => [c, sc(c === 2 ? 1.5 : c === 9 ? 2.75 : 2)]));
  const words = [{ word: "s", grid: "s.grid.png", flashCell: 2, pick: { gatedOut: [1], scored: [2, 3, 4, 5, 6, 7, 8, 9], gateSkipped: false, scores, ranking: [9, 2, 3], mainCell: 9, alternativeCell: 2 } }];
  const out = stageSummary({ stage: "tuning", words, total: 1, split: {}, outcomes: {}, lists, captions, claudeCounts: { mustSee: 0, caption: 0, compare: 0 }, jevCalls: 0 });
  assert.match(out, /Main-subject words: 1; captions that show the main subject with no mainView: 2 of 8 \(s: 2, 3\)/);
  assert.match(out, /Clarity's spread inside a grid \(max − min\): mean 1\.25 over 1 judged grids; stage 5 before the refine: 0\.71/);
});
