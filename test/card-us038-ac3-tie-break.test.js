// US-038 AC3 — ties are broken the same way on every run.
//
// Given two passing stories with the same total, when the stories are
// ranked, then the shorter one is picked, then the alphabetically first one,
// the same way on every run.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

// Every story below gets the mock Jev's default answers: every gate passes,
// every axis level 1 (score 2), so every total is 6 — a tie.
async function cardedStory(stories) {
  const h = await createHarness(germaneFixture(stories.map((sentence) => ({ sentence, pivots: ["main", "relevant"] }))));
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^note: pick-story: pick: total 6 \(anchor 2, meaning 2, vivid 2\)$/m);
    return /^story: (.*)$/m.exec(run.stdout)[1];
  } finally {
    await h.cleanup();
  }
}

test("US-038 AC3: on a tied total card.js cards the shorter story", async () => {
  assert.equal(await cardedStory(["The main clue stays relevant here.", "Main facts stay relevant."]), "Main facts stay relevant.");
});

test("US-038 AC3: on a tied total and length card.js cards the alphabetically first story, on every run", async () => {
  const stories = ["Main notes stay relevant.", "Main facts stay relevant."];
  assert.equal(stories[0].length, stories[1].length);
  assert.equal(await cardedStory(stories), "Main facts stay relevant.");
  assert.equal(await cardedStory(stories), "Main facts stay relevant.");
});
