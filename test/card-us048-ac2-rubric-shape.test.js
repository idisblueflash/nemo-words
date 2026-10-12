// US-048 AC2 — a rubric with a missing piece is named in the report.
//
// Given scripts/story-rubric.json is valid JSON but a gate has no summary
// question or an axis lacks 3 levels, when Flash runs the one-word command,
// then the card still gets the first story that passed the hard gates, and
// the note names the rubric file and the missing piece. Jev is never asked
// to judge.

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

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "card-us048-ac2-"));
test.after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

const CASES = [
  {
    name: "a gate has no summary question",
    breakRubric: (r) => delete r.gates["animal-harm"].summary,
    piece: "gate animal-harm has no summary question",
  },
  {
    name: "an axis has only 2 levels",
    breakRubric: (r) => r.axes.vivid.levels.pop(),
    piece: "axis vivid has 2 levels, needs 3",
  },
];

for (const [i, c] of CASES.entries()) {
  test(`US-048 AC2: when ${c.name}, card.js cards the first passing story and the note names the rubric file and the missing piece`, async () => {
    const clone = clonePipeline(path.join(tmpRoot, String(i)));
    const file = path.join(clone, "scripts", "story-rubric.json");
    const rubric = JSON.parse(fs.readFileSync(file, "utf8"));
    c.breakRubric(rubric);
    fs.writeFileSync(file, JSON.stringify(rubric, null, 2));
    const h = await createHarness(germaneFixture(STORIES), { root: clone });
    try {
      const run = await h.runCard("germane");
      assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.match(run.stdout, new RegExp(`^story: ${FIRST_PASSING}$`, "m"));
      assert.match(h.readAnkiFile(), new RegExp(`^germane\\t${FIRST_PASSING}\\t`, "m"));

      const note = run.stdout.split("\n").find((l) => l.startsWith("note: judge-stories: "));
      assert.ok(note, `no judge-stories note in:\n${run.stdout}`);
      assert.equal(
        note,
        `note: judge-stories: stories not judged: can't read scripts/story-rubric.json (${c.piece}); picked the first that passed the hard gates`
      );
      assert.doesNotMatch(run.stdout, /pick: total/);
      assert.equal(h.jev.judgeCalls().length, 0, "Jev must not be asked to judge");
    } finally {
      await h.cleanup();
    }
  });
}
