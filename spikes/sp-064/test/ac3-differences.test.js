"use strict";

// SP-064 AC3 — Given the 9 cells of a kept grid, when the spike run compares
// them, then one Claude call sees all 9 cells together, under the same
// blindness, and it writes one line per cell on how that cell differs from
// the others.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson, claudeCalls } = require("./helpers/harness");

const KEPT = [
  { word: "kappa", grid: "alpha.grid.png", flashCell: 6, story: "Kappa waves at the moon, lightness 120." },
  { word: "omega", grid: "omega.grid.png", flashCell: 2, story: "Omega story, lightness 200." },
];

async function compareOnly(out, log) {
  const r = await runNode("run.js", ["--compare-only"], fixtureEnv(out, { SP064_GRIDS: gridsFile(out, KEPT), FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
}

test("AC3: one Claude call per grid sees the 9 cut-out cells together and writes one line per cell", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  await compareOnly(out, log);

  const diffs = readJson(path.join(out, "differences.json"));
  assert.deepEqual(Object.keys(diffs).sort(), ["alpha.grid.png", "omega.grid.png"]);
  for (const { lines } of Object.values(diffs)) {
    assert.equal(lines.length, 9);
    for (const l of lines) assert.ok(typeof l === "string" && l.trim() && !/[\n\t]/.test(l));
  }
  // line n is about cell n: alpha's cell 1 is lightness 0 (dark), cell 9 is 240
  assert.equal(diffs["alpha.grid.png"].lines[0], "darker than most cells (lightness 0)");
  assert.equal(diffs["alpha.grid.png"].lines[8], "lighter than most cells (lightness 240)");

  const calls = claudeCalls(log).filter((c) => c.mode === "differences");
  assert.equal(calls.length, 2, "one call per grid");
  for (const c of calls) {
    assert.deepEqual(c.files, ["cell-1.png", "cell-2.png", "cell-3.png", "cell-4.png", "cell-5.png", "cell-6.png", "cell-7.png", "cell-8.png", "cell-9.png"]);
    const shown = [...c.argv, c.cwd].join(" ");
    for (const k of KEPT) {
      assert.ok(!shown.includes(k.story), "never the story");
      assert.doesNotMatch(shown, new RegExp(`\\b${k.word}\\b`, "i"), "never the word");
    }
    assert.doesNotMatch(shown, /grid\.png|flash|\bpick/i, "never the grid's name nor Flash's cell");
  }
});

test("AC3: the grid lines are cached, so a second run doesn't compare again", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  await compareOnly(out, log);
  const before = claudeCalls(log).length;
  assert.equal(claudeCalls(log).filter((c) => c.mode === "differences").length, 2);
  await compareOnly(out, log);
  assert.equal(claudeCalls(log).length, before);
});
