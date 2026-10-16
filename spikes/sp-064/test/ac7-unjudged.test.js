"use strict";

// SP-064 AC7 — Given Claude or Jev fails for a word (an error or an unusable
// answer), when the spike run reaches that word, then the word is reported as
// unjudged instead of a guessed pick, and the rates are over the judged words
// only, with the count shown.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson, claudeCalls } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");

async function fullRun(kept, byWord) {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const jev = await startMockJev({ byWord }, out);
  try {
    const r = await runNode("run.js", [], fixtureEnv(out, { SP064_GRIDS: gridsFile(out, kept), NEMO_JEV_ENV_FILE: jev.envFile, FAKE_CLAUDE_LOG: log }));
    assert.equal(r.code, 0, r.stderr);
    const run = readJson(path.join(out, "run.json"));
    return {
      out,
      log,
      calls: jev.calls,
      byWord: Object.fromEntries(run.words.map((w) => [w.word, w])),
      report: fs.readFileSync(path.join(out, "report.md"), "utf8"),
    };
  } finally {
    await jev.close();
  }
}

const TUNING = [
  { word: "alpha", grid: "alpha.grid.png", flashCell: 5, story: "Alpha story, lightness 120." },
  { word: "eta", grid: "eta.grid.png", flashCell: 1, story: "Eta story, lightness 150." },
];

test("AC7: a Claude error (must-see list or caption) or a Jev error leaves the word unjudged; rates are over the judged words", async () => {
  const kept = [
    ...TUNING,
    { word: "gamma", grid: "gamma.grid-2.png", flashCell: 7, story: "Gamma story, lightness 70." },
    { word: "theta", grid: "theta.grid.png", flashCell: 8, story: "Theta story, lightness 30." },
    { word: "nu", grid: "nu.grid.png", flashCell: 5, story: "Nurse Venice sees a crash, lightness 120." },
    { word: "omega", grid: "omega.grid.png", flashCell: 2, story: "Omega claude-fails story, lightness 200." },
  ];
  const { out, calls, byWord, report } = await fullRun(kept, { theta: "http-500" });

  assert.match(byWord.theta.unjudged, /Jev answered HTTP 500/);
  assert.match(byWord.nu.unjudged, /^caption failed for cell 1: claude failed \(exit 1\): API Error: 500/);
  assert.match(byWord.omega.unjudged, /^must-see list failed: claude failed \(exit 1\): API Error: 500/);
  for (const w of ["theta", "nu", "omega"]) assert.equal(byWord[w].pick, undefined, "nothing guessed");
  assert.ok(byWord.gamma.pick);

  // Jev is never asked about a word whose Claude step failed
  const asked = calls.map((c) => c.body.state.word).sort();
  assert.deepEqual(asked, ["alpha", "eta", "gamma", "theta"]);
  // failures aren't cached, so a re-run tries them again
  assert.equal(readJson(path.join(out, "must-see.json")).omega, undefined);
  assert.equal(readJson(path.join(out, "captions.json"))["nu.grid.png"], undefined);

  assert.match(report, /measured on 4 other words \(1 judged\)\. Rates are over the judged words only\./);
  assert.match(report, /\| Exact \(the main cell is Flash's cell\) \| 1 \/ 1 \(100\.0%\) \|/);
  assert.match(report, /## Unjudged words \(3\)/);
  assert.match(report, /- theta: Jev answered HTTP 500/);
  assert.match(report, /- nu: caption failed for cell 1/);
  assert.match(report, /- omega: must-see list failed/);
  assert.match(report, /\| theta \| 8 \| unjudged \|/);
  assert.match(report, /over 1 judged word\(s\)/);
});

test("AC7: an unusable answer (must-see list, caption, grid lines or Jev) also leaves the word unjudged", async () => {
  const kept = [
    { word: "alpha", grid: "alpha.grid.png", flashCell: 5, story: "Alpha story, lightness 120." },
    { word: "eta", grid: "eta.grid.png", flashCell: 1, story: "Eta story, lightness 150." },
    { word: "gamma", grid: "gamma.grid-2.png", flashCell: 7, story: "Gamma garbled-list story, lightness 70." },
    { word: "theta", grid: "theta.grid.png", flashCell: 8, story: "Theta can split, lightness 30." },
    { word: "nu", grid: "nu.grid.png", flashCell: 5, story: "Nurse Venice will garble, lightness 120." },
  ];
  const { log, byWord, report } = await fullRun(kept, { eta: "unusable" });

  assert.match(byWord.gamma.unjudged, /^must-see list failed: unusable claude answer \(no JSON\)/);
  assert.match(byWord.theta.unjudged, /^grid differences failed: claude failed/);
  assert.match(byWord.nu.unjudged, /^caption failed for cell 1: unusable claude answer/);
  assert.match(byWord.eta.unjudged, /^unusable Jev answer for cell_\d_/);
  assert.ok(byWord.alpha.pick);
  assert.ok(claudeCalls(log).some((c) => c.mode === "differences"));

  assert.match(report, /Tuned on 2 blind-check words \(1 judged\); measured on 3 other words \(0 judged\)/);
  assert.match(report, /## Unjudged words \(4\)/);
  assert.match(report, /- eta \(tuning\): unusable Jev answer/);
  assert.match(report, /\*\*No-go\*\*/);
  assert.match(report, /Measured: nothing — no measured word was judged/);
});
