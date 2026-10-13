// US-050 AC7 — no word for the closed chunk either: still a no-anchor stop.
//
// Given a word with no exact keyword on any chunk, no rhyme for the stressed
// chunk, and no common word for the longer chunk (durable /ˈdʊ.ɹə.bəl/:
// /dʊɹ/), when Flash runs the one-word command, then it stops with "no sound
// anchor found", as before this story; and no card is made and no log row is
// written.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, TERMS_HEADER } = require("./helpers/card-harness");
const { claudeFor } = require("./helpers/us050-fixtures");

// "dur" sounds exactly /dʊɹ/ but is too rare; nothing rhymes with /dʊ/.
function durableFixture() {
  return {
    dict: { durable: "dˈʊɹəbəl", dur: "dˈʊɹ" },
    freqs: { durable: 9e-6, dur: 1e-8 },
    claude: claudeFor("lasting", "Should never be drafted.", ["never"]),
  };
}

test("US-050 AC7: card.js still stops with 'no sound anchor found' for durable; no card, no log row", async () => {
  const h = await createHarness(durableFixture());
  try {
    const run = await h.runCard("durable");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    // the lines are the open chunks, as before this story
    assert.equal(run.stdout, "stopped at find-keywords: no sound anchor found; dʊ\t-; ɹə\t-; bəl\t-\n");
    assert.deepEqual(h.claudeCalls().filter((x) => x.step === "compose-stories"), []);
    assert.equal(h.readAnkiFile(), TERMS_HEADER.join("\n") + "\n");
    assert.deepEqual(h.mock.notes, []);
    assert.deepEqual(h.readJsonl(h.mnemonicLog), []);
  } finally {
    await h.cleanup();
  }
});
