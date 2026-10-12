// US-048 AC3 — with a fine rubric, a Jev failure keeps its own note.
//
// Given the rubric file is fine but Jev is unavailable, when Flash runs the
// one-word command, then the "not judged" note gives Jev's cause, not the
// rubric file, as before this story.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const FIRST_PASSING = "The main point stays relevant to the talk.";
const STORIES = [
  { sentence: "The main road is long.", pivots: ["main"] }, // hard-gate fail
  { sentence: FIRST_PASSING, pivots: ["main", "relevant"] },
  { sentence: "Main facts stay relevant.", pivots: ["main", "relevant"] },
];

const CASES = [
  { name: "down", options: { jev: "down" }, why: /^stories not judged: Jev could not be reached: / },
  { name: "unconfigured", options: { jev: "unconfigured" }, why: /^stories not judged: Jev is not configured: no TYPESAFE_API_KEY/ },
];

for (const c of CASES) {
  test(`US-048 AC3: with a fine rubric and Jev ${c.name}, the note gives Jev's cause and doesn't name the rubric file`, async () => {
    const h = await createHarness(germaneFixture(STORIES), c.options);
    try {
      const run = await h.runCard("germane");
      assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.match(run.stdout, new RegExp(`^story: ${FIRST_PASSING}$`, "m"));

      const note = run.stdout.split("\n").find((l) => l.startsWith("note: judge-stories: "));
      assert.ok(note, `no judge-stories note in:\n${run.stdout}`);
      const body = note.slice("note: judge-stories: ".length);
      assert.match(body, c.why);
      assert.match(body, /; picked the first that passed the hard gates$/);
      assert.doesNotMatch(body, /story-rubric|can't read/);
    } finally {
      await h.cleanup();
    }
  });
}
