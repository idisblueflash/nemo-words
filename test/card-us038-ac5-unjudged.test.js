// US-038 AC5 — Jev unavailable: fall back to the first passing story.
//
// Given the judgment service is unavailable while the stories are judged,
// when Flash runs the one-word command, then the card gets the first story
// that passed the hard gates, as before this story, and the run report says
// the pick was not judged and why.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const FIRST_PASSING = "The main point stays relevant to the talk.";
// Shorter, so a judged pick on a tie would take it: the fallback must not.
const STORIES = [
  { sentence: "The main road is long.", pivots: ["main"] }, // hard-gate fail
  { sentence: FIRST_PASSING, pivots: ["main", "relevant"] },
  { sentence: "Main facts stay relevant.", pivots: ["main", "relevant"] },
];

const CASES = [
  { name: "down", options: { jev: "down" }, why: /Jev could not be reached: / },
  { name: "unconfigured", options: { jev: "unconfigured" }, why: /Jev is not configured: no TYPESAFE_API_KEY/ },
  {
    name: "answering unusably",
    options: {},
    judge: { [FIRST_PASSING]: { anchor: 7 } },
    why: /unusable Jev answer for anchor: /,
  },
];

for (const c of CASES) {
  test(`US-038 AC5: with Jev ${c.name}, card.js cards the first story that passed the hard gates and the report says it wasn't judged`, async () => {
    const fixture = germaneFixture(STORIES);
    if (c.judge) fixture.judge = c.judge;
    const h = await createHarness(fixture, c.options);
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
      assert.doesNotMatch(run.stdout + run.stderr, /test-key/);

      // Runner-ups fall back to the hard-gate reasons from the checks file.
      const [entry] = h.readJsonl(h.alternatesLog);
      assert.deepEqual(
        entry.alternates.map((a) => a.reject_reasons),
        [["sense-missing: relevant"], []]
      );
    } finally {
      await h.cleanup();
    }
  });
}
