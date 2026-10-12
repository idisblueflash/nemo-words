// US-041 AC5 — "not logged" survives a stop at the sync.
//
// Given the card's row failed log validation, and the sync to Anki fails,
// when the run stops at the sync, then the stop message also says the card
// was not logged, and why.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("US-041 AC5: with the log row refused and Anki down, the sync stop message also says 'not logged' and why", async () => {
  // A candidate with no pivot words passes every hard gate and is picked, but
  // log-card refuses its row (`pivot_words: empty`).
  const h = await createHarness(germaneFixture([{ sentence: "The main point stays relevant to the talk.", pivots: [] }]), {
    anki: "down",
  });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^stopped at sync: sync failed: .*; not logged: pivot_words: empty\n$/);
    assert.deepEqual(h.readJsonl(h.mnemonicLog), []);
    assert.deepEqual(h.readJsonl(h.alternatesLog), []);
  } finally {
    await h.cleanup();
  }
});
