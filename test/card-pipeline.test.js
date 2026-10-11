// EN-036: Dagu runs the card pipeline as small step CLIs.
//
// End-to-end coverage for `scripts/card.js <word>` -> `dags/card.yaml` ->
// the two throwaway stub steps (`scripts/stub-step-one.js`,
// `scripts/stub-step-two.js`). These really invoke Dagu, so they need the
// `dagu` binary on PATH. Every run uses a throwaway DAGU_HOME so test runs
// never land in Flash's real Dagu history.
//
// The stubs take magic words to exercise the non-happy paths:
//   __stop__   step one exits 1 with reasons on stdout (clean stop)
//   __fail__   step one exits 2 with a message on stderr
//   __crash__  step one throws (an uncaught exception -> exit 2)

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const repoRoot = path.join(__dirname, "..");
const cardJs = path.join(repoRoot, "scripts", "card.js");

// The space mirrors Dagu's real macOS home ("Application Support"), so log
// paths handed between steps must survive quoting.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "card-pipeline-"));
const daguHome = path.join(tmpRoot, "dagu home");
fs.mkdirSync(daguHome);
test.after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

// Runs a command and resolves to { code, stdout, stderr } whatever the exit code.
async function run(file, args, opts = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      env: { ...process.env, DAGU_HOME: daguHome, ...opts.env },
      cwd: opts.cwd || repoRoot,
      timeout: 60000,
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    if (typeof err.code !== "number") throw err;
    return { code: err.code, stdout: err.stdout, stderr: err.stderr };
  }
}

function card(word, opts) {
  return run(process.execPath, [cardJs, word], opts);
}

// Runs the inspect command card.js printed on stderr (what Flash would run to
// look at the run) and returns each step as Dagu recorded it:
// { one: { status, stdout, stderr }, ... }, stdout/stderr being the contents
// of that step's own log files (absent when Dagu lists no such log).
async function inspect(res) {
  const m = /\(inspect: dagu status --run-id (\S+) (.+)\)$/m.exec(res.stderr);
  assert.ok(m, `no inspect hint in stderr: ${res.stderr}`);
  const status = await run("dagu", ["status", "--run-id", m[1], m[2]]);
  assert.equal(status.code, 0, status.stderr);
  const steps = {};
  let current = null;
  for (const line of status.stdout.split("\n")) {
    const head = /^[├└]─(\S+)(?: \([^)]*\))? \[(\w+)\]$/.exec(line);
    if (head) steps[(current = head[1])] = { status: head[2] };
    const log = /[├└]─(stdout|stderr): (.+)$/.exec(line);
    if (log && current) steps[current][log[1]] = fs.readFileSync(log[2], "utf8");
  }
  return steps;
}

test("AC1: step two receives step one's stdout and the run ends as succeeded", async () => {
  const res = await card("naïve");
  assert.equal(res.code, 0, `stderr: ${res.stderr}`);
  // step one prints `naïve\tNAÏVE`; step two echoes the record it received and appends its own field
  assert.equal(res.stdout, "naïve\tNAÏVE\tchecked\n");
});

test("AC2: a step that exits 1 stops the run cleanly, later steps never run, and its reason is shown", async () => {
  const res = await card("__stop__");
  assert.equal(res.code, 1, `stderr: ${res.stderr}`);
  assert.equal(res.stdout, "stopped at one: __stop__ is a test word; nothing to look up\n");
  const steps = await inspect(res);
  assert.equal(steps.one.status, "succeeded");
  assert.equal(steps.two.status, "skipped");
});

test("AC3: a step that exits 2 fails the run, later steps never run, and its stderr is shown", async () => {
  const res = await card("__fail__");
  assert.equal(res.code, 2, `stderr: ${res.stderr}`);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /failed at one:\nstub-step-one: __fail__ asked for an error\n/);
  const steps = await inspect(res);
  assert.equal(steps.one.status, "failed");
  assert.equal(steps.two.status, "aborted");
});

test("AC3: a step that crashes fails the run (not a stop), later steps never run, and its stderr is shown", async () => {
  const res = await card("__crash__");
  assert.equal(res.code, 2, `stderr: ${res.stderr}`);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /failed at one:\n[\s\S]*Error: __crash__ asked for a crash/);
  const steps = await inspect(res);
  assert.equal(steps.one.status, "failed");
  assert.equal(steps.two.status, "aborted");
});

