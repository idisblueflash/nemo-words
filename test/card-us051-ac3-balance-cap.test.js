// US-051 AC3 — a 3-card imbalance sends the word to the smaller arm, no chance draw.
//
// Given the experiment has 3 more control cards than story-arm cards (or the
// reverse), when Flash runs the one-word command on a new word, then the word
// goes to the arm with fewer cards, with no chance draw.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const CONTROL_DECK = "00 Reading Room::03 Control Definitions";
const controlRow = (w) => `${w}\tA definition of ${w}.\t\tx\tg\t${CONTROL_DECK}\tretention-control`;
const storyRow = (w) => `${w}\tA story for ${w}.\t\tx\tg\t\treading-room-terms retention-story`;

// No NEMO_ARM (arm: null): a real draw, so only the cap can decide the arm.
// Each case runs twice, so a chance draw would slip through only 1 time in 4.
for (const attempt of [1, 2]) {
  test(`US-051 AC3: 3 more control cards than story cards -> the story arm (run ${attempt})`, async () => {
    const h = await createHarness(germaneFixture(), {
      arm: null,
      rows: [controlRow("alpha"), controlRow("beta"), controlRow("gamma"), controlRow("delta"), storyRow("epsilon")],
    });
    try {
      const run = await h.runCard("germane");
      assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.match(run.stdout, /^story arm$/m);
      assert.equal(h.mock.calls.find((c) => c.action === "addNote").params.note.deckName, "00 Reading Room::Terms");
    } finally {
      await h.cleanup();
    }
  });

  test(`US-051 AC3: 3 more story cards than control cards -> the control arm (run ${attempt})`, async () => {
    const h = await createHarness(germaneFixture(), {
      arm: null,
      // a listed-but-uncarded control row (empty Back) doesn't count
      rows: [storyRow("alpha"), storyRow("beta"), storyRow("gamma"), `zeta\t\t\t\t\t${CONTROL_DECK}\tretention-control`],
    });
    try {
      const run = await h.runCard("germane");
      assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.match(run.stdout, /^control arm: definition-only card$/m);
      assert.equal(h.mock.calls.find((c) => c.action === "addNote").params.note.deckName, CONTROL_DECK);
    } finally {
      await h.cleanup();
    }
  });
}

test("US-051 AC3: draw-arm fails (exit 2) when the card file can't be read for counting, never falling back to a plain draw", async () => {
  const h = await createHarness(germaneFixture(), { arm: null });
  try {
    require("node:fs").rmSync(h.ankiFilePath);
    const r = await h.runScript("draw-arm.js", []);
    assert.equal(r.code, 2, r.stdout);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /^error: .*ENOENT/m);
  } finally {
    await h.cleanup();
  }
});
