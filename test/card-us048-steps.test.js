// US-048 unit tests: judge-stories names a broken story rubric (read, parse
// and shape failures) and never calls Jev for one.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadRubric, rubricProblem } = require("../scripts/judge-stories");
const { createHarness, clonePipeline, germaneFixture } = require("./helpers/card-harness");

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "card-us048-steps-"));
test.after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

test("loadRubric: a missing file -> RubricError with reason `not found`", () => {
  assert.throws(() => loadRubric(path.join(tmpRoot, "nope", "story-rubric.json")), {
    name: "RubricError",
    message: /\(not found\)$/,
  });
});

test("loadRubric: the default rubric's path is shown repo-relative, as scripts/story-rubric.json", () => {
  const clone = clonePipeline(path.join(tmpRoot, "relpath"));
  const file = path.join(clone, "scripts", "story-rubric.json");
  fs.writeFileSync(file, "");
  // Required fresh from the clone, so its RUBRIC_FILE points at the broken copy.
  const { loadRubric: cloneLoad } = require(path.join(clone, "scripts", "judge-stories.js"));
  assert.throws(() => cloneLoad(), { message: /^can't read scripts\/story-rubric\.json \(Unexpected end of JSON input\)$/ });
});

const realRubric = () => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "scripts", "story-rubric.json"), "utf8"));

test("rubricProblem: names the missing piece", () => {
  const cases = [
    [(r) => delete r.gates.vividness.summary, "gate vividness has no summary question"],
    [(r) => (r.gates.vividness.summary = "  "), "gate vividness has no summary question"],
    [(r) => (r.gates["scene-coherence"].questions = {}), "gate scene-coherence has no split-out questions"],
    [(r) => delete r.gates["scene-coherence"].questions, "gate scene-coherence has no split-out questions"],
    [(r) => (r.gates["animal-harm"].questions["not-hurt"] = ""), "gate animal-harm question not-hurt is empty"],
    [(r) => delete r.axes.anchor.label, "axis anchor has no label"],
    [(r) => r.axes.vivid.levels.pop(), "axis vivid has 2 levels, needs 3"],
    [(r) => r.axes.vivid.levels.push("extra"), "axis vivid has 4 levels, needs 3"],
    [(r) => delete r.axes.meaning.levels, "axis meaning has 0 levels, needs 3"],
    [(r) => (r.axes.meaning.levels[1] = ""), "axis meaning has an empty level"],
    [(r) => delete r.gates, "no gates"],
    [(r) => delete r.axes, "no axes"],
  ];
  for (const [breakIt, want] of cases) {
    const r = realRubric();
    breakIt(r);
    assert.equal(rubricProblem(r), want);
  }
  assert.equal(rubricProblem([]), "no gates");
  assert.equal(rubricProblem(null), "no gates");
});

test("rubricProblem: with several problems, names the first one found", () => {
  const r = realRubric();
  delete r.gates["animal-harm"].summary;
  r.axes.vivid.levels.pop();
  assert.equal(rubricProblem(r), "gate animal-harm has no summary question");
});

test("loadRubric: valid JSON with a missing piece -> RubricError naming the piece", () => {
  const r = realRubric();
  r.axes.vivid.levels.pop();
  const file = path.join(tmpRoot, "shape.json");
  fs.writeFileSync(file, JSON.stringify(r));
  assert.throws(() => loadRubric(file), { name: "RubricError", message: /\(axis vivid has 2 levels, needs 3\)$/ });
});

test("judge-stories CLI: a broken rubric -> exit 2, stdout empty, stderr names the file; Jev never called", async () => {
  const clone = clonePipeline(path.join(tmpRoot, "cli"));
  fs.rmSync(path.join(clone, "scripts", "story-rubric.json"));
  const h = await createHarness(germaneFixture(), { root: clone });
  try {
    const files = [
      h.writeFile("cands.tsv", "Good one.\tmain,relevant\n"),
      h.writeFile("checks.tsv", "-\n"),
      h.writeFile("keywords.tsv", "dʒɚ\t-\nˈmeɪn\tmain\t1.28e-4\n"),
    ];
    const r = await h.runScript("judge-stories.js", ["germane", "relevant", ...files]);
    assert.equal(r.code, 2);
    assert.equal(r.stdout, "");
    assert.equal(
      r.stderr,
      "stories not judged: can't read scripts/story-rubric.json (not found); picked the first that passed the hard gates\n"
    );
    assert.equal(h.jev.calls.length, 0);
  } finally {
    await h.cleanup();
  }
});
