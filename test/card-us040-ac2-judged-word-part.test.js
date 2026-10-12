// US-040 AC2 — an ambiguous word built from classical morphemes goes to the word-part path.
//
// Given a word the classifier calls ambiguous, which is in fact built from
// classical morphemes, when Flash runs the one-word command with that word,
// then no card is made, and the command says the word belongs to the
// word-part path (_etta_mology), and that this was a judgment call.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, waryFixture } = require("./helpers/card-harness");

test("US-040 AC2: card.js makes no card for an ambiguous word Jev judges word-part, and says it was a judgment call", async () => {
  const h = await createHarness(waryFixture({ word_part: 0.84 }));
  const before = h.readAnkiFile();
  try {
    const run = await h.runCard("sanguinary"); // sanguin- + a weak -ary match only -> `ambiguous`
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(
      run.stdout,
      "stopped at judge-route: word-part: sanguinary belongs to the word-part path (_etta_mology) — judgment call, p 0.84\n"
    );
    assert.equal(h.readAnkiFile(), before);
    assert.deepEqual(h.mock.calls, []);
    assert.deepEqual(h.claudeCalls(), []);
    assert.deepEqual(h.readJsonl(h.mnemonicLog), []);
  } finally {
    await h.cleanup();
  }
});
