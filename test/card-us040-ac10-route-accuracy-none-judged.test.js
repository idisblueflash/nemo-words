// US-040 AC10 — Jev can't answer for any word during the routing accuracy check.
//
// Given Jev can't answer for any word during the routing accuracy check,
// when the check runs, then the report says no words were judged and draws no
// conclusion on the cut-offs, and the command exits non-zero (1: a clean stop,
// per the step contract; 2 is for crashes).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHarness } = require("./helpers/card-harness");

for (const jev of ["down", "unconfigured"]) {
  test(`US-040 AC10: route-accuracy.js with Jev ${jev} reports no words judged, no cut-off conclusion, exit 1`, async () => {
    const h = await createHarness({}, { jev, rows: ["wary\tThe weary hiker stays careful near the cliff."] });
    try {
      const reportPath = `${h.tmp}/report.md`;
      const run = await h.runScript("route-accuracy.js", [reportPath]);
      assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      const report = fs.readFileSync(reportPath, "utf8");

      // Every word unjudged: 14 general (wary + 13 misses) + 4 word-part misses.
      assert.match(report, /^- Judged: 0 words\b/m);
      assert.match(report, /^- Unjudged: 18 words\b/m);
      assert.match(report, /no words were judged/i);

      // No conclusion on the cut-offs either way.
      assert.doesNotMatch(report, /cut-offs hold/);
      assert.doesNotMatch(report, /cut-offs don't hold/);
      assert.doesNotMatch(report, /results support/);
      assert.match(report, /no conclusion on the 0\.3 \/ 0\.7 cut-offs/i);

      // The stop is said on stderr too.
      assert.match(run.stderr, /no words were judged/i);
    } finally {
      await h.cleanup();
    }
  });
}
