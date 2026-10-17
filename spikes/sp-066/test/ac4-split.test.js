"use strict";

// SP-066 AC4 (split) — Given the 82 judged words and their SP-064 results,
// when the spike run splits them, then a seeded draw puts 20 words in the
// tuning set, 4 or 5 of them SP-064 hits (main cell = Flash's cell), and the
// other 62 in the measure set; and a re-run makes the same split.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { drawSplit, sp064Outcomes, SEED } = require("../lib/split");
const { tmpDir, fixtureEnv, runNode, readJson } = require("./helpers/harness");
const { sp064RunFile } = require("./helpers/sp064-run");

const WORDS = Array.from({ length: 82 }, (_, i) => `w${String(i).padStart(2, "0")}`);
const HITS = new Set(WORDS.filter((_, i) => i % 9 === 0 || i % 13 === 0)); // 15 hits

test("AC4: a seeded draw of 20 of 82 words, stratified by SP-064 hit, and the other 62 measured", () => {
  const s = drawSplit(WORDS, HITS);
  assert.equal(s.seed, SEED);
  assert.equal(s.tuning.length, 20);
  assert.equal(s.measure.length, 62);
  assert.equal(new Set([...s.tuning, ...s.measure]).size, 82, "every word in one set");
  // 15 hits of 82 → round(20 · 15 / 82) = 4 hits in the tuning set
  assert.equal(s.tuning.filter((w) => HITS.has(w)).length, 4);
  assert.equal(s.tuningHits, 4);
  // the measure set keeps the grid list's order
  assert.deepEqual(s.measure, WORDS.filter((w) => !s.tuning.includes(w)));
});

test("AC4: the same seed makes the same split; the draw is not just the first words", () => {
  assert.deepEqual(drawSplit(WORDS, HITS), drawSplit(WORDS, HITS));
  assert.notDeepEqual(drawSplit(WORDS, HITS).tuning, WORDS.slice(0, 20));
  assert.notDeepEqual(drawSplit(WORDS, HITS, { seed: SEED + 1 }).tuning, drawSplit(WORDS, HITS).tuning);
});

test("AC4: with fewer words than the tuning size, every word is a tuning word", () => {
  const s = drawSplit(["a", "b", "c"], new Set(["b"]));
  assert.deepEqual([...s.tuning].sort(), ["a", "b", "c"]);
  assert.deepEqual(s.measure, []);
});

test("AC4: an SP-064 hit is a word whose main cell, with SP-064's tuned weights, is Flash's cell", () => {
  const run = JSON.parse(fs.readFileSync(sp064RunFile(tmpDir(), [
    { word: "a", flashCell: 2, best: 2, tuning: true },
    { word: "b", flashCell: 2, best: 5, tuning: true },
    { word: "c", flashCell: 7, best: 7, gateSkipped: true },
    { word: "d", flashCell: 1, unjudged: "Jev answered HTTP 500" },
  ]), "utf8"));
  const o = sp064Outcomes(run);
  assert.deepEqual(o.a, { hit: true, inThree: true, gateSkipped: false, vividAlone: 2, mainCell: 2, judged: true });
  assert.equal(o.b.hit, false);
  assert.equal(o.c.hit, true);
  assert.equal(o.c.gateSkipped, true);
  assert.deepEqual(o.d, { judged: false, hit: false });
});

test("AC4: the real 82 words split into 20 tuning words, 4 or 5 of them SP-064 hits, and 62 measured", () => {
  const repo = path.join(__dirname, "..", "..", "..");
  const grids = path.join(repo, "spikes", "sp-029", "raw", "grids.json");
  const sp064 = path.join(repo, "spikes", "sp-064", "raw", "run.json");
  if (!fs.existsSync(grids) || !fs.existsSync(sp064)) return;
  const o = sp064Outcomes(readJson(sp064));
  const words = readJson(grids).kept.map((g) => g.word);
  const s = drawSplit(words, new Set(words.filter((w) => o[w] && o[w].hit)));
  assert.equal(words.length, 82);
  assert.equal(s.tuning.length, 20);
  assert.equal(s.measure.length, 62);
  const hits = s.tuning.filter((w) => o[w].hit).length;
  assert.ok(hits === 4 || hits === 5, `${hits} SP-064 hits in the tuning set`);
});

test("AC4 (early picks): a name anchor is a story name shown as a sign, in an item name or an adjective", () => {
  const { hasNameAnchor } = require("../lib/split");
  // the shape the real must-see call gave for ventilator (a smoke check, 2026-10-17)
  assert.equal(hasNameAnchor("Nurse Venice returns later.", [{ name: "nurse", adjectives: ['wearing a nametag that reads "Venice"'] }]), true);
  assert.equal(hasNameAnchor("If Victor misses rent.", [{ name: 'person with a nametag reading "Victor"', adjectives: [] }]), true);
  assert.equal(hasNameAnchor("Nurse Venice checks.", [{ name: "nametag", adjectives: ['reading "Venice"'] }]), true);
  // a sign that names no one, or a name with no sign, isn't one
  assert.equal(hasNameAnchor("A road sign falls.", [{ name: "road sign", adjectives: [] }]), false);
  assert.equal(hasNameAnchor("Nurse Venice checks.", [{ name: "nurse", adjectives: ["Venice"] }]), false);
  assert.equal(hasNameAnchor("Power surge! An OR goes dark.", [{ name: "exit sign", adjectives: ["glowing"] }]), false);
});

test("AC4: run.js --split writes the split and prints it; a re-run makes the same split, with no Claude or Jev call", async () => {
  const out = tmpDir();
  const sp064 = sp064RunFile(out, [
    { word: "alpha", flashCell: 5, best: 5 },
    { word: "eta", flashCell: 1, best: 3 },
    { word: "gamma", flashCell: 7, best: 7, gateSkipped: true },
    { word: "theta", flashCell: 8, best: 1 },
    { word: "nu", flashCell: 5, best: 2 },
  ]);
  const env = fixtureEnv(out, { SP066_SP064_RUN: sp064, SP066_TUNING_SIZE: "2", SP066_CLAUDE_BIN: "/nonexistent", NEMO_JEV_ENV_FILE: "/nonexistent" });
  const r1 = await runNode("run.js", ["--split"], env);
  assert.equal(r1.code, 0, r1.stderr);
  const s1 = readJson(path.join(out, "split.json"));
  assert.equal(s1.seed, SEED);
  assert.equal(s1.tuning.length, 2);
  assert.equal(s1.measure.length, 3);
  assert.equal(s1.tuning.filter((w) => ["alpha", "gamma"].includes(w)).length, 1, "round(2 · 2 / 5) = 1 SP-064 hit");
  for (const w of s1.tuning) assert.match(r1.stdout, new RegExp(`\\b${w}\\b`));
  assert.match(r1.stdout, /tuning: 2 words \(1 SP-064 hit\); measure: 3 words/);

  const r2 = await runNode("run.js", ["--split"], env);
  assert.equal(r2.code, 0, r2.stderr);
  assert.deepEqual(readJson(path.join(out, "split.json")), s1);
  assert.equal(r2.stdout, r1.stdout);
});
