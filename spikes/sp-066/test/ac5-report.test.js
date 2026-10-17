"use strict";

// SP-066 AC5 — Given the weights are fixed on the 20 tuning words, when the
// spike report is written for the 62 measured words, then it shows the exact
// and in-three rates next to SP-064, SP-029, the chance rate and the
// always-cell-1 rule, all on the same 62 words; the exact rate of vivid alone
// next to SP-064's vivid alone, on the same 62 words; how many of the 82
// words skipped the gate, next to SP-064's count; the weights, the tuning
// words and the tie count; and it ends with go or no-go: go only if exact ≥
// 45% and in-three ≥ 70% (ADR-0031). The rest of SP-064's report (signal
// bands and cut-offs, main or alternative, the gate's removals, partly cut
// cells) is kept.
//
// Through `run.js --report`, from a saved run.json with known outcomes
// (test/helpers/synthetic-run.js) and a stand-in SP-064 run — no Claude or
// Jev call — and end to end through the two stages.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, runStages, readJson, writeJson } = require("./helpers/harness");
const { syntheticRun, syntheticSp029Run, syntheticSp064Words } = require("./helpers/synthetic-run");
const { sp064RunFile } = require("./helpers/sp064-run");
const { startMockJev } = require("./helpers/mock-jev");

async function report(run, sp029 = syntheticSp029Run(run), { weights, sp064 = syntheticSp064Words(run) } = {}) {
  const out = tmpDir();
  writeJson(path.join(out, "run.json"), run);
  if (weights) writeJson(path.join(out, "weights.json"), { weights, tuningWords: run.words.filter((w) => w.tuning).map((w) => w.word) });
  const sp029File = path.join(out, "sp029-run.json");
  if (sp029) writeJson(sp029File, sp029);
  const sp064File = sp064 ? sp064RunFile(out, sp064) : path.join(out, "no-sp064-run.json");
  const r = await runNode("run.js", ["--report"], fixtureEnv(out, { SP066_SP029_RUN: sp029File, SP066_SP064_RUN: sp064File, SP066_CLAUDE_BIN: "/nonexistent", NEMO_JEV_ENV_FILE: "/nonexistent" }));
  assert.equal(r.code, 0, r.stderr);
  return fs.readFileSync(path.join(out, "report.md"), "utf8");
}

const lastLines = (text, n) => text.trim().split("\n").slice(-n).join("\n");

test("AC5 (after the second stage 5, ADR-0038): the method text gives the main subject rule and the actor", async () => {
  const md = await report(syntheticRun());
  assert.match(md, /the main subject's view when the story has one \(the person, animal or group that does the story's action, never an object; when the story names no person, the person who does it: the actor, which the gate never checks\) \(ADR-0037, ADR-0038\)/);
});

