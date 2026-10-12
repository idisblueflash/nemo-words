// US-038 AC6 — a logged story is carded as is; nothing is judged.
//
// Given a word with a logged story, when Flash runs the one-word command,
// then the logged story is carded and no story is judged.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const LOGGED = "Jermaine's main point stayed relevant.";

test("US-038 AC6: card.js cards the logged story, never calls Jev and skips judge-stories", async () => {
  const fixture = germaneFixture();
  // Were the drafts judged, this one would win: it must not matter.
  fixture.judge = { "The main point stays relevant to the talk.": { anchor: 2, meaning: 2, vivid: 2 } };
  const h = await createHarness(fixture, { log: [{ word: "germane", sentence: LOGGED, pivot_words: ["Jermaine", "main", "relevant"] }] });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, new RegExp(`^story: ${LOGGED}  \\(logged story, kept as picked\\)$`, "m"));
    assert.match(h.readAnkiFile(), new RegExp(`^germane\\t${LOGGED}\\t`, "m"));

    assert.deepEqual(h.jev.calls, [], "no story is judged (and nothing else asks Jev)");
    assert.doesNotMatch(run.stdout, /judge-stories|pick: total/);
    assert.equal(h.claudeCalls().filter((c) => c.step === "compose-stories").length, 0);
  } finally {
    await h.cleanup();
  }
});
