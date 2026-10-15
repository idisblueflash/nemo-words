"use strict";

// SP-029 AC1 — Given the image grids and their final crops, when the spike
// run finds Flash's cell for each grid, then it takes the cell whose pixels
// are nearest to the crop, keeps a grid only when the match is clear
// (distance < 0.03, next-nearest ≥ 0.1), keeps only whole-word cards with a
// story (one grid per word), and lists every grid it left out with the reason.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { tmpDir, fixtureEnv, runNode, readJson } = require("./helpers/harness");

test("AC1: run.js --match-only finds Flash's cell for each clear whole-word grid and lists every grid left out", async () => {
  const out = tmpDir();
  const { code, stdout, stderr } = await runNode("run.js", ["--match-only"], fixtureEnv(out));
  assert.equal(code, 0, stderr);

  const lines = stdout.trim().split("\n").map((l) => l.split("\t"));
  const kept = lines.filter((l) => l[0] === "kept").map(([, word, grid, cell]) => [word, grid, Number(cell)]);
  assert.deepEqual(kept, [
    ["alpha", "alpha.grid.png", 5],
    ["eta", "eta.grid.png", 1],
    ["gamma", "gamma.grid-2.png", 7],
    ["theta", "theta.grid.png", 8],
  ]);
  for (const l of lines.filter((x) => x[0] === "kept")) {
    assert.ok(Number(l[4]) < 0.03, `distance ${l[4]}`);
    assert.ok(Number(l[5]) >= 0.1, `next ${l[5]}`);
  }

  const leftOut = Object.fromEntries(lines.filter((l) => l[0] === "left-out").map(([, grid, reason]) => [grid, reason]));
  assert.deepEqual(Object.keys(leftOut).sort(), ["-delta-.grid.png", "beta.grid.png", "eps.grid.png", "gamma.grid.png", "zeta.grid.png"]);
  assert.match(leftOut["beta.grid.png"], /^no clear match \(nearest cell \d, distance 0\.\d+, next 0\.\d+\)$/);
  assert.equal(leftOut["gamma.grid.png"], "another grid of gamma matched its crop");
  assert.equal(leftOut["-delta-.grid.png"], "word-part card");
  assert.equal(leftOut["eps.grid.png"], "no single crop eps.png");
  assert.equal(leftOut["zeta.grid.png"], "no story");

  // the matched grids, with their stories, are saved for the later stages
  const grids = readJson(path.join(out, "grids.json"));
  const byWord = Object.fromEntries(grids.kept.map((g) => [g.word, g]));
  assert.equal(byWord.alpha.story, "Alpha story, lightness 120."); // latest log row
  assert.equal(byWord.eta.story, "Eta story from the card, lightness 150."); // no log row: card Back
  assert.equal(byWord.gamma.flashCell, 7);
  assert.equal(grids.leftOut.length, 5);
});
