// US-028 AC3 — a word that already has a card with a story is left alone.
//
// Given a word that already has a card with a story, when Flash runs the
// one-word command with that word, then the existing card is left unchanged,
// and the command reports that the word is already carded and shows its
// current story.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("AC3: card.js leaves an already-carded word unchanged and shows its story", async () => {
  const existing = "germane\tJermaine's main point stayed relevant all night.\t\tdʒɚ.ˈmeɪn\trelevant to the point";
  const h = await createHarness(germaneFixture(), { rows: ["cracks\tOld tracks.\t\t\tthin lines", existing] });
  const before = h.readAnkiFile();
  try {
    // Front match is case-insensitive.
    const run = await h.runCard("Germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /already carded/);
    assert.match(run.stdout, /Jermaine's main point stayed relevant all night\./);

    assert.equal(h.readAnkiFile(), before);
    assert.deepEqual(
      h.mock.calls.filter((c) => ["addNote", "updateNoteFields"].includes(c.action)),
      []
    );
    assert.deepEqual(h.claudeCalls(), []);
  } finally {
    await h.cleanup();
  }
});
