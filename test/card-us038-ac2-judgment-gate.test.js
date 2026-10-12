// US-038 AC2 — a judgment-gate fail is never picked while another story
// passes every gate.
//
// Given a story that passes the hard gates but fails a judgment gate
// (vividness, scene coherence or animal harm), when the stories are ranked,
// then it is never picked while any story passes every gate, whatever its
// total, and it is logged as a runner-up with the failed gate and question as
// its reject reason.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const PASSES_ALL = "The main point stays relevant to the talk.";
const FLAT = "Main facts stay relevant.";
const HARMFUL = "The main clue stays relevant here.";
const HARD_FAIL = "The main road is long.";

test("US-038 AC2: card.js cards the story that passed every gate over higher totals, and logs the others' failed gate and question", async () => {
  const fixture = germaneFixture([
    { sentence: FLAT, pivots: ["main", "relevant"] },
    { sentence: HARMFUL, pivots: ["main", "relevant"] },
    { sentence: PASSES_ALL, pivots: ["main", "relevant"] },
    { sentence: HARD_FAIL, pivots: ["main"] },
  ]);
  fixture.judge = {
    // total 9, but one split-out vividness question fails
    [FLAT]: { anchor: 2, meaning: 2, vivid: 2, "vividness.single-picture": 0.3 },
    // total 9, but the animal-harm summary fails (and a split-out too: the summary is named)
    [HARMFUL]: { anchor: 2, meaning: 2, vivid: 2, "animal-harm": 0.2, "animal-harm.not-eaten": 0.1 },
    // total 4, passes every gate
    [PASSES_ALL]: { anchor: 0, meaning: 0, vivid: 1 },
  };
  const h = await createHarness(fixture);
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, new RegExp(`^story: ${PASSES_ALL}$`, "m"));
    assert.match(run.stdout, /^note: pick-story: pick: total 4 \(anchor 1, meaning 1, vivid 2\)$/m);

    const [entry] = h.readJsonl(h.alternatesLog);
    assert.equal(entry.chosen, PASSES_ALL);
    assert.deepEqual(entry.alternates, [
      { sentence: FLAT, pivot_words: ["main", "relevant"], reject_reasons: ["vividness: single-picture"] },
      { sentence: HARMFUL, pivot_words: ["main", "relevant"], reject_reasons: ["animal-harm: summary"] },
      { sentence: HARD_FAIL, pivot_words: ["main"], reject_reasons: ["sense-missing: relevant"] },
    ]);
  } finally {
    await h.cleanup();
  }
});