test("AC5: exact and in-three rates over the 62 measured words, next to SP-064, SP-029, chance and the always-cell-1 rule on the same words", async () => {
  const md = await report(syntheticRun());
  assert.match(md, /^# SP-066 /);
  assert.match(md, /Tuned on 20 tuning words \(20 judged\); measured on 62 other words \(62 judged\)/);
  assert.match(md, /\| \| SP-066 \| SP-064 \(same words\) \| SP-029 \(same words\) \| Chance \| Always cell 1 \|/);
  // SP-064 (stand-in): exact for m0–m9, in three for m0–m9 and m21–m61
  assert.match(md, /\| Exact \(the main cell is Flash's cell\) \| 31 \/ 62 \(50\.0%\) \| 10 \/ 62 \(16\.1%\) \| 10 \/ 62 \(16\.1%\) \| 11% \| 10 \/ 62 \(16\.1%\) \|/);
  assert.match(md, /\| In three \(Flash's cell is among the 3 highest totals\) \| 41 \/ 62 \(66\.1%\) \| 51 \/ 62 \(82\.3%\) \| 10 \/ 62 \(16\.1%\) \| 33% \| 41 \/ 62 \(66\.1%\) \|/);
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
  assert.match(md, /Weights \(fixed on the 20 tuning words\): 2 × plausible \+ 1 × vivid \+ 1 × must-see clarity/);
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

test("AC5: the two stages write the report from their own run: tuned on the drawn tuning words, measured on the rest", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  let split;
  try {
    const r = await runStages(fixtureEnv(out, { NEMO_JEV_ENV_FILE: jev.envFile, SP066_TUNING_SIZE: "2" }));
    assert.equal(r.code, 0, r.stderr);
    split = readJson(path.join(out, "split.json"));
  } finally {
    await jev.close();
  }
  const md = fs.readFileSync(path.join(out, "report.md"), "utf8");
  assert.match(md, /Tuned on 2 tuning words \(2 judged\); measured on 3 other words \(3 judged\)/);
  assert.match(md, /\| Exact \(the main cell is Flash's cell\) \| \d \/ 3 /);
  for (const w of split.measure) assert.match(md, new RegExp(`\\| ${w} \\| \\d \\|`));
  for (const w of split.tuning) assert.doesNotMatch(md, new RegExp(`^\\| ${w} \\| \\d \\|`, "m"), "a tuning word isn't in the measured table");
  assert.match(md, new RegExp(`Tuning words \\(2, seeded draw, seed 66\\): ${split.tuning.join(", ")}`));
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
    // eta is SP-064's only hit, so it is the one tuning word
    const sp064 = sp064RunFile(out, [
      { word: "eta", flashCell: 1, best: 1 },
      { word: "kappa", flashCell: 3, best: 1 },
    ]);
    const r = await runStages(fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), NEMO_JEV_ENV_FILE: jev.envFile, SP066_SP064_RUN: sp064, SP066_TUNING_SIZE: "1" }));
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
  assert.doesNotMatch(md, /Weights \(fixed on the 20 tuning words\): 2 × plausible/);
  assert.match(md, /Tuning: exact 20 \/ 20/);
  // the measured words now pick cell 1 for every word, which is Flash's cell for 10
  assert.match(md, /\| Exact \(the main cell is Flash's cell\) \| 10 \/ 62 \(16\.1%\) \|/);
});

test("AC5: the exact rate of vivid alone, next to SP-064's vivid alone, on the same 62 words", async () => {
  const md = await report(syntheticRun());
  // SP-066: cell 1 has the highest vivid for every measured word; Flash's cell 1 for m21–m39 odd (10)
  // SP-064 (stand-in): vivid alone is its best cell, Flash's cell for m0–m9 (10)
  assert.match(md, /\| Vivid alone, exact \(the scored cell with the highest vivid score\) \| 10 \/ 62 \(16\.1%\) \| 10 \/ 62 \(16\.1%\) \| n\/a \| 11% \| — \|/);
  assert.match(md, /SP-064's own report gave vivid alone 6% exact, on its own measure words/);
});

test("AC5: how many of the 82 words skipped the gate, next to SP-064's count of 82", async () => {
  const md = await report(syntheticRun());
  assert.match(md, /Gate skipped: 0 of 82 words \(82 judged\), next to SP-064's 31 of 82\./);
  const run = syntheticRun();
  for (const w of run.words.slice(0, 5)) w.pick.gateSkipped = true;
  const md2 = await report(run);
  assert.match(md2, /Gate skipped: 5 of 82 words \(82 judged\), next to SP-064's 31 of 82\./);
  assert.match(md2, /## Words where every cell hid a must-see item \(5\)/);
});

test("AC5: it gives the tuning words, marking SP-064's hits, and uses the weights fixed in weights.json", async () => {
  const md = await report(syntheticRun());
  const tuning = Array.from({ length: 20 }, (_, i) => `t${i}${i < 5 ? " (SP-064 hit)" : ""}`).join(", ");
  assert.match(md, new RegExp(`Tuning words \\(20, seeded draw, seed 66\\): ${tuning.replace(/[()]/g, "\\$&")}`));

  // weights.json wins over a new search: 1 · plausible makes cell 1 the main cell for every word
  const fixed = await report(syntheticRun(), undefined, { weights: { plausible: 1, vivid: 1, clarity: 1 } });
  assert.match(fixed, /Weights \(fixed on the 20 tuning words\): 1 × plausible \+ 1 × vivid \+ 1 × must-see clarity/);
  assert.match(fixed, /\| Exact \(the main cell is Flash's cell\) \| 10 \/ 62 \(16\.1%\) \|/);
});

test("AC5: without SP-064's saved run, its columns are n/a", async () => {
  const md = await report(syntheticRun(), undefined, { sp064: null });
  assert.match(md, /\| Exact \(the main cell is Flash's cell\) \| 31 \/ 62 \(50\.0%\) \| n\/a \| 10 \/ 62/);
  assert.match(md, /Gate skipped: 0 of 82 words \(82 judged\), next to SP-064's n\/a\./);
});
