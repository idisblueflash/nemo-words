"use strict";

// SP-064 AC5 — Given the weights are fixed on the 20 blind-check words, when
// the spike report is written for the other 62 words, then it shows the exact
// rate and the in-three rate (Flash's cell among the 3 highest totals), next
// to SP-029, chance and the always-cell-1 rule; the same rates per band
// (high / middle / low) of the margin and of the weakest confidence, naming
// the better signal; that signal's cut-off, the share of words below it, the
// weights, the tie count, and how often Flash's cell is the main or the
// alternative cell; and it ends with go or no-go: go only if exact ≥ 45% and
// in-three ≥ 70%.
//
// Through `run.js --report`, from a saved run.json with known outcomes
// (test/helpers/synthetic-run.js) — no Claude or Jev call.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, runNode, writeJson } = require("./helpers/harness");
const { syntheticRun, syntheticSp029Run } = require("./helpers/synthetic-run");
const { startMockJev } = require("./helpers/mock-jev");

async function report(run, sp029 = syntheticSp029Run(run)) {
  const out = tmpDir();
  writeJson(path.join(out, "run.json"), run);
  const sp029File = path.join(out, "sp029-run.json");
  if (sp029) writeJson(sp029File, sp029);
  const r = await runNode("run.js", ["--report"], fixtureEnv(out, { SP064_SP029_RUN: sp029File, SP064_CLAUDE_BIN: "/nonexistent", NEMO_JEV_ENV_FILE: "/nonexistent" }));
  assert.equal(r.code, 0, r.stderr);
  return fs.readFileSync(path.join(out, "report.md"), "utf8");
}

const lastLines = (text, n) => text.trim().split("\n").slice(-n).join("\n");

