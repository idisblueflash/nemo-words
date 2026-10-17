"use strict";

// SP-066 AC4 (stages) — the run takes a case limit or a word list, and a
// re-run reuses its cached answers, so a stage pays only for its new words;
// the measure words run once, after the weights are fixed on the tuning words.
//
// End to end through run.js against the fake claude and a mock Jev. Fixture:
// 5 words, a tuning size of 3 (so 2 measure words), SP-064 hits alpha and gamma.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson, claudeCalls } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");
const { sp064RunFile } = require("./helpers/sp064-run");

const KEPT = [
  { word: "alpha", grid: "alpha.grid.png", flashCell: 5, story: "Alpha story, lightness 120." },
  { word: "eta", grid: "eta.grid.png", flashCell: 1, story: "Eta story, lightness 150." },
  { word: "gamma", grid: "gamma.grid-2.png", flashCell: 7, story: "Gamma story, lightness 70." },
  { word: "theta", grid: "theta.grid.png", flashCell: 8, story: "Theta story, lightness 30." },
  { word: "nu", grid: "nu.grid.png", flashCell: 5, story: "Nurse Venice checks the monitor, lightness 120." },
];
const SP064 = [
  { word: "alpha", flashCell: 5, best: 5 },
  { word: "eta", flashCell: 1, best: 3 },
  { word: "gamma", flashCell: 7, best: 7, gateSkipped: true },
  { word: "theta", flashCell: 8, best: 1 },
  { word: "nu", flashCell: 5, best: 2 },
];

async function setup(t, kept = KEPT, sp064 = SP064, size = "3") {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const jev = await startMockJev({}, out);
  t.after(() => jev.close());
  const env = fixtureEnv(out, {
    SP066_GRIDS: gridsFile(out, kept),
    SP066_SP064_RUN: sp064RunFile(out, sp064),
    SP066_TUNING_SIZE: size,
    NEMO_JEV_ENV_FILE: jev.envFile,
    FAKE_CLAUDE_LOG: log,
  });
  const run = (...args) => runNode("run.js", args, env);
  const calls = () => claudeCalls(log);
  return { out, log, jev, env, run, calls };
}

const split = (out) => readJson(path.join(out, "split.json"));
const runWords = (out) => readJson(path.join(out, "run.json")).words;
const promptOf = (c) => c.argv[c.argv.indexOf("-p") + 1];

test("AC4: run.js with no stage refuses to run, and names the stages", async (t) => {
  const { run, calls } = await setup(t);
  const r = await run();
  assert.equal(r.code, 2);
  assert.match(r.stderr, /--stage tuning/);
  assert.match(r.stderr, /--stage measure/);
  assert.equal(calls().length, 0);
});

test("AC4: --stage tuning --limit N runs the first N tuning words; a bigger limit pays only for the new words; a re-run makes no call", async (t) => {
  const { out, run, calls, jev } = await setup(t);
  const r1 = await run("--stage", "tuning", "--limit", "1");
  assert.equal(r1.code, 0, r1.stderr);
  const order = split(out).tuningOrder;
  assert.equal(order.length, 3);
  assert.deepEqual(runWords(out).map((w) => w.word), [order[0]]);
  assert.equal(runWords(out)[0].tuning, true);
  assert.ok(runWords(out)[0].pick);
  // the must-see lists of all 3 tuning words (they fix the order), and 9 captions of one grid
  assert.equal(calls().filter((c) => c.mode === "must-see").length, 3);
  assert.equal(calls().filter((c) => c.mode === "caption").length, 9);
  assert.equal(jev.calls.length, 1);
  assert.match(r1.stdout, /tuning stage: 1 of 3 tuning words/);

  const before = calls().length;
  const r2 = await run("--stage", "tuning", "--limit", "2");
  assert.equal(r2.code, 0, r2.stderr);
  const again = calls().slice(before);
  assert.equal(again.filter((c) => c.mode === "must-see").length, 0);
  assert.equal(again.filter((c) => c.mode === "caption").length, 9, "only the new word's grid");
  assert.equal(jev.calls.length, 2, "Jev's answer for the first word is reused");
  assert.deepEqual(runWords(out).map((w) => w.word), order.slice(0, 2));
  assert.match(r2.stdout, /Claude calls this run: 10 \(must-see 0, caption 9, compare 1\); Jev calls this run: 1/);

  const r3 = await run("--stage", "tuning", "--limit", "2");
  assert.equal(r3.code, 0, r3.stderr);
  assert.equal(calls().length, before + again.length, "no new Claude call");
  assert.equal(jev.calls.length, 2, "no new Jev call");
  assert.match(r3.stdout, /Claude calls this run: 0 \(must-see 0, caption 0, compare 0\); Jev calls this run: 0/);
  // the measure words aren't touched by a tuning stage
  const measure = split(out).measure;
  for (const c of calls()) for (const m of measure) assert.ok(!promptOf(c).includes(KEPT.find((k) => k.word === m).story));
});

