// US-051 AC6 — a story-arm word with no pick drops out of the experiment.
//
// Given the draw put a word in the story arm, but every drafted story failed a
// gate, when the run stops with no-pick, then no card is made, and the word
// doesn't count toward either arm.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");
const { countArms } = require("../scripts/draw-arm");

test("US-051 AC6: a story-arm no-pick makes no card, writes no arm-tagged row, and leaves the arm counts as they were", async () => {
  const stories = [
    { sentence: "Germanes stay relevant at the main meeting.", pivots: ["main", "relevant"] },
    { sentence: "The main road runs past the old town.", pivots: ["main"] },
  ];
  const h = await createHarness(germaneFixture(stories), { arm: "story" });
  try {
    const before = h.readAnkiFile();
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^stopped at pick-story: no-pick/);

    // drafted (it was in the story arm), but no card
    assert.equal(h.claudeCalls().filter((c) => c.step === "compose-stories").length, 1);
    assert.equal(h.readAnkiFile(), before);
    assert.deepEqual(h.mock.calls, []);
    assert.deepEqual(h.readJsonl(h.mnemonicLog), []);

    // it doesn't count toward either arm
    assert.deepEqual(countArms(h.readAnkiFile()), { control: 0, story: 0 });
  } finally {
    await h.cleanup();
  }
});
