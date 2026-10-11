// US-028 AC5 — a classical-morpheme / INN-stem word goes to the word-part path.
//
// Given a word built from classical Greek/Latin morphemes or an INN drug stem,
// when Flash runs the one-word command with that word, then no card is made,
// and the command says the word belongs to the word-part path (_etta_mology).

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

for (const word of ["nephrectomy", "atorvastatin"]) {
  test(`AC5: card.js makes no card for "${word}" and names the _etta_mology path`, async () => {
    const h = await createHarness(germaneFixture());
    const before = h.readAnkiFile();
    try {
      const run = await h.runCard(word);
      assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.match(run.stdout, /word-part path \(_etta_mology\)/);
      assert.equal(h.readAnkiFile(), before);
      assert.deepEqual(h.mock.calls.filter((c) => c.action === "addNote"), []);
      assert.deepEqual(h.claudeCalls(), []);
    } finally {
      await h.cleanup();
    }
  });
}
