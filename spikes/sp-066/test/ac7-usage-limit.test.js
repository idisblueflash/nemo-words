"use strict";

// SP-066 AC7 — Given Claude answers that the usage limit is reached, when the
// spike run reaches the next call, then the run stops without a report and
// says when to run it again; the cached answers stay, so the next run
// continues from there; and no word is marked unjudged because of the limit.
//
// End to end through run.js's stages: the fake claude answers as claude -p does at its
// limit (exit 1, "You've hit your session limit · resets 1:10pm
// (Asia/Shanghai)" on stdout) once a set number of calls is in its log.
// One Claude job at a time, so which answers are cached is known.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, runNode, readJson, claudeCalls } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");

const exists = (f) => fs.existsSync(f);
const cachedCaptions = (out) => Object.values(readJson(path.join(out, "captions.json"))).reduce((n, cells) => n + Object.keys(cells).length, 0);

async function run(out, jev, extra = {}, args = ["--stage", "tuning"]) {
  return runNode("run.js", args, fixtureEnv(out, { NEMO_JEV_ENV_FILE: jev.envFile, FAKE_CLAUDE_LOG: path.join(out, "claude.jsonl"), SP066_CLAUDE_JOBS: "1", ...extra }));
}

test("AC7: at the usage limit the run stops (exit 1) with no report, says when to run again, keeps the cache, and marks no word unjudged", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    // the 5 must-see lists and 3 captions answer; the 9th call hits the limit
    const r = await run(out, jev, { FAKE_CLAUDE_LIMIT_AFTER: "8" });
    assert.equal(r.code, 1, r.stderr);
    assert.match(r.stderr, /usage limit/i);
    assert.match(r.stderr, /run it again after 1:10pm \(Asia\/Shanghai\)/i);
    assert.doesNotMatch(r.stderr, /caption failed|unjudged/, "no word is marked unjudged");

    // no report and no run; Jev is never asked
    assert.equal(exists(path.join(out, "report.md")), false);
    assert.equal(exists(path.join(out, "run.json")), false);
    assert.equal(jev.calls.length, 0);

    // the run stops at that call: no Claude call after the one that hit the limit
    assert.equal(claudeCalls(path.join(out, "claude.jsonl")).length, 9);

    // what was answered stays cached
    assert.equal(Object.keys(readJson(path.join(out, "must-see.json"))).length, 5);
    assert.equal(cachedCaptions(out), 3);
  } finally {
    await jev.close();
  }
});

test("AC7: the next run continues from the cache and judges every word", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    assert.equal((await run(out, jev, { FAKE_CLAUDE_LIMIT_AFTER: "8" })).code, 1);
    const log = path.join(out, "claude.jsonl");
    const before = claudeCalls(log).length;

    const r = await run(out, jev);
    assert.equal(r.code, 0, r.stderr);
    const again = claudeCalls(log).slice(before);
    assert.equal(again.filter((c) => c.mode === "must-see").length, 0, "the must-see lists are reused");
    assert.equal(again.filter((c) => c.mode === "caption").length, 45 - 3, "only the missing captions are made");
    assert.equal(again.filter((c) => c.mode === "differences").length, 5);

    const words = readJson(path.join(out, "run.json")).words;
    assert.equal(words.length, 5);
    for (const w of words) assert.equal(w.unjudged, undefined, `${w.word} is judged`);
    // all 5 fixture words are tuning words (the tuning size is 20), so the measure stage only writes the report
    const m = await run(out, jev, {}, ["--stage", "measure"]);
    assert.equal(m.code, 0, m.stderr);
    assert.match(fs.readFileSync(path.join(out, "report.md"), "utf8"), /## Unjudged words \(0\)/);
  } finally {
    await jev.close();
  }
});

test("AC7: the limit on the very first call stops the run before any other call", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    const r = await run(out, jev, { FAKE_CLAUDE_LIMIT_AFTER: "0", SP066_CLAUDE_JOBS: "6" });
    assert.equal(r.code, 1, r.stderr);
    assert.match(r.stderr, /run it again after 1:10pm \(Asia\/Shanghai\)/i);
    assert.doesNotMatch(r.stderr, /must-see list failed/);
    assert.equal(exists(path.join(out, "report.md")), false);
    assert.ok(claudeCalls(path.join(out, "claude.jsonl")).length <= 6, "no new call once the limit is seen");
  } finally {
    await jev.close();
  }
});

test("AC7: a usage-limit answer with no reset time still stops the run, and says to run it again later", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    const r = await run(out, jev, { FAKE_CLAUDE_LIMIT_AFTER: "2", FAKE_CLAUDE_LIMIT_TEXT: "Claude AI usage limit reached" });
    assert.equal(r.code, 1, r.stderr);
    assert.match(r.stderr, /run it again later/i);
    assert.equal(exists(path.join(out, "report.md")), false);
  } finally {
    await jev.close();
  }
});

test("AC7: at the usage limit in the measure stage, the weights stay fixed, no report is written, and the next run finishes it", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  const log = path.join(out, "claude.jsonl");
  try {
    // 3 tuning words, 2 measure words
    assert.equal((await run(out, jev, { SP066_TUNING_SIZE: "3" })).code, 0);
    const tuningCalls = claudeCalls(log).length;
    const jevCalls = jev.calls.length;
    // the 2 measure lists answer; the first measure caption hits the limit
    const r = await run(out, jev, { SP066_TUNING_SIZE: "3", FAKE_CLAUDE_LIMIT_AFTER: String(tuningCalls + 2) }, ["--stage", "measure"]);
    assert.equal(r.code, 1, r.stderr);
    assert.match(r.stderr, /run it again after 1:10pm \(Asia\/Shanghai\)/i);
    assert.equal(exists(path.join(out, "report.md")), false);
    assert.ok(exists(path.join(out, "weights.json")), "the weights were fixed before the measure words ran");
    const weights = readJson(path.join(out, "weights.json"));
    assert.equal(readJson(path.join(out, "run.json")).words.filter((w) => !w.tuning).length, 0, "no measure word saved, none unjudged");
    assert.equal(jev.calls.length, jevCalls);

    const again = await run(out, jev, { SP066_TUNING_SIZE: "3" }, ["--stage", "measure"]);
    assert.equal(again.code, 0, again.stderr);
    const words = readJson(path.join(out, "run.json")).words;
    assert.equal(words.length, 5);
    for (const w of words) assert.equal(w.unjudged, undefined, `${w.word} is judged`);
    assert.deepEqual(readJson(path.join(out, "weights.json")), weights);
    assert.match(fs.readFileSync(path.join(out, "report.md"), "utf8"), /## Unjudged words \(0\)/);
  } finally {
    await jev.close();
  }
});
