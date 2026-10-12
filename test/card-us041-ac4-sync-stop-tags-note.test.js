// US-041 AC4 — the missing-tags note survives a stop at the sync.
//
// Given Jev can't be reached while choosing technique tags, and the sync to
// Anki fails, when the run stops at the sync, then the stop message gives the
// sync failure, and it also says the row was logged with no technique tags.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("US-041 AC4: with Jev and Anki both down, the sync stop message also says the row was logged with technique []", async () => {
  const h = await createHarness(germaneFixture(), { jev: "down", anki: "down" });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    // sync's own reason first, then log-card's note
    assert.match(
      run.stdout,
      /^stopped at sync: sync failed: .*; technique tags missing: Jev could not tag this story; logged with technique \[\]\n$/
    );
    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 1);
    assert.deepEqual(log[0].technique, []);
  } finally {
    await h.cleanup();
  }
});

test("US-041 AC4 edge: a sync stop with nothing to note from log-card keeps its message unchanged", async () => {
  const h = await createHarness(germaneFixture(), { anki: "down" });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^stopped at sync: sync failed: /);
    assert.doesNotMatch(run.stdout, /technique tags missing|not logged/);
  } finally {
    await h.cleanup();
  }
});

test("US-041 AC4 edge: a sync stop on the logged-story path (log-card skipped) is not a crash", async () => {
  const logged = "Jermaine's main point stayed relevant.";
  const h = await createHarness(germaneFixture(), {
    anki: "down",
    log: [{ word: "germane", sentence: logged, pivot_words: ["Jermaine", "main", "relevant"] }],
  });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^stopped at sync: sync failed: /);
    assert.doesNotMatch(run.stdout, /technique tags missing|not logged/);
  } finally {
    await h.cleanup();
  }
});
