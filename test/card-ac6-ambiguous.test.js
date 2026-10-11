// US-028 AC6 — a word the classifier can't place is not routed automatically.
//
// Given a word the classifier can't place (an ambiguous verdict), when Flash
// runs the one-word command with that word, then no card is made, and the
// command says the word couldn't be routed automatically.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("AC6: card.js makes no card for an ambiguous-verdict word and says it couldn't route it", async () => {
  const h = await createHarness(germaneFixture());
  const before = h.readAnkiFile();
  try {
    const run = await h.runCard("famous"); // only a weak -ous suffix match -> `ambiguous`
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /couldn't be routed automatically/);
    assert.equal(h.readAnkiFile(), before);
    assert.deepEqual(h.mock.calls.filter((c) => c.action === "addNote"), []);
    assert.deepEqual(h.claudeCalls(), []);
  } finally {
    await h.cleanup();
  }
});
