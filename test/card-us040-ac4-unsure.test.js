// US-040 AC4 — a judgment call too unsure to route stops the run.
//
// Given the judgment call is too unsure to route an ambiguous word, when Flash
// runs the one-word command with that word, then no card is made, and the
// command says the word couldn't be routed automatically and shows the
// confidence. (This replaces US-028 AC6's test, card-ac6-ambiguous.test.js:
// an ambiguous verdict alone no longer stops the run.)

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, waryFixture } = require("./helpers/card-harness");

for (const p of [0.55, 0.31, 0.69]) {
  test(`US-040 AC4: card.js makes no card when Jev's p word-part is ${p}, and shows the confidence`, async () => {
    const h = await createHarness(waryFixture({ word_part: p }));
    const before = h.readAnkiFile();
    try {
      const run = await h.runCard("wary");
      assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.equal(
        run.stdout,
        `stopped at judge-route: ambiguous: wary couldn't be routed automatically — judgment call unsure, p ${p}\n`
      );
      assert.equal(h.readAnkiFile(), before);
      assert.deepEqual(h.mock.calls, []);
      assert.deepEqual(h.claudeCalls(), []);
    } finally {
      await h.cleanup();
    }
  });
}
