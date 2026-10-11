// US-028 AC1 edge case (bug-008) — no word, or an empty one, stops at
// `normalize`; the literal string "undefined" must never go down the pipeline.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

for (const [label, args] of [["no argument", []], ["an empty string", [""]], ["whitespace", ["  "]]]) {
  test(`AC1 edge: card.js with ${label} stops at normalize and runs nothing after`, async () => {
    const h = await createHarness(germaneFixture());
    const before = h.readAnkiFile();
    try {
      const run = await h.runScript("card.js", args);
      assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.match(run.stdout, /^stopped at normalize: empty input: give one word/);
      assert.doesNotMatch(run.stdout + run.stderr, /undefined/);
      assert.equal(h.readAnkiFile(), before);
      assert.deepEqual(h.mock.calls.filter((c) => ["addNote", "updateNoteFields"].includes(c.action)), []);
      assert.deepEqual(h.claudeCalls(), []);
    } finally {
      await h.cleanup();
    }
  });
}
