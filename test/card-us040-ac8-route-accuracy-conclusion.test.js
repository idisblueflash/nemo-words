// US-040 AC8 (the part a mock can check) — the routing accuracy report ends
// with a conclusion on the cut-offs.
//
// Given the routing accuracy check has been run, when Flash opens its saved
// report, then it ends by saying whether the 0.3 / 0.7 cut-offs hold, or which
// cut-offs the results support instead. (That the saved report holds the real
// Jev's results is the one real-Jev run, docs/backlog/reports/US-040-route-accuracy.md.)

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHarness } = require("./helpers/card-harness");
const { QA_MISSES } = require("../scripts/route-accuracy");

// Jev's answer per word: every general-labelled word gets `pGeneral`, every
// word-part-labelled word `pWordPart` (the card file has one whole-word row, wary).
function answers(pGeneral, pWordPart) {
  const byWord = { wary: pGeneral };
  for (const w of QA_MISSES.general) byWord[w] = pGeneral;
  for (const w of QA_MISSES["word-part"]) byWord[w] = pWordPart;
  return byWord;
}

async function runCheck(jevByWord) {
  const h = await createHarness({ jevByWord }, { rows: ["wary\tThe weary hiker stays careful near the cliff."] });
  try {
    const reportPath = `${h.tmp}/report.md`;
    const run = await h.runScript("route-accuracy.js", [reportPath]);
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    return fs.readFileSync(reportPath, "utf8");
  } finally {
    await h.cleanup();
  }
}

// The report's last section and its last non-empty line.
function ending(report) {
  const last = report.slice(report.lastIndexOf("\n## ") + 1);
  return { last, finalLine: last.trim().split("\n").pop() };
}

test("US-040 AC8: the report ends by saying the 0.3 / 0.7 cut-offs hold when no other cut-offs do better", async () => {
  const { last, finalLine } = ending(await runCheck(answers(0.1, 0.9)));
  assert.match(last, /^## Cut-offs/);
  assert.match(finalLine, /^\*\*Conclusion:\*\* the 0\.3 \/ 0\.7 cut-offs hold\b/);
});

test("US-040 AC8: the report ends by naming the cut-offs the results support instead, when 0.3 / 0.7 don't hold", async () => {
  // Every general word sits at p 0.35: unsure under 0.3 / 0.7, general under a 0.35 lower cut-off.
  const { last, finalLine } = ending(await runCheck(answers(0.35, 0.9)));
  assert.match(last, /^## Cut-offs/);
  assert.match(finalLine, /^\*\*Conclusion:\*\* the 0\.3 \/ 0\.7 cut-offs don't hold; the results support 0\.35 \/ 0\.7 instead\b/);
});
