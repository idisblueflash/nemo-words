// US-040 AC5 — the judgment service is unavailable.
//
// Given the judgment service is unavailable, when Flash runs the one-word
// command with an ambiguous word, then no card is made and nothing is
// written, and the command says routing failed because the judgment service
// was down, and that it can be re-run.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, waryFixture } = require("./helpers/card-harness");

// "down": nothing listens at Jev's URL; "unconfigured": no API key at all.
for (const jev of ["down", "unconfigured"]) {
  test(`US-040 AC5: with Jev ${jev}, card.js fails the run at judge-route, writes nothing, and says it can be re-run`, async () => {
    const h = await createHarness(waryFixture({ word_part: 0.1 }), { jev });
    const before = h.readAnkiFile();
    try {
      const run = await h.runCard("wary");
      assert.equal(run.code, 2, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.equal(run.stdout, "");
      assert.match(run.stderr, /failed at judge-route:\nrouting failed: judgment service unavailable \(.+\); re-run later\n/);
      assert.doesNotMatch(run.stderr, /test-key/);

      // Nothing is written anywhere.
      assert.equal(h.readAnkiFile(), before);
      assert.deepEqual(h.mock.calls, []);
      assert.deepEqual(h.claudeCalls(), []);
      assert.deepEqual(h.readJsonl(h.mnemonicLog), []);
      assert.deepEqual(h.readJsonl(h.alternatesLog), []);
    } finally {
      await h.cleanup();
    }
  });
}
