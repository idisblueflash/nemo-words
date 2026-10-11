// EN-036: unit coverage for the two throwaway stub step CLIs that
// `dags/card.yaml` chains. They follow the step contract (EN-036 "Step
// contract"): result on stdout, one TSV record per line; notes on stderr;
// exit 0 ok / 1 stopped (reasons on stdout) / 2 error. US-028 replaces them.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const scriptsDir = path.join(__dirname, "..", "scripts");

async function step(name, args) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [path.join(scriptsDir, name), ...args]);
    return { code: 0, stdout, stderr };
  } catch (err) {
    if (typeof err.code !== "number") throw err;
    return { code: err.code, stdout: err.stdout, stderr: err.stderr };
  }
}

test("stub-step-one prints `word<TAB>WORD` on stdout and a note on stderr", async () => {
  const res = await step("stub-step-one.js", ["naïve"]);
  assert.equal(res.code, 0);
  assert.equal(res.stdout, "naïve\tNAÏVE\n");
  assert.match(res.stderr, /stub-step-one: looked up naïve/);
});

test("stub-step-one given `__stop__` exits 1 with its reasons on stdout, one per line", async () => {
  const res = await step("stub-step-one.js", ["__stop__"]);
  assert.equal(res.code, 1);
  assert.equal(res.stdout, "__stop__ is a test word\nnothing to look up\n");
});

test("stub-step-one given `__fail__` exits 2 with its error on stderr and nothing on stdout", async () => {
  const res = await step("stub-step-one.js", ["__fail__"]);
  assert.equal(res.code, 2);
  assert.equal(res.stdout, "");
  assert.equal(res.stderr, "stub-step-one: __fail__ asked for an error\n");
});

test("stub-step-one given `__crash__` exits 2, not 1, so a crash is never mistaken for a clean stop", async () => {
  // Node exits 1 on an uncaught exception by default, which the step contract
  // reserves for "stopped with a reason"
  const res = await step("stub-step-one.js", ["__crash__"]);
  assert.equal(res.code, 2);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /Error: __crash__ asked for a crash/);
});

test("stub-step-two reads step one's stdout from a file and appends `checked` to each record", async () => {
  // records step one could never produce from a word, so this proves step two
  // works off its input file rather than recomputing it
  const input = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "stub-step-two-")), "one.out");
  fs.writeFileSync(input, "foo\tBAR\nbaz\tQUX\n");
  const res = await step("stub-step-two.js", [input]);
  assert.equal(res.code, 0);
  assert.equal(res.stdout, "foo\tBAR\tchecked\nbaz\tQUX\tchecked\n");
  assert.match(res.stderr, /stub-step-two: checked 2 record\(s\)/);
});

test("stub-step-two crashing on a missing input file exits 2, not 1", async () => {
  const res = await step("stub-step-two.js", [path.join(os.tmpdir(), "no-such-stub-input.out")]);
  assert.equal(res.code, 2);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /ENOENT/);
});
