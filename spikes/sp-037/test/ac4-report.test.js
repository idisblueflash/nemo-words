"use strict";

// SP-037 AC4 — Given all 20 words have been ranked, when the spike report is
// written, then it shows the share where Flash's story ranks 1st and in the
// top 2, next to chance, lists each word where Flash's story failed a gate
// (with that gate), and ends with a go / no-go against the agreed bar.
//
// End-to-end through `runSpike` (the spike run's entry point) with a fake
// draft step and a fake Jev client — no network.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { runSpike } = require("../run");
const { fakeLogText, fakeDraft, fakeJev } = require("./helpers/fake-run");

test("AC4: report shows 1st / top-2 shares next to chance, Flash's failed gates, and ends with go / no-go", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "sp037-run-"));
  await runSpike({ logText: fakeLogText(), n: 20, seed: 37, draft: fakeDraft(), client: fakeJev(), outDir });
  const report = fs.readFileSync(path.join(outDir, "report.md"), "utf8");

  assert.match(report, /\| Flash's story ranks 1st \| 10 \/ 20 \(50\.0%\) \| 16\.7% \|/);
  assert.match(report, /\| Flash's story in the top 2 \| 14 \/ 20 \(70\.0%\) \| 33\.3% \|/);
  assert.match(report, /Judged: 20 of 20 words/);

  const failed = report.split("## Flash's story failed a gate")[1].split("\n## ")[0];
  for (const w of ["zqo", "zqp", "zqq", "zqr"]) assert.match(failed, new RegExp(`- ${w}: vividness`));
  for (const w of ["zqs", "zqt"]) assert.match(failed, new RegExp(`- ${w}: word-count`));
  assert.doesNotMatch(failed, /zqa/);

  const sections = report.trim().split("\n## ");
  const last = sections[sections.length - 1];
  assert.match(last, /^Go \/ no-go/);
  assert.match(last, /\*\*Go\*\*/);
  assert.match(last, /1st ≥ 40%.*top 2 ≥ 65%/);

  // raw probabilities saved, so the report can be rebuilt without Jev
  const raw = JSON.parse(fs.readFileSync(path.join(outDir, "raw", "run.json"), "utf8"));
  assert.equal(raw.words.length, 20);
  const judgedFlash = raw.words[0].candidates.find((c) => c.source === "flash");
  assert.equal(typeof judgedFlash.answers.vividness.noul, "number");
});

test("re-run: saved candidate sets are reused (no redraft), and report.md re-renders from raw with another cut-off", async () => {
  const { rerender } = require("../run");
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "sp037-run-"));
  const sets = {};
  await runSpike({ logText: fakeLogText(), draft: fakeDraft(), client: fakeJev(), outDir, candidateSets: sets });
  assert.equal(Object.keys(sets).length, 20);

  const noDraft = async () => assert.fail("must not redraft a word whose set is saved");
  await runSpike({ logText: fakeLogText(), draft: noDraft, client: fakeJev(), outDir, candidateSets: sets });

  rerender(outDir, 0.1); // Flash's vividness p = 0.2 now passes → words 14–17 rank 1st
  const report = fs.readFileSync(path.join(outDir, "report.md"), "utf8");
  assert.match(report, /cut-off p ≥ 0\.1/);
  assert.match(report, /\| Flash's story ranks 1st \| 14 \/ 20 /);
});
