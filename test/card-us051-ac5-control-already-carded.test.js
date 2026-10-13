// US-051 AC5 — a control card is "already carded" like any other card.
//
// Given a word already carded as a control card, when Flash runs the one-word
// command on it again, then the command stops with "already carded", showing
// the control card's back; and the word is not moved to the story arm.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const CONTROL_ROW =
  "germane\trelevant and fitting to the subject under discussion\t\tdʒɚ.ˈmeɪn\trelevant to the matter at hand" +
  "\t00 Reading Room::03 Control Definitions\tretention-control";

test("US-051 AC5: re-running a control-carded word stops with 'already carded' and its back; the row stays a control card", async () => {
  // Forced into the story arm: a word that got past route would be moved there.
  const h = await createHarness(germaneFixture(), { arm: "story", rows: [CONTROL_ROW] });
  try {
    const before = h.readAnkiFile();
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(
      run.stdout,
      "stopped at route: already carded: germane — current story: relevant and fitting to the subject under discussion\n"
    );
    assert.equal(h.readAnkiFile(), before);
    assert.deepEqual(h.mock.calls, []);
    assert.deepEqual(h.claudeCalls(), []);
  } finally {
    await h.cleanup();
  }
});
