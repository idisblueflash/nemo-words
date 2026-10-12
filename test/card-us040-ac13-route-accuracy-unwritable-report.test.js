// US-040 AC13 — a report path that can't be written fails before Jev is asked.
//
// Given a report path that can't be written (e.g. a directory), when Flash runs
// the routing accuracy check with that path, then the command fails before any
// word is put to Jev, and it says the report path can't be written.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHarness } = require("./helpers/card-harness");

const ROWS = ["wary\tThe weary hiker stays careful near the cliff."];

test("US-040 AC13: a directory as the report path stops (exit 1) before any Jev call and says it can't be written", async () => {
  const h = await createHarness({}, { rows: ROWS });
  try {
    const dir = path.join(h.tmp, "a-directory");
    fs.mkdirSync(dir);
    const run = await h.runScript("route-accuracy.js", [dir]);
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(h.jev.calls.length, 0);
    assert.match(run.stderr, /report path can't be written/i);
    assert.match(run.stderr, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(run.stdout, /^wrote /m);
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally {
    await h.cleanup();
  }
});

test("US-040 AC13: a report path under a file (not a folder) stops before any Jev call and touches nothing", async () => {
  const h = await createHarness({}, { rows: ROWS });
  try {
    const file = path.join(h.tmp, "a-file");
    fs.writeFileSync(file, "keep me");
    const run = await h.runScript("route-accuracy.js", [path.join(file, "sub", "report.md")]);
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(h.jev.calls.length, 0);
    assert.match(run.stderr, /report path can't be written/i);
    assert.equal(fs.readFileSync(file, "utf8"), "keep me");
  } finally {
    await h.cleanup();
  }
});

test("US-040 AC13: a missing folder on a writable path still passes the check (created when the report is written)", async () => {
  const h = await createHarness({}, { rows: ROWS });
  try {
    const reportPath = path.join(h.tmp, "new-folder", "report.md");
    const run = await h.runScript("route-accuracy.js", [reportPath]);
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.ok(fs.existsSync(reportPath));
  } finally {
    await h.cleanup();
  }
});

test("US-040 AC13: the default report path gets the same check (a directory there stops before Jev)", async () => {
  const repoRoot = path.join(__dirname, "..");
  const clone = fs.mkdtempSync(path.join(os.tmpdir(), "nemo-route-accuracy-clone-"));
  fs.cpSync(path.join(repoRoot, "scripts"), path.join(clone, "scripts"), { recursive: true });
  const defaultReport = path.join(clone, "docs", "backlog", "reports", "US-040-route-accuracy.md");
  fs.mkdirSync(defaultReport, { recursive: true });
  const h = await createHarness({}, { root: clone, rows: ROWS });
  try {
    const run = await h.runScript("route-accuracy.js", []);
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(h.jev.calls.length, 0);
    assert.match(run.stderr, /report path can't be written/i);
  } finally {
    await h.cleanup();
    fs.rmSync(clone, { recursive: true, force: true });
  }
});

test("US-040 AC13: a writable path that doesn't exist yet passes the check without being created up front", async () => {
  // With Jev down nothing is judged, so no report is written (AC12): the check
  // itself must not have left an empty file behind.
  const h = await createHarness({}, { jev: "down", rows: ROWS });
  try {
    const reportPath = path.join(h.tmp, "report.md");
    const run = await h.runScript("route-accuracy.js", [reportPath]);
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stderr, /no words were judged/i);
    assert.equal(fs.existsSync(reportPath), false);
  } finally {
    await h.cleanup();
  }
});
