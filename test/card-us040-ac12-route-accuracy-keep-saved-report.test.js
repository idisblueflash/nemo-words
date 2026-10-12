// US-040 AC12 — a run with nothing judged leaves the saved report alone.
//
// Given a saved routing accuracy report in the repo, when Flash runs the check
// with no report path and Jev can't answer for any word, then the saved report
// is left as it was, and the command exits non-zero and says nothing was judged.
//
// Runs against a throwaway copy of scripts/ (plus a copy of the saved report at
// its default path), so the real docs/backlog/reports/ is never touched.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHarness } = require("./helpers/card-harness");

const repoRoot = path.join(__dirname, "..");
const REPORT = path.join("docs", "backlog", "reports", "US-040-route-accuracy.md");

function cloneWithSavedReport() {
  const clone = fs.mkdtempSync(path.join(os.tmpdir(), "nemo-route-accuracy-clone-"));
  fs.cpSync(path.join(repoRoot, "scripts"), path.join(clone, "scripts"), { recursive: true });
  fs.mkdirSync(path.dirname(path.join(clone, REPORT)), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, REPORT), path.join(clone, REPORT));
  return clone;
}

test("US-040 AC12: with no report path and nothing judged, the saved report is left as it was; exit 1, says nothing was judged", async () => {
  const clone = cloneWithSavedReport();
  const saved = fs.readFileSync(path.join(clone, REPORT), "utf8");
  const h = await createHarness({}, { root: clone, jev: "down", rows: ["wary\tThe weary hiker stays careful near the cliff."] });
  try {
    const run = await h.runScript("route-accuracy.js", []);
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(fs.readFileSync(path.join(clone, REPORT), "utf8"), saved);
    assert.match(run.stderr, /no words were judged/i);
    assert.doesNotMatch(run.stdout, /^wrote /m);
  } finally {
    await h.cleanup();
    fs.rmSync(clone, { recursive: true, force: true });
  }
});