test("AC4: after a succeeded run, each step's stdout and stderr can be read on its own", async () => {
  const steps = await inspect(await card("naïve"));
  assert.equal(steps.one.stdout, "naïve\tNAÏVE\n");
  assert.equal(steps.one.stderr, "stub-step-one: looked up naïve\n");
  assert.equal(steps.two.stdout, "naïve\tNAÏVE\tchecked\n");
  assert.equal(steps.two.stderr, "stub-step-two: checked 1 record(s)\n");
});

test("AC4: after a stopped run, the stopping step's stdout (its reasons) can be read on its own", async () => {
  const steps = await inspect(await card("__stop__"));
  assert.equal(steps.one.stdout, "__stop__ is a test word\nnothing to look up\n");
  assert.ok(!steps.one.stderr, "a stop writes nothing to stderr");
  assert.deepEqual(steps.two, { status: "skipped" }, "the skipped step has no logs");
});

test("AC4: after a failed run, the failing step's stderr can be read on its own", async () => {
  const steps = await inspect(await card("__fail__"));
  assert.ok(!steps.one.stdout, "a failure writes nothing to stdout");
  assert.equal(steps.one.stderr, "stub-step-one: __fail__ asked for an error\n");
  assert.deepEqual(steps.two, { status: "aborted" }, "the aborted step has no logs");
});

// Every file under dir, recursively, as paths relative to it.
function listFiles(dir) {
  return fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile());
}

// A copy of just the pipeline files under tmpRoot/<name>, standing in for a fresh clone.
function clonePipeline(name) {
  const clone = path.join(tmpRoot, name);
  fs.mkdirSync(path.join(clone, "scripts", "lib"), { recursive: true });
  fs.cpSync(path.join(repoRoot, "dags"), path.join(clone, "dags"), { recursive: true });
  for (const f of ["card.js", "stub-step-one.js", "stub-step-two.js", path.join("lib", "step-contract.js")]) {
    fs.copyFileSync(path.join(repoRoot, "scripts", f), path.join(clone, "scripts", f));
  }
  return clone;
}

test("AC3 edge: a pipeline Dagu cannot even start ends as failed (exit 2), never as stopped", async () => {
  const clone = clonePipeline("broken clone");
  fs.writeFileSync(path.join(clone, "dags", "card.yaml"), "steps: [this is: not: valid\n");
  const res = await run(process.execPath, [path.join(clone, "scripts", "card.js"), "naïve"]);
  assert.equal(res.code, 2, `stderr: ${res.stderr}`);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /card: dagu could not run the pipeline/);
});

test("AC5: a fresh clone runs with one command, from any directory, with nothing copied into Dagu's config folder", async () => {
  // a fresh "clone": just the pipeline files, somewhere else entirely
  const clone = clonePipeline("fresh clone");
  // a fresh Dagu install: an empty home, so nothing pre-placed can help
  const freshHome = path.join(tmpRoot, "fresh dagu home");
  fs.mkdirSync(freshHome);

  const res = await run(process.execPath, [path.join(clone, "scripts", "card.js"), "naïve"], {
    cwd: os.tmpdir(),
    env: { DAGU_HOME: freshHome },
  });

  assert.equal(res.code, 0, `stderr: ${res.stderr}`);
  assert.equal(res.stdout, "naïve\tNAÏVE\tchecked\n");
  const daguFiles = listFiles(freshHome);
  assert.ok(daguFiles.length > 0, "dagu did use the fresh home");
  assert.deepEqual(daguFiles.filter((f) => /card\.ya?ml$/.test(f) || /stub-step/.test(f)), []);
});

test("AC5 edge: with Dagu not installed, card.js exits 2 with an install hint, not a raw spawn error", async () => {
  const res = await run(process.execPath, [cardJs, "naïve"], { env: { PATH: "/nonexistent" } });
  assert.equal(res.code, 2);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /install Dagu/);
  assert.doesNotMatch(res.stderr, /ENOENT|at .*\(node:/);
});
