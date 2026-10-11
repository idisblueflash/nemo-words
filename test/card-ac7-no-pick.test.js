// US-028 AC7 — nothing passes the hard gates: stop, no redraft, say why.
//
// Given no candidate story passes the hard gates, when the command tries to
// pick one, then no card is made and no redraft is attempted, and the command
// reports why each candidate was rejected.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("AC7: card.js stops with every candidate's rejection reasons and makes no card", async () => {
  const stories = [
    { sentence: "Germanes stay relevant at the main meeting.", pivots: ["main", "relevant"] },
    { sentence: "The main point stays relevant to the whole long winding meeting tonight.", pivots: ["main", "relevant"] },
    { sentence: "The main road runs past the old town.", pivots: ["main"] },
    { sentence: "A mane of hair is relevant.", pivots: ["mane", "relevant"] },
    { sentence: "The germane main course is relevant.", pivots: ["main", "relevant"] },
  ];
  const h = await createHarness(germaneFixture(stories));
  const before = h.readAnkiFile();
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

    // No card.
    assert.equal(h.readAnkiFile(), before);
    assert.deepEqual(h.mock.calls, []);

    // No redraft: the story model ran exactly once.
    assert.equal(h.claudeCalls().filter((c) => c.step === "compose-stories").length, 1);

    // Every candidate, with why it was rejected.
    assert.match(run.stdout, /stopped at pick-story/);
    const expected = [
      ["Germanes stay relevant at the main meeting.", "headword: germanes"],
      ["The main point stays relevant to the whole long winding meeting tonight.", "word-count: 12 > 10"],
      ["The main road runs past the old town.", "sense-missing: relevant"],
      ["A mane of hair is relevant.", "anchor-missing: main"],
      ["The germane main course is relevant.", "headword: germane"],
    ];
    for (const [sentence, reason] of expected) {
      assert.ok(run.stdout.includes(`${sentence}\t${reason}`), `missing "${sentence}" -> ${reason} in:\n${run.stdout}`);
    }
  } finally {
    await h.cleanup();
  }
});
