"use strict";

// SP-064 AC5 — Given the weights are fixed on the 20 blind-check words, when
// the spike report is written for the other 62 words, then it shows the exact
// rate and the in-three rate (Flash's cell among the 3 highest totals), next
// to SP-029, chance and the always-cell-1 rule; the same rates per band
// (high / middle / low) of the margin and of the weakest confidence, naming
// the better signal; the weights, the tie count, and how often Flash's cell
// is the main or the alternative cell; the margin cut-off and the
// weakest-confidence cut-off from the 62 measured words, and the share of
// words at or below each; the count and list of the words where the gate
// removed Flash's cell; the share of cells with a partly cut must-see item;
// and it ends with go or no-go: go only if exact ≥ 45% and
// in-three ≥ 70%.
//
// Through `run.js --report`, from a saved run.json with known outcomes
// (test/helpers/synthetic-run.js) — no Claude or Jev call.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson, writeJson } = require("./helpers/harness");
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

test("AC5: rates per band of each signal, and the better signal", async () => {
  const md = await report(syntheticRun());
  // margin: low band = words 0–20 (margin 0–0.6), all misses; high = 41–61, all exact
  assert.match(md, /### Margin[\s\S]*?\| Low \| 21 \| 0 – 0\.6 \| 0 \/ 21 \(0\.0%\) \| 0 \/ 21 \(0\.0%\) \|/);
  assert.match(md, /### Margin[\s\S]*?\| Middle \| 20 \| 0\.63 – 1\.2 \| 10 \/ 20 \(50\.0%\) \| 20 \/ 20 \(100\.0%\) \|/);
  assert.match(md, /### Margin[\s\S]*?\| High \| 21 \| 1\.23 – 1\.83 \| 21 \/ 21 \(100\.0%\) \| 21 \/ 21 \(100\.0%\) \|/);
  // weakest confidence runs the other way
  assert.match(md, /### Weakest confidence[\s\S]*?\| Low \| 21 \| 0\.685 – 0\.785 \| 21 \/ 21 \(100\.0%\) \|/);
  assert.match(md, /### Weakest confidence[\s\S]*?\| High \| 21 \| 0\.89 – 0\.99 \| 0 \/ 21 \(0\.0%\) \|/);
  assert.match(md, /Better signal: \*\*margin\*\* \(exact rate high band − low band: margin \+100\.0 points, weakest confidence −100\.0 points\)/);
});

test("AC5: the margin cut-off and the weakest-confidence cut-off, each with the share of words at or below it", async () => {
  const md = await report(syntheticRun());
  // each cut-off is the top edge of that signal's low band
  assert.match(md, /- Margin cut-off: ≤ 0\.6: 21 of 62 words \(33\.9%\) at or below it/);
  assert.match(md, /- Weakest-confidence cut-off: ≤ 0\.785: 21 of 62 words \(33\.9%\) at or below it/);
  // the better signal's words at or below its cut-off are listed for Flash
  assert.match(md, /### Words at or below the margin cut-off \(21\), for Flash to check\n\n- m0 /);
  assert.doesNotMatch(md, /- m21 \(Flash's cell/);
});

test("AC5: a word on the cut-off's edge counts as at or below it", async () => {
  // measured word 21 gets word 20's margin (0.6), but sits in the middle band
  const run = syntheticRun();
  run.words.find((w) => w.word === "m21").pick.scores[1].vivid.score = 2.4;
  const md = await report(run);
  assert.match(md, /- Margin cut-off: ≤ 0\.6: 22 of 62 words \(35\.5%\) at or below it/);
});

test("AC5: it counts and lists the words where the gate removed Flash's cell", async () => {
  const md = await report(syntheticRun());
  assert.match(md, /## Words where the gate removed Flash's cell \(21 of 62 measured, 0 of 20 tuning\)/);
  const section = md.split("## Words where the gate removed Flash's cell")[1].split("\n## ")[0];
  for (let i = 0; i <= 20; i++) assert.match(section, new RegExp(`^- m${i} \\(Flash's cell 9, gated out 4, 5, 6, 7, 8, 9\\)$`, "m"));
  assert.doesNotMatch(section, /- m21 /);

  // a tuning word's removed cell is counted and listed too, marked as tuning
  const run = syntheticRun();
  run.words.find((w) => w.word === "t0").flashCell = 5;
  const md2 = await report(run);
  assert.match(md2, /## Words where the gate removed Flash's cell \(21 of 62 measured, 1 of 20 tuning\)/);
  assert.match(md2, /^- t0 \(tuning\) \(Flash's cell 5, gated out 4, 5, 6, 7, 8, 9\)$/m);
});

test("AC5: it gives the share of cells with a partly cut must-see item", async () => {
  const md = await report(syntheticRun());
  assert.match(md, /Cells with a partly cut must-see item: 62 of 558 \(11\.1%\), over all 9 cells of the 62 judged measured words/);
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

test("AC5: a full run.js saves the partly cut cells, and the report finds a measured word whose cell the gate removed", async () => {
  // kappa (measured): its moon is hidden in cells 1-4 and partly cut in cell 5; Flash's cell 3 is gated out
  const kept = [
    { word: "eta", grid: "eta.grid.png", flashCell: 1, story: "Eta story, lightness 150." },
    { word: "kappa", grid: "alpha.grid.png", flashCell: 3, story: "Kappa waves at the moon, lightness 120." },
  ];
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    const r = await runNode("run.js", [], fixtureEnv(out, { SP064_GRIDS: gridsFile(out, kept), NEMO_JEV_ENV_FILE: jev.envFile }));
    assert.equal(r.code, 0, r.stderr);
  } finally {
    await jev.close();
  }
  const run = readJson(path.join(out, "run.json"));
  assert.deepEqual(run.words.find((w) => w.word === "kappa").pick.partlyCut, [5]);
  assert.deepEqual(run.words.find((w) => w.word === "eta").pick.partlyCut, []);
  const md = fs.readFileSync(path.join(out, "report.md"), "utf8");
  assert.match(md, /## Words where the gate removed Flash's cell \(1 of 1 measured, 0 of 1 tuning\)/);
  assert.match(md, /^- kappa \(Flash's cell 3, gated out 1, 2, 3, 4\)$/m);
  assert.match(md, /Cells with a partly cut must-see item: 1 of 9 \(11\.1%\)/);
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
