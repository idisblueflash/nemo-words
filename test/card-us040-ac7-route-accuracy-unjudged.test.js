// US-040 AC7 — words Jev can't answer during the routing accuracy check.
//
// Given Jev can't answer for some words during the routing accuracy check
// (error or unusable answer), when the check runs, then those words are
// reported as unjudged instead of being guessed, and the counts are over the
// judged words only, with the number of unjudged words shown.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHarness } = require("./helpers/card-harness");

test("US-040 AC7: route-accuracy.js reports words Jev errors on or answers unusably as unjudged, and counts only judged words", async () => {
  const h = await createHarness(
    // trial: an HTTP error; ibuprofen: an unusable answer; every other word 0.1 (general).
    { jevByWord: { trial: "http-500", ibuprofen: "high" } },
    { rows: ["wary\tThe weary hiker stays careful near the cliff."] }
  );
  try {
    const reportPath = `${h.tmp}/report.md`;
    const run = await h.runScript("route-accuracy.js", [reportPath]);
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    const report = fs.readFileSync(reportPath, "utf8");

    // Unjudged, not guessed: listed with the cause, and in no routed row.
    assert.match(report, /^\| trial \| general \| Jev answered HTTP 500/m);
    assert.match(report, /^\| ibuprofen \| word-part \| unusable Jev answer/m);
    assert.doesNotMatch(report, /^\| trial \| general \| [\d.]+ \|/m);
    assert.doesNotMatch(report, /^\| ibuprofen \| word-part \| [\d.]+ \|/m);

    // Counts over judged words only. general: wary + 13 misses - trial = 13,
    // all at 0.1, so right; word-part: 4 misses - ibuprofen = 3, all at 0.1, so wrong.
    assert.match(report, /^\| general \| 13 \| 13 \| 0 \| 0 \|$/m);
    assert.match(report, /^\| word-part \| 3 \| 0 \| 3 \| 0 \|$/m);

    // The number of unjudged words is shown.
    assert.match(report, /^- Unjudged: 2 words\b/m);
  } finally {
    await h.cleanup();
  }
});
