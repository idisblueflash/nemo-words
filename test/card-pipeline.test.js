// EN-036: Dagu runs the card pipeline as small step CLIs.
//
// End-to-end coverage for `scripts/card.js <word>` -> `dags/card.yaml` ->
// US-028's real step CLIs (which replaced EN-036's throwaway stubs). These
// really invoke Dagu, so they need the `dagu` binary on PATH. The US-028 card
// harness supplies fake `claude` / `nemo-words` / `word-freq` executables, a
// mock AnkiConnect, a throwaway card file, and a throwaway DAGU_HOME (with a
// space in it, like Dagu's real macOS home), so runs never touch live Anki,
// the real card file, or Flash's real Dagu history.
//
// The non-happy paths are driven by real inputs:
//   "ice cream"                       normalize exits 1 (not one word): a clean stop
//   a fixture with no `define` answer define exits 2 (the model call errors)
//   a copy of the pipeline whose ipa step throws: an uncaught crash

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { createHarness, clonePipeline: cloneInto, germaneFixture, repoRoot } = require("./helpers/card-harness");

const execFileAsync = promisify(execFile);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "card-pipeline-"));
test.after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

const STEPS = [
  "normalize", "route", "judge-route", "ipa", "syllabify", "define", "gloss", "chunk", "find-keywords",
  "compose-stories", "check-stories",
  "judge-stories", // US-038: Jev judges the stories against the rubric
  "pick-story", "story", "write-row",
  "tag-technique", "log-card", // US-039: the auto-made card is logged
  "sync", "report",
];

// Runs a command and resolves to { code, stdout, stderr } whatever the exit code.
async function run(file, args, opts = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, { env: opts.env, cwd: opts.cwd || repoRoot, timeout: 60000 });
    return { code: 0, stdout, stderr };
  } catch (err) {
    if (typeof err.code !== "number") throw err;
    return { code: err.code, stdout: err.stdout, stderr: err.stderr };
  }
}

// Runs the inspect command card.js printed on stderr (what Flash would run to
// look at the run) and returns each step as Dagu recorded it:
// { <step>: { status, stdout, stderr }, ... }, stdout/stderr being the
// contents of that step's own log files (absent when Dagu lists no such log).
async function inspect(h, res) {
  const m = /\(inspect: dagu status --run-id (\S+) (.+)\)$/m.exec(res.stderr);
  assert.ok(m, `no inspect hint in stderr: ${res.stderr}`);
  const status = await run("dagu", ["status", "--run-id", m[1], m[2]], { env: { ...h.env, COLUMNS: "10000" } });
  assert.equal(status.code, 0, status.stderr);
  const steps = {};
  let current = null;
  for (const line of status.stdout.split("\n")) {
    const head = /^[├└]─(\S+)(?: \([^)]*\))? \[(\w+)\]$/.exec(line);
    if (head) steps[(current = head[1])] = { status: head[2] };
    const log = /[├└]─(stdout|stderr): (.+)$/.exec(line);
    if (log && current) steps[current][log[1]] = fs.readFileSync(log[2], "utf8");
  }
  assert.deepEqual(Object.keys(steps), STEPS);
  return steps;
}

async function withHarness(fixture, options, body) {
  const h = await createHarness(fixture, options);
  try {
    return await body(h);
  } finally {
    await h.cleanup();
  }
}

const after = (step) => STEPS.slice(STEPS.indexOf(step) + 1);

