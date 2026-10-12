// US-040 AC14 — an empty report path fails before Jev is asked.
//
// Given a saved routing accuracy report in the repo, when Flash runs the check
// with an empty report path (""), then the command fails before any word is put
// to Jev and says the report path is empty, and the saved report is left as it was.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHarness } = require("./helpers/card-harness");

const ROWS = ["wary\tThe weary hiker stays careful near the cliff."];
const repoRoot = path.join(__dirname, "..");
const SAVED = path.join(repoRoot, "docs", "backlog", "reports", "US-040-route-accuracy.md");
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A temp copy of the layout: scripts, plus a copy of the saved report at the
// default path. The real saved report is only ever read.
function cloneLayout() {
  const clone = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "nemo-route-accuracy-empty-")));
  fs.cpSync(path.join(repoRoot, "scripts"), path.join(clone, "scripts"), { recursive: true });
  const report = path.join(clone, "docs", "backlog", "reports", "US-040-route-accuracy.md");
  fs.mkdirSync(path.dirname(report), { recursive: true });
  fs.copyFileSync(SAVED, report);
  return { clone, report };
}

for (const [name, arg] of [["empty", ""], ["whitespace-only", "   "]]) {
  test(`US-040 AC14: a report path that's ${name} stops (exit 1) before any Jev call, says it's empty, and leaves the saved report as it was`, async () => {
    const { clone, report } = cloneLayout();
    const before = fs.readFileSync(report);
    const h = await createHarness({}, { root: clone, rows: ROWS });
    try {
      const run = await h.runScript("route-accuracy.js", [arg]);
      assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.equal(h.jev.calls.length, 0);
      assert.match(run.stderr, /report path is empty/i);
      assert.doesNotMatch(run.stdout, /^wrote /m);
      assert.ok(fs.readFileSync(report).equals(before), "saved report changed");
    } finally {
      await h.cleanup();
      fs.rmSync(clone, { recursive: true, force: true });
    }
  });
}

test("US-040 AC14: no argument still uses the default report path", async () => {
  const { clone, report } = cloneLayout();
  const before = fs.readFileSync(report);
  const h = await createHarness({}, { root: clone, rows: ROWS });
  try {
    const run = await h.runScript("route-accuracy.js", []);
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, new RegExp(`^wrote ${escape(report)}`, "m"));
    assert.ok(!fs.readFileSync(report).equals(before), "default report not rewritten");
  } finally {
    await h.cleanup();
    fs.rmSync(clone, { recursive: true, force: true });
  }
});
