// US-028 open question, as assumed in the story: a word that is logged in
// data/mnemonics/log.jsonl but not carded keeps its logged story (it was a
// human pick) — only the card is written; no stories are drafted.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("logged but not carded: card.js cards the logged story instead of drafting one", async () => {
  const logged = "Jermaine's main point stayed relevant.";
  const h = await createHarness(germaneFixture(), {
    log: [{ word: "germane", sentence: logged, pivot_words: ["Jermaine", "main", "relevant"] }],
  });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(h.readAnkiFile(), new RegExp(`^germane\t${logged.replace(/\./g, "\\.")}\t\tdʒɚ\\.ˈmeɪn\trelevant to the matter at hand$`, "m"));
    assert.ok(h.mock.calls.find((c) => c.action === "addNote").params.note.fields.Back.startsWith(logged));
    assert.deepEqual(h.claudeCalls().filter((c) => c.step === "compose-stories"), []);
    assert.match(run.stdout, /logged story/);
  } finally {
    await h.cleanup();
  }
});