test("AC1: each step receives the previous steps' stdout, and the run ends as succeeded", async () => {
  await withHarness(germaneFixture(), {}, async (h) => {
    const res = await h.runCard("germane");
    assert.equal(res.code, 0, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
    // card.js prints the last step's stdout: the run report
    assert.match(res.stdout, /^carded germane \(added\)\nstory: The main point stays relevant to the talk\.\n/);

    const steps = await inspect(h, res);
    for (const s of STEPS) assert.equal(steps[s].status, "succeeded", s);
    // ipa's stdout (Unicode IPA) is exactly what syllabify worked from…
    assert.equal(steps.ipa.stdout, "dʒɚmˈeɪn\n");
    assert.equal(steps.syllabify.stdout, "dʒɚ.ˈmeɪn\n");
    // …and TSV records cross steps byte-exact: pick-story read compose-stories'
    // candidates file and printed its first passing `sentence<TAB>pivots` line
    assert.match(steps["compose-stories"].stdout, /^The main point stays relevant to the talk\.\tmain,relevant\n/);
    assert.equal(steps["pick-story"].stdout, "The main point stays relevant to the talk.\tmain,relevant\n");
    assert.equal(steps.story.stdout, "The main point stays relevant to the talk.\tmain,relevant\tpicked\n");
  });
});

test("AC1: the caller's env overrides reach the steps through Dagu (fakes, card file, sync log)", async () => {
  await withHarness(germaneFixture(), {}, async (h) => {
    const res = await h.runCard("germane");
    assert.equal(res.code, 0, res.stderr);
    assert.equal(h.claudeCalls().length, 3); // NEMO_CLAUDE_BIN: define, gloss, compose-stories
    assert.equal(h.mock.calls.filter((c) => c.action === "addNote").length, 1); // ANKI_CONNECT_URL
    assert.match(h.readAnkiFile(), /^germane\t/m); // ANKI_FILE
    assert.match(fs.readFileSync(h.syncLog, "utf8"), /term=germane file=added sync=ok/); // ANKI_SYNC_LOG
  });
});

test("AC2: a step that exits 1 stops the run cleanly, later steps never run, and its reason is shown", async () => {
  await withHarness(germaneFixture(), {}, async (h) => {
    const res = await h.runCard("ice cream");
    assert.equal(res.code, 1, `stderr: ${res.stderr}`);
    assert.equal(res.stdout, 'stopped at normalize: not one word: "ice cream"\n');
    const steps = await inspect(h, res);
    assert.equal(steps.normalize.status, "succeeded");
    for (const s of after("normalize")) assert.deepEqual(steps[s], { status: "skipped" }, s);
    assert.deepEqual(h.claudeCalls(), []);
  });
});

test("AC2: a stop with several reasons shows them all, joined by `; `", async () => {
  await withHarness(germaneFixture(), { anki: "down" }, async (h) => {
    const res = await h.runCard("germane");
    assert.equal(res.code, 1, `stderr: ${res.stderr}`);
    assert.match(
      res.stdout,
      /^stopped at sync: sync failed: .*AnkiConnect.*; the row is written; re-run later: node scripts\/sync\.js "germane"\n$/
    );
    const steps = await inspect(h, res);
    assert.equal(steps.sync.status, "succeeded");
    assert.deepEqual(steps.report, { status: "skipped" });
  });
});

test("AC2: skipping a branch on purpose is not a stop — the logged-story path still ends as succeeded", async () => {
  const logged = "Jermaine's main point stayed relevant.";
  await withHarness(germaneFixture(), { log: [{ word: "germane", sentence: logged, pivot_words: ["main"] }] }, async (h) => {
    const res = await h.runCard("germane");
    assert.equal(res.code, 0, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
    const steps = await inspect(h, res);
    for (const s of ["find-keywords", "compose-stories", "check-stories", "judge-stories", "pick-story"]) {
      assert.deepEqual(steps[s], { status: "skipped" }, s);
    }
    for (const s of ["story", "write-row", "sync", "report"]) assert.equal(steps[s].status, "succeeded", s);
  });
});

test("AC3: a step that exits 2 fails the run, later steps never run, and its stderr is shown", async () => {
  const fixture = germaneFixture();
  delete fixture.claude.define; // the fake model has no answer -> define errors out
  await withHarness(fixture, {}, async (h) => {
    const res = await h.runCard("germane");
    assert.equal(res.code, 2, `stderr: ${res.stderr}`);
    assert.equal(res.stdout, "");
    assert.match(res.stderr, /failed at define:\nerror: .*fake claude: no answer for define/);
    const steps = await inspect(h, res);
    assert.equal(steps.define.status, "failed");
    for (const s of after("define")) assert.ok(!["succeeded", "running"].includes(steps[s].status), `${s}: ${steps[s].status}`);
    for (const s of after("define")) assert.ok(!steps[s].stdout, `${s} wrote stdout`);
    assert.doesNotMatch(h.readAnkiFile(), /^germane\t/m);
  });
});

// A copy of the pipeline (dags/ + scripts/ code, no data) under tmpRoot/<name>,
// standing in for a fresh clone. US-039: _logan's reference tables come along,
// since tag-technique and log-card read the controlled vocabularies from them.
const clonePipeline = (name) => cloneInto(path.join(tmpRoot, name));

test("AC3: a step that crashes fails the run (not a stop), later steps never run, and its stderr is shown", async () => {
  const clone = clonePipeline("crashing clone");
  fs.writeFileSync(
    path.join(clone, "scripts", "ipa.js"),
    'require("./lib/step-contract");\nthrow new Error("ipa asked for a crash");\n'
  );
  await withHarness(germaneFixture(), { root: clone }, async (h) => {
    const res = await h.runCard("germane");
    assert.equal(res.code, 2, `stderr: ${res.stderr}`);
    assert.equal(res.stdout, "");
    assert.match(res.stderr, /failed at ipa:\n[\s\S]*Error: ipa asked for a crash/);
    const steps = await inspect(h, res);
    assert.equal(steps.ipa.status, "failed");
    for (const s of after("ipa")) assert.ok(!["succeeded", "running"].includes(steps[s].status), `${s}: ${steps[s].status}`);
  });
});

test("AC4: after a succeeded run, each step's stdout and stderr can be read on its own", async () => {
  await withHarness(germaneFixture(), {}, async (h) => {
    const steps = await inspect(h, await h.runCard("germane"));
    assert.equal(steps.normalize.stdout, "germane\n");
    assert.equal(steps.route.stdout, "general\n");
    assert.equal(steps.define.stdout.split("\n")[0], "relevant");
    assert.equal(steps.gloss.stdout, "relevant to the matter at hand\n");
    assert.equal(steps["write-row"].stdout, "added\tgermane\n");
    assert.equal(steps.sync.stdout, "ok\n");
    // stderr is its own log, never mixed into stdout: no step had anything to
    // say but pick-story, whose pick note feeds the run report (US-038)
    assert.equal(steps["pick-story"].stderr, "pick: total 6 (anchor 2, meaning 2, vivid 2)\n");
    assert.ok(!steps["pick-story"].stdout.includes("pick: total"));
    for (const s of STEPS.filter((x) => x !== "pick-story")) assert.ok(!steps[s].stderr, `${s} stderr: ${steps[s].stderr}`);
  });
});

test("AC4: after a stopped run, the stopping step's stdout (its reasons) can be read on its own", async () => {
  await withHarness(germaneFixture(), {}, async (h) => {
    // (US-040: an ambiguous word no longer stops at route, so a word-part word drives the stop.)
    const steps = await inspect(h, await h.runCard("nephrectomy"));
    assert.equal(steps.route.stdout, "word-part: nephrectomy belongs to the word-part path (_etta_mology), not a story card\n");
    assert.ok(!steps.route.stderr, "a stop writes nothing to stderr");
    assert.deepEqual(steps.ipa, { status: "skipped" }, "a skipped step has no logs");
  });
});

test("AC4: after a failed run, the failing step's stderr can be read on its own", async () => {
  const fixture = germaneFixture();
  delete fixture.claude.define;
  await withHarness(fixture, {}, async (h) => {
    const steps = await inspect(h, await h.runCard("germane"));
    assert.ok(!steps.define.stdout, "a failure writes nothing to stdout");
    assert.match(steps.define.stderr, /^error: .*fake claude: no answer for define/);
    assert.ok(!steps.gloss.stdout && !steps.gloss.stderr, "a step that never ran has no logs");
  });
});

test("AC3 edge: a pipeline Dagu cannot even start ends as failed (exit 2), never as stopped", async () => {
  const clone = clonePipeline("broken clone");
  fs.writeFileSync(path.join(clone, "dags", "card.yaml"), "steps: [this is: not: valid\n");
  await withHarness(germaneFixture(), { root: clone }, async (h) => {
    const res = await h.runCard("germane");
    assert.equal(res.code, 2, `stderr: ${res.stderr}`);
    assert.equal(res.stdout, "");
    assert.match(res.stderr, /card: dagu could not run the pipeline/);
  });
});

// Every file under dir, recursively, as paths relative to it.
function listFiles(dir) {
  return fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile());
}

test("AC5: a fresh clone runs with one command, from any directory, with nothing copied into Dagu's config folder", async () => {
  // a fresh "clone": just the pipeline files, somewhere else entirely, run
  // from an unrelated directory; the harness gives it a fresh, empty DAGU_HOME
  const clone = clonePipeline("fresh clone");
  await withHarness(germaneFixture(), { root: clone, cwd: os.tmpdir() }, async (h) => {
    assert.deepEqual(fs.readdirSync(h.daguHome), [], "Dagu home starts empty");
    const res = await h.runCard("germane");
    assert.equal(res.code, 0, `stderr: ${res.stderr}`);
    assert.match(res.stdout, /^carded germane \(added\)$/m);
    assert.match(h.readAnkiFile(), /^germane\tThe main point stays relevant to the talk\.\t/m); // the clone's own card file
    const daguFiles = listFiles(h.daguHome);
    assert.ok(daguFiles.length > 0, "dagu did use the fresh home");
    const pipelineFiles = new Set(["card.yaml", ...fs.readdirSync(path.join(clone, "scripts"))]);
    assert.deepEqual(daguFiles.filter((f) => pipelineFiles.has(path.basename(f))), []);
  });
});

test("AC5 edge: with Dagu not installed, card.js exits 2 with an install hint, not a raw spawn error", async () => {
  const res = await run(process.execPath, [path.join(repoRoot, "scripts", "card.js"), "germane"], {
    env: { ...process.env, PATH: "/nonexistent" },
  });
  assert.equal(res.code, 2);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /install Dagu/);
  assert.doesNotMatch(res.stderr, /ENOENT|at .*\(node:/);
});
