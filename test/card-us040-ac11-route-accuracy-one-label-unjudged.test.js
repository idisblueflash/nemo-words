// US-040 AC11 — Jev can't answer for every word of one label during the
// routing accuracy check.
//
// Given Jev can't answer for every word of one label, when the check runs,
// then the report says that label has no judged words, and it draws no
// conclusion on the cut-off that label decides: the general label decides the
// lower cut-off (0.3), the word-part label the upper one (0.7). That cut-off is
// held at its current value and only the other one is searched; the run still
// exits 0, since the other cut-off gets a conclusion (contrast AC10, where
// nothing is judged and it exits 1).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHarness } = require("./helpers/card-harness");
const { QA_MISSES } = require("../scripts/route-accuracy");

// Jev's answer per word: general-labelled words get `pGeneral`, word-part ones
// `pWordPart` (either may be "http-500"). The card file has one whole-word row, wary.
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
    const report = fs.readFileSync(reportPath, "utf8");
    const last = report.slice(report.lastIndexOf("\n## ") + 1);
    return { run, report, last, finalLine: last.trim().split("\n").pop() };
  } finally {
    await h.cleanup();
  }
}

test("US-040 AC11: no word-part word judged — the report says so, draws no conclusion on the 0.7 upper cut-off, and searches only the lower one", async () => {
  // General words at 0.35: unsure under 0.3, general under a 0.35 lower cut-off.
  const { run, report, last, finalLine } = await runCheck(answers(0.35, "http-500"));
  assert.match(report, /the word-part label has no judged words/i);
  assert.match(last, /^## Cut-offs/);
  assert.match(finalLine, /^\*\*Conclusion:\*\* no conclusion on the 0\.7 upper cut-off \(the word-part label has no judged words\)/);
  assert.match(finalLine, /the 0\.3 lower cut-off doesn't hold; the results support 0\.35 instead\b/);
  // The upper cut-off stays put: no pair with another upper value is offered.
  assert.doesNotMatch(last, /0\.\d+ \/ 0\.(?!7\b)\d+/);
  assert.doesNotMatch(last, /cut-offs hold|cut-offs don't hold/);
  assert.match(run.stdout, /word-part: 0 judged/);
});

test("US-040 AC11: no general word judged — the report says so, draws no conclusion on the 0.3 lower cut-off, and searches only the upper one", async () => {
  // Word-part words at 0.65: unsure under 0.7, word-part under a 0.65 upper cut-off.
  const { report, last, finalLine } = await runCheck(answers("http-500", 0.65));
  assert.match(report, /the general label has no judged words/i);
  assert.match(finalLine, /^\*\*Conclusion:\*\* no conclusion on the 0\.3 lower cut-off \(the general label has no judged words\)/);
  assert.match(finalLine, /the 0\.7 upper cut-off doesn't hold; the results support 0\.65 instead\b/);
  assert.doesNotMatch(last, /0\.(?!3\b)\d+ \/ 0\.\d+/);
});

test("US-040 AC11: no general word judged and the word-part words all clear 0.7 — the upper cut-off holds, the lower gets no conclusion", async () => {
  const { finalLine } = await runCheck(answers("http-500", 0.9));
  assert.match(finalLine, /^\*\*Conclusion:\*\* no conclusion on the 0\.3 lower cut-off \(the general label has no judged words\); the 0\.7 upper cut-off holds\b/);
});
