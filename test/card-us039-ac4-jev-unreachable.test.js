// US-039 AC4 — Jev unreachable: log without technique tags, and say so.
//
// Given Jev can't be reached while choosing technique tags, when the card is
// logged, then the row is written with no technique tags, and the run report
// says the tags are missing.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

// "down": nothing listens at Jev's URL; "unconfigured": no API key at all —
// both count as Jev being unreachable.
for (const jev of ["down", "unconfigured"]) {
  test(`US-039 AC4: with Jev ${jev}, card.js logs the row with technique [] and the report says the tags are missing`, async () => {
    const h = await createHarness(germaneFixture(), { jev });
    try {
      const run = await h.runCard("germane");
      assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

      // The card itself is unaffected.
      assert.match(run.stdout, /^carded germane \(added\)$/m);
      assert.equal(h.mock.calls.filter((c) => c.action === "addNote").length, 1);

      const log = h.readJsonl(h.mnemonicLog);
      assert.equal(log.length, 1);
      assert.equal(log[0].sentence, "The main point stays relevant to the talk.");
      assert.deepEqual(log[0].technique, []);
      assert.equal(log[0].picked_by, "auto");
      assert.equal(h.readJsonl(h.alternatesLog).length, 1, "the runner-ups are still recorded");

      assert.match(run.stdout, /^note: log-card: technique tags missing: Jev could not tag this story; logged with technique \[\]$/m);
      assert.doesNotMatch(run.stdout + run.stderr, /test-key/);
    } finally {
      await h.cleanup();
    }
  });
}