test("AC5: exact and in-three rates over the 62 measured words, next to SP-029, chance and the always-cell-1 rule", async () => {
  const md = await report(syntheticRun());
  assert.match(md, /^# SP-064 /);
  assert.match(md, /Tuned on 20 blind-check words \(20 judged\); measured on 62 other words \(62 judged\)/);
  assert.match(md, /\| \| SP-064 \| SP-029 \(same words\) \| Chance \| Always cell 1 \|/);
  assert.match(md, /\| Exact \(the main cell is Flash's cell\) \| 31 \/ 62 \(50\.0%\) \| 10 \/ 62 \(16\.1%\) \| 11% \| 10 \/ 62 \(16\.1%\) \|/);
  assert.match(md, /\| In three \(Flash's cell is among the 3 highest totals\) \| 41 \/ 62 \(66\.1%\) \| 10 \/ 62 \(16\.1%\) \| 33% \| 41 \/ 62 \(66\.1%\) \|/);
  assert.match(md, /SP-029 over all its judged words: exact 10 \/ 82 \(12\.2%\), in three 10 \/ 82 \(12\.2%\)/);
});

test("AC5: rates per band of each signal, the better signal, its cut-off and the share below it", async () => {
  const md = await report(syntheticRun());
  // margin: low band = words 0–20 (margin 0–0.6), all misses; high = 41–61, all exact
  assert.match(md, /### Margin[\s\S]*?\| Low \| 21 \| 0 – 0\.6 \| 0 \/ 21 \(0\.0%\) \| 0 \/ 21 \(0\.0%\) \|/);
  assert.match(md, /### Margin[\s\S]*?\| Middle \| 20 \| 0\.63 – 1\.2 \| 10 \/ 20 \(50\.0%\) \| 20 \/ 20 \(100\.0%\) \|/);
  assert.match(md, /### Margin[\s\S]*?\| High \| 21 \| 1\.23 – 1\.83 \| 21 \/ 21 \(100\.0%\) \| 21 \/ 21 \(100\.0%\) \|/);
  // weakest confidence runs the other way
  assert.match(md, /### Weakest confidence[\s\S]*?\| Low \| 21 \| 0\.685 – 0\.785 \| 21 \/ 21 \(100\.0%\) \|/);
  assert.match(md, /### Weakest confidence[\s\S]*?\| High \| 21 \| 0\.89 – 0\.99 \| 0 \/ 21 \(0\.0%\) \|/);
  assert.match(md, /Better signal: \*\*margin\*\* \(exact rate high band − low band: margin \+100\.0 points, weakest confidence −100\.0 points\)/);
  assert.match(md, /Cut-off: margin ≤ 0\.6 goes to Flash: 21 of 62 words \(33\.9%\)/);
  // the words to check are listed for Flash
  assert.match(md, /Words below the cut-off[\s\S]*- m0 /);
});

test("AC5: the weights, the tie count, and how often Flash's cell is the main or the alternative cell", async () => {
  const md = await report(syntheticRun());
  assert.match(md, /Weights \(tuned on the 20 blind-check words\): 2 × plausible \+ 1 × vivid \+ 1 × must-see clarity/);
  assert.match(md, /Tuning: exact 20 \/ 20 \(100\.0%\), in three 20 \/ 20 \(100\.0%\)/);
  assert.match(md, /Picks decided by a tie: 1 of 62/);
  assert.match(md, /Flash's cell is the main cell: 31 of 62 \(50\.0%\)/);
  assert.match(md, /Flash's cell is the alternative cell: 10 of 62 \(16\.1%\)/);
  assert.match(md, /Main or alternative: 41 of 62 \(66\.1%\)/);
});

test("AC5: the report ends with go or no-go against exact ≥ 45% and in-three ≥ 70%", async () => {
  const noGo = await report(syntheticRun());
  assert.match(lastLines(noGo, 3), /\*\*No-go\*\*/);
  assert.match(lastLines(noGo, 3), /exact ≥ 45% and in-three ≥ 70%/);
  assert.match(lastLines(noGo, 3), /Measured: exact 50\.0%, in three 66\.1%, over 62 judged word\(s\)/);

  // move the 21 low-band misses to cell 3 (in three): in three 62/62, exact still 31/62 → go
  const run = syntheticRun();
  for (const w of run.words) if (!w.tuning && w.flashCell === 9) w.flashCell = 3;
  const go = await report(run);
  assert.match(lastLines(go, 3), /\*\*Go\*\*/);
  assert.match(lastLines(go, 3), /Measured: exact 50\.0%, in three 100\.0%/);
});

test("AC5: a full run.js writes the report from its own run: tuned on the blind-check words, measured on the rest", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    const r = await runNode("run.js", [], fixtureEnv(out, { NEMO_JEV_ENV_FILE: jev.envFile }));
    assert.equal(r.code, 0, r.stderr);
  } finally {
    await jev.close();
  }
  const md = fs.readFileSync(path.join(out, "report.md"), "utf8");
  // fixture: alpha and eta are the blind-check words; gamma, theta and nu are measured
  assert.match(md, /Tuned on 2 blind-check words \(2 judged\); measured on 3 other words \(3 judged\)/);
  assert.match(md, /\| Exact \(the main cell is Flash's cell\) \| \d \/ 3 /);
  assert.match(md, /\| gamma \| 7 \|/);
  assert.doesNotMatch(md, /\| alpha \| 5 \|/, "a tuning word isn't in the measured table");
  assert.match(lastLines(md, 3), /\*\*(Go|No-go)\*\*/);
});

test("AC5: the weights are fixed on the tuning words, not on the measured words", async () => {
  // tuning words where plausible must weigh 1 (cell 1 is Flash's), measured words as before
  const run = syntheticRun();
  for (const w of run.words) if (w.tuning) w.flashCell = 1;
  const md = await report(run);
  assert.doesNotMatch(md, /Weights \(tuned on the 20 blind-check words\): 2 × plausible/);
  assert.match(md, /Tuning: exact 20 \/ 20/);
  // the measured words now pick cell 1 for every word, which is Flash's cell for 10
  assert.match(md, /\| Exact \(the main cell is Flash's cell\) \| 10 \/ 62 \(16\.1%\) \|/);
});
