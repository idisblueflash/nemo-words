// US-039 AC3 — a failed Anki sync doesn't lose the log.
//
// Given the sync to Anki failed, when the run finishes, then the log row and
// the runner-ups are still recorded.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("US-039 AC3: with Anki down, card.js still logs the row and the runner-ups", async () => {
  const h = await createHarness(germaneFixture(), { anki: "down" });
  try {
    const run = await h.runCard("germane");
    // US-028's contract for this run is unchanged: it stops at sync, with the re-run hint.
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^stopped at sync: sync failed: /);

    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 1);
    assert.equal(log[0].word, "germane");
    assert.equal(log[0].sentence, "The main point stays relevant to the talk.");
    assert.equal(log[0].picked_by, "auto");

    const alternates = h.readJsonl(h.alternatesLog);
    assert.equal(alternates.length, 1);
    assert.equal(alternates[0].word, "germane");
    assert.equal(alternates[0].chosen, "The main point stays relevant to the talk.");
    assert.equal(alternates[0].alternates.length, 4); // germaneFixture drafts 5 candidates
  } finally {
    await h.cleanup();
  }
});
