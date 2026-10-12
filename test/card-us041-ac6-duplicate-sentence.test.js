// US-041 AC6 — a candidate repeating the picked sentence is not a runner-up.
//
// Given a drafted candidate with the same sentence as the picked story but
// different pivot words, when the card is logged, then that candidate is not
// among the runner-ups, and every candidate with a different sentence still is.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");
const { runnerUps } = require("../scripts/log-card");

const picked = "The main point stays relevant to the talk.";
const stories = [
  { sentence: picked, pivots: ["main", "relevant"] }, // the auto-pick
  { sentence: picked, pivots: ["main", "point", "talk"] }, // same sentence, other pivots
  { sentence: "Main facts stay relevant.", pivots: ["main", "relevant"] },
  { sentence: "The main road is long.", pivots: ["main"] },
];

test("US-041 AC6: card.js leaves a same-sentence, different-pivots candidate out of the runner-ups and keeps every other sentence", async () => {
  const fixture = germaneFixture(stories);
  // US-038 picks by rubric total (ties -> the shorter story), so the pick's
  // Jev scores are set higher than the other passing stories' defaults (6).
  fixture.judge = { [picked]: { anchor: 2, meaning: 2, vivid: 2 } };
  const h = await createHarness(fixture);
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    const [entry] = h.readJsonl(h.alternatesLog);
    assert.equal(entry.chosen, picked);
    assert.deepEqual(
      entry.alternates.map((a) => a.sentence),
      ["Main facts stay relevant.", "The main road is long."]
    );
  } finally {
    await h.cleanup();
  }
});

test("US-041 AC6: runnerUps compares sentences only (exact string); pivot words don't count", () => {
  const candidates = stories.map((s) => `${s.sentence}\t${s.pivots.join(",")}`).join("\n");
  const checks = ["-", "-", "-", "sense-missing: relevant"].join("\n");
  assert.deepEqual(runnerUps(candidates, checks, picked), [
    { sentence: "Main facts stay relevant.", pivot_words: ["main", "relevant"], reject_reasons: [] },
    { sentence: "The main road is long.", pivot_words: ["main"], reject_reasons: ["sense-missing: relevant"] },
  ]);
  // exact compare: a sentence differing only in case or punctuation is a runner-up
  const near = runnerUps(`${picked.toLowerCase()}\tmain`, "-", picked);
  assert.equal(near.length, 1);
});