test("AC4: --words runs just those tuning words, and refuses a word that isn't one", async (t) => {
  const { out, run, jev } = await setup(t);
  assert.equal((await run("--split")).code, 0);
  const { tuning, measure } = split(out);
  const r = await run("--stage", "tuning", "--words", tuning[2]);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(runWords(out).map((w) => w.word), [tuning[2]]);
  assert.equal(jev.calls.length, 1);

  const bad = await run("--stage", "tuning", "--words", `${tuning[0]},${measure[0]}`);
  assert.equal(bad.code, 2);
  assert.match(bad.stderr, new RegExp(`not a tuning word: ${measure[0]}`));
});

test("AC4: the measure stage refuses to run before every tuning word has run", async (t) => {
  const { out, run, calls, jev } = await setup(t);
  assert.equal((await run("--stage", "tuning", "--limit", "2")).code, 0);
  const before = calls().length;
  const r = await run("--stage", "measure");
  assert.equal(r.code, 1, r.stderr);
  assert.match(r.stderr, /tuning isn't done: 1 of 3 tuning words not run yet/);
  assert.equal(calls().length, before, "no Claude call for a measure word");
  assert.equal(jev.calls.length, 2);
  assert.equal(fs.existsSync(path.join(out, "weights.json")), false);
  assert.equal(fs.existsSync(path.join(out, "report.md")), false);
});

test("AC4: once every tuning word has run, the measure stage fixes the weights, runs the measure words once and writes the report; tuning is closed", async (t) => {
  const { out, run, calls, jev } = await setup(t);
  assert.equal((await run("--stage", "tuning")).code, 0);
  assert.equal(runWords(out).length, 3);
  const r = await run("--stage", "measure");
  assert.equal(r.code, 0, r.stderr);

  const w = readJson(path.join(out, "weights.json"));
  assert.deepEqual(Object.keys(w.weights).sort(), ["clarity", "plausible", "vivid"]);
  assert.deepEqual([...w.tuningWords].sort(), [...split(out).tuning].sort());
  assert.equal(runWords(out).length, 5);
  for (const m of split(out).measure) assert.equal(runWords(out).find((x) => x.word === m).tuning, false);
  assert.ok(fs.existsSync(path.join(out, "report.md")));

  // the measure words run once: a re-run makes no call and keeps their picks
  const before = { claude: calls().length, jev: jev.calls.length, words: runWords(out) };
  const again = await run("--stage", "measure");
  assert.equal(again.code, 0, again.stderr);
  assert.equal(calls().length, before.claude);
  assert.equal(jev.calls.length, before.jev);
  assert.deepEqual(runWords(out), before.words);
  assert.deepEqual(readJson(path.join(out, "weights.json")), w, "the weights don't change");

  // the tuning stage is closed once the weights are fixed
  const closed = await run("--stage", "tuning", "--limit", "1");
  assert.equal(closed.code, 1);
  assert.match(closed.stderr, /the weights are fixed/);
});

test("AC4: the tuning order puts the Staged run's early picks first: an SP-064 hit, a name anchor, an angleCase view or one-object, an SP-064 gate skip", async (t) => {
  const kept = [
    { word: "p1", grid: "p1.grid.png", flashCell: 1, story: "A cat sits, lightness 10." },
    { word: "p2", grid: "p2.grid.png", flashCell: 1, story: "A dog sits, lightness 10." },
    { word: "h", grid: "h.grid.png", flashCell: 4, story: "A hen sits, lightness 10." },
    { word: "n", grid: "n.grid.png", flashCell: 1, story: "Nurse Venice sits, lightness 10." },
    { word: "v", grid: "v.grid.png", flashCell: 1, story: "A ridge view, lightness 10." },
    { word: "g", grid: "g.grid.png", flashCell: 1, story: "A goat sits, lightness 10." },
  ];
  const sp064 = [
    { word: "p1", flashCell: 1, best: 2 },
    { word: "p2", flashCell: 1, best: 2 },
    { word: "h", flashCell: 4, best: 4 },
    { word: "n", flashCell: 1, best: 2 },
    { word: "v", flashCell: 1, best: 2 },
    { word: "g", flashCell: 1, best: 2, gateSkipped: true },
  ];
  const { out, run } = await setup(t, kept, sp064, "6");
  const r = await run("--stage", "tuning", "--must-see-only");
  assert.equal(r.code, 0, r.stderr);
  const s = split(out);
  assert.deepEqual(s.tuningOrder.slice(0, 4), ["h", "n", "v", "g"]);
  assert.deepEqual([...s.tuningOrder].sort(), ["g", "h", "n", "p1", "p2", "v"]);
  assert.match(r.stdout, /early picks: h \(SP-064 hit\), n \(name anchor\), v \(angleCase view or one-object\), g \(gate skipped in SP-064\)/);

  // the order is fixed once it is made
  const again = await run("--split");
  assert.equal(again.code, 0, again.stderr);
  assert.deepEqual(split(out).tuningOrder, s.tuningOrder);
  assert.match(again.stdout, /tuning order: h, n, v, g, /);
});
