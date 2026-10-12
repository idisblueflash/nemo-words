// US-040 AC3 — clear classifier verdicts route as before, with no judgment call.
//
// Given a word the classifier calls medical, or finds no word-part match for,
// when Flash runs the one-word command with that word, then it is routed the
// same way as before, with no judgment call.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

// Jev calls that asked the routing question (tag-technique's calls don't).
const routeCalls = (h) => h.jev.calls.filter((c) => "word_part" in (c.body.questions || {}));

test("US-040 AC3: a no-match word (germane) is carded as before, with no judgment call", async () => {
  const h = await createHarness({ ...germaneFixture(), jev: { ...germaneFixture().jev, word_part: 0.95 } });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^carded germane \(added\)$/m);
    assert.doesNotMatch(run.stdout, /judgment call/);
    assert.deepEqual(routeCalls(h), []);
  } finally {
    await h.cleanup();
  }
});

test("US-040 AC3: a medical-verdict word (nephrectomy) stops on the word-part path as before, with no judgment call", async () => {
  const h = await createHarness({ ...germaneFixture(), jev: { word_part: 0.05 } });
  const before = h.readAnkiFile();
  try {
    const run = await h.runCard("nephrectomy");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(
      run.stdout,
      "stopped at route: word-part: nephrectomy belongs to the word-part path (_etta_mology), not a story card\n"
    );
    assert.equal(h.readAnkiFile(), before);
    assert.deepEqual(h.jev.calls, []);
  } finally {
    await h.cleanup();
  }
});
