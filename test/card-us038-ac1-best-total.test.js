// US-038 AC1 — Jev picks the passing story with the best rubric total.
//
// Given a word whose drafted stories include several that pass the hard
// gates, when Flash runs the one-word command with that word, then the card
// gets the passing story with the highest rubric total (anchor fidelity +
// meaning-carry + vividness, out of 9), and the run report shows the picked
// story's total and its three axis scores.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const FIRST = "The main point stays relevant to the talk.";
const MIDDLE = "Main facts stay relevant.";
const BEST = "The main clue stays relevant here.";
const HARD_FAIL = "The germane point stays relevant.";

test("US-038 AC1: card.js cards the passing story with the highest rubric total and reports its scores", async () => {
  const fixture = germaneFixture([
    { sentence: HARD_FAIL, pivots: ["main", "relevant"] }, // headword: never judged
    { sentence: FIRST, pivots: ["main", "relevant"] }, // first to pass the hard gates, total 6
    { sentence: MIDDLE, pivots: ["main", "relevant"] }, // total 7
    { sentence: BEST, pivots: ["main", "relevant"] }, // total 8 -> the pick
  ]);
  // Jev's levels are 0–2; an axis score is level + 1.
  fixture.judge = {
    [FIRST]: { anchor: 1, meaning: 1, vivid: 1 },
    [MIDDLE]: { anchor: 1, meaning: 2, vivid: 1 },
    [BEST]: { anchor: 2, meaning: 1, vivid: 2 },
    [HARD_FAIL]: { anchor: 2, meaning: 2, vivid: 2 },
  };
  const h = await createHarness(fixture);
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

    assert.match(run.stdout, new RegExp(`^story: ${BEST}$`, "m"));
    assert.match(h.readAnkiFile(), new RegExp(`^germane\\t${BEST}\\t`, "m"));
    const added = h.mock.calls.find((c) => c.action === "addNote");
    assert.match(added.params.note.fields.Back, new RegExp(BEST));

    assert.match(run.stdout, /^note: pick-story: pick: total 8 \(anchor 3, meaning 2, vivid 3\)$/m);

    // One Jev call per story that passed the hard gates, 14 questions each.
    const judged = h.jev.judgeCalls();
    assert.deepEqual(judged.map((c) => c.body.state.sentence).sort(), [BEST, FIRST, MIDDLE].sort());
    for (const c of judged) assert.equal(Object.keys(c.body.questions).length, 14);
  } finally {
    await h.cleanup();
  }
});
