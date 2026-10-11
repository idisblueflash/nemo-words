// US-039 AC1 — the auto-made card is logged.
//
// Given the one-word command has just written a new card's row, when the run
// finishes, then the mnemonic log gains one row for the word with its story,
// sense, syllables, anchor unit, keyword and pivot words; the row says the
// story was auto-picked, not chosen by Flash; and its technique tags are one
// or two values from _logan's controlled list.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture, today } = require("./helpers/card-harness");

test("US-039 AC1: card.js logs the new card's auto-picked story as one validated log row", async () => {
  const earlier = { word: "trial", sentence: "The court tried a dull case.", pivot_words: ["tried"] };
  const h = await createHarness(germaneFixture(), { log: [earlier] });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 2, "the log gains exactly one row");
    assert.deepEqual(log[0], earlier, "earlier rows are untouched");
    assert.deepEqual(log[1], {
      word: "germane",
      syllabification: ["dʒɚ", "ˈmeɪn"],
      anchor_unit: "stressed-syllable", // the stressed chunk /meɪn/ is the anchored one
      keyword: "main",
      sense: "relevant and fitting to the subject under discussion",
      sentence: "The main point stays relevant to the talk.",
      pivot_words: ["main", "relevant"],
      // story-chain had the top p but needs 3+ pivot words; the second tag is kept at p ≥ 0.5
      technique: ["keyword-method", "scene-depicts-meaning"],
      recall_check: null,
      date: today(),
      picked_by: "auto",
    });

    // Jev was asked once, one yes/no question per controlled technique tag.
    assert.equal(h.jev.calls.length, 1);
    assert.equal(Object.keys(h.jev.calls[0].body.questions).length, 14);
  } finally {
    await h.cleanup();
  }
});
