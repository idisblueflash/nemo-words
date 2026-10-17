"use strict";

// SP-066 AC2 (compare lines) — Given the 9 cells of a kept grid and its
// word's must-see list, when the spike run compares the grid's cells, then
// every kept grid has 9 compare lines: SP-064's cached lines are reused, and
// a grid that has none there gets them from one Claude call that sees all 9
// cells together, under the captions' blindness (no word, no story, no
// Flash's cell).

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson, writeJson, claudeCalls } = require("./helpers/harness");

const KEPT = [
  { word: "kappa", grid: "alpha.grid.png", flashCell: 6, story: "Kappa waves at the moon, lightness 120." },
  { word: "omega", grid: "omega.grid.png", flashCell: 2, story: "Omega story, lightness 200." },
];

async function compareOnly(out, log, extra = {}) {
  const r = await runNode("run.js", ["--stage", "tuning", "--compare-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, KEPT), FAKE_CLAUDE_LOG: log, ...extra }));
  assert.equal(r.code, 0, r.stderr);
  return r;
}

test("AC2: one Claude call per grid sees the 9 cut-out cells together and writes one line per cell", async () => {
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

test("AC2: the grid lines are cached, so a second run doesn't compare again", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  await compareOnly(out, log);
  const before = claudeCalls(log).length;
  assert.equal(claudeCalls(log).filter((c) => c.mode === "differences").length, 2);
  await compareOnly(out, log);
  assert.equal(claudeCalls(log).length, before);
});

const SP064_LINES = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => `SP-064 line for cell ${c}`);

test("AC2: SP-064's cached lines (either of its two shapes) are reused with no Claude call; a grid with none there is compared", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const kept3 = [...KEPT, { word: "eta", grid: "eta.grid.png", flashCell: 1, story: "Eta story, lightness 150." }];
  const sp064 = path.join(out, "sp064-differences.json");
  writeJson(sp064, {
    "alpha.grid.png": SP064_LINES, // SP-064's older shape: a bare array of 9 lines
    "eta.grid.png": { promptKey: "0123456789abcdef", lines: SP064_LINES.map((l) => l + "!") },
    "omega.grid.png": { promptKey: "0123456789abcdef", lines: ["only one line"] }, // not 9 lines: none
  });
  const r = await runNode("run.js", ["--stage", "tuning", "--compare-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept3), FAKE_CLAUDE_LOG: log, SP066_SP064_DIFFERENCES: sp064 }));
  assert.equal(r.code, 0, r.stderr);

  const calls = claudeCalls(log).filter((c) => c.mode === "differences");
  assert.equal(calls.length, 1, "only the grid with no SP-064 lines is compared");
  const diffs = readJson(path.join(out, "differences.json"));
  assert.deepEqual(diffs["alpha.grid.png"], { source: "sp-064", lines: SP064_LINES });
  assert.deepEqual(diffs["eta.grid.png"].lines, SP064_LINES.map((l) => l + "!"));
  assert.equal(diffs["omega.grid.png"].lines.length, 9);
  assert.match(diffs["omega.grid.png"].lines[0], /lightness/);
  for (const g of Object.values(diffs)) assert.equal(g.lines.length, 9, "every kept grid has 9 compare lines");
  assert.match(r.stderr, /compare lines: 2 reused from SP-064, 1 made/);

  // a re-run reuses all three, from SP-066's own cache
  const before = claudeCalls(log).length;
  await compareOnly(out, log, { SP066_GRIDS: gridsFile(out, kept3), SP066_SP064_DIFFERENCES: sp064 });
  assert.equal(claudeCalls(log).length, before);
});

test("AC2: the real SP-064 cache gives every one of the 82 kept grids 9 lines", () => {
  const fs = require("node:fs");
  const file = path.join(__dirname, "..", "..", "sp-064", "raw", "differences.json");
  const gridsJson = path.join(__dirname, "..", "..", "sp-029", "raw", "grids.json");
  if (!fs.existsSync(file) || !fs.existsSync(gridsJson)) return;
  const { linesOf } = require("../lib/differences");
  const d = readJson(file);
  const kept = readJson(gridsJson).kept;
  const have = kept.filter((w) => d[w.grid] && (linesOf(d[w.grid]) || []).length === 9);
  assert.equal(kept.length, 82);
  assert.equal(have.length, 82);
});
