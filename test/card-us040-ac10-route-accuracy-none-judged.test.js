// US-040 AC10 — Jev can't answer for any word during the routing accuracy check.
//
// Given Jev can't answer for any word during the routing accuracy check,
// when the check runs, then the report says no words were judged and draws no
// conclusion on the cut-offs, and the command exits non-zero (1: a clean stop,
// per the step contract; 2 is for crashes).
//
// With nothing judged no report file is written, even to an explicit path
// (AC12: a saved report must never be overwritten by an empty run), so what
// the check reports is its own output: the counts on stdout, the stop on stderr.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHarness } = require("./helpers/card-harness");

for (const jev of ["down", "unconfigured"]) {
  test(`US-040 AC10: route-accuracy.js with Jev ${jev} reports no words judged, no cut-off conclusion, exit 1`, async () => {
    const h = await createHarness({}, { jev, rows: ["wary\tThe weary hiker stays careful near the cliff, re safety."] });
    try {
      const reportPath = `${h.tmp}/report.md`;
      const run = await h.runScript("route-accuracy.js", [reportPath]);
      assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

      // Every word unjudged: 14 general (wary + 13 misses) + 4 word-part misses.
      assert.match(run.stdout, /^unjudged: 18$/m);
      assert.match(run.stdout, /^general: 0 judged\b/m);
      assert.match(run.stdout, /^word-part: 0 judged\b/m);

      // Says no words were judged, and draws no conclusion on the cut-offs either way.
      const out = run.stdout + run.stderr;
      assert.match(run.stderr, /no words were judged/i);
      assert.match(run.stderr, /no conclusion on the 0\.3 \/ 0\.7 cut-offs/i);
      assert.doesNotMatch(out, /cut-offs hold|cut-offs don't hold|results support/);

      // No report is written, even to the path given.
      assert.equal(fs.existsSync(reportPath), false);
      assert.doesNotMatch(run.stdout, /^wrote /m);
    } finally {
      await h.cleanup();
    }
  });
}
