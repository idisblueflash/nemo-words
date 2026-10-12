// US-048 AC1 — a malformed or missing story rubric is named in the report.
//
// Given scripts/story-rubric.json is malformed or missing, when Flash runs
// the one-word command, then the card still gets the first story that passed
// the hard gates, and the run report's "not judged" note names
// scripts/story-rubric.json and gives the reason. Jev is never asked to judge.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHarness, clonePipeline, germaneFixture } = require("./helpers/card-harness");

const FIRST_PASSING = "The main point stays relevant to the talk.";
const STORIES = [
  { sentence: "The main road is long.", pivots: ["main"] }, // hard-gate fail
  { sentence: FIRST_PASSING, pivots: ["main", "relevant"] },
  { sentence: "Main facts stay relevant.", pivots: ["main", "relevant"] }, // shorter: a judged tie would take it
];

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "card-us048-ac1-"));
test.after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

const CASES = [
  {
    name: "malformed",
    breakRubric: (file) => fs.writeFileSync(file, "{ not json"),
    why: /can't read scripts\/story-rubric\.json \(.*JSON.*\);/,
  },
  {
    name: "empty",
    breakRubric: (file) => fs.writeFileSync(file, ""),
    why: /can't read scripts\/story-rubric\.json \(.*JSON.*\);/,
  },
  {
    name: "missing",
    breakRubric: (file) => fs.rmSync(file),
    why: /can't read scripts\/story-rubric\.json \(not found\);/,
  },
];

test("US-048 edge: a broken rubric when every story fails a hard gate stops with the same no-pick as a fine one", async () => {
  const stories = [
    { sentence: "The main road is long.", pivots: ["main"] },
    { sentence: "The germane point stays relevant.", pivots: ["main", "relevant"] },
  ];
  const runWith = async (root) => {
    const h = await createHarness(germaneFixture(stories), root ? { root } : {});
    try {
      const run = await h.runCard("germane");
      return { run, jevCalls: h.jev.calls.length, ankiCalls: h.mock.calls.length };
    } finally {
      await h.cleanup();
    }
  };
  const clone = clonePipeline(path.join(tmpRoot, "no-pick"));
  fs.writeFileSync(path.join(clone, "scripts", "story-rubric.json"), "{ not json");
  const fine = await runWith(null);
  const broken = await runWith(clone);
  assert.equal(broken.run.code, 1, `stdout:\n${broken.run.stdout}\nstderr:\n${broken.run.stderr}`);
  assert.match(broken.run.stdout, /^stopped at pick-story: no-pick: none of 2 candidates passed every gate; /);
  assert.equal(broken.run.stdout, fine.run.stdout);
  assert.equal(broken.jevCalls, 0);
  assert.equal(broken.ankiCalls, 0);
});

for (const c of CASES) {
  test(`US-048 AC1: with story-rubric.json ${c.name}, card.js cards the first passing story and the note names the rubric file`, async () => {
    const clone = clonePipeline(path.join(tmpRoot, c.name));
    c.breakRubric(path.join(clone, "scripts", "story-rubric.json"));
    const h = await createHarness(germaneFixture(STORIES), { root: clone });
    try {
      const run = await h.runCard("germane");
      assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.match(run.stdout, new RegExp(`^story: ${FIRST_PASSING}$`, "m"));
      assert.match(h.readAnkiFile(), new RegExp(`^germane\\t${FIRST_PASSING}\\t`, "m"));

      const note = run.stdout.split("\n").find((l) => l.startsWith("note: judge-stories: "));
      assert.ok(note, `no judge-stories note in:\n${run.stdout}`);
      assert.match(note, /^note: judge-stories: stories not judged: .+; picked the first that passed the hard gates$/);
      assert.match(note, c.why);
      assert.doesNotMatch(run.stdout, /pick: total/);
      assert.equal(h.jev.judgeCalls().length, 0, "Jev must not be asked to judge");
    } finally {
      await h.cleanup();
    }
  });
}
