// US-039 AC2 — the runner-ups are recorded with the card.
//
// Given the candidate stories drafted for the word, when the card is logged,
// then the runner-ups list records every other candidate with its pivot
// words; each runner-up that failed a hard gate carries its reject reasons;
// and the picked story itself is not among the runner-ups.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture, today } = require("./helpers/card-harness");

test("US-039 AC2: card.js writes one alternates entry: every other candidate, with pivots and reject reasons", async () => {
  const picked = "The main point stays relevant to the talk.";
  const stories = [
    { sentence: "The germane point stays relevant.", pivots: ["main", "relevant"] }, // fails: headword, no anchor
    { sentence: picked, pivots: ["main", "relevant"] }, // first to pass -> the auto-pick
    { sentence: "Main facts stay relevant.", pivots: ["main", "relevant"] }, // passes too, but isn't first
    { sentence: "The main road is long.", pivots: ["main"] }, // fails: no sense word
  ];
  const h = await createHarness(germaneFixture(stories));
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(h.readJsonl(h.mnemonicLog).at(-1).sentence, picked);

    assert.deepEqual(h.readJsonl(h.alternatesLog), [
      {
        word: "germane",
        chosen: picked,
        picked_by: "auto",
        date: today(),
        alternates: [
          {
            sentence: "The germane point stays relevant.",
            pivot_words: ["main", "relevant"],
            reject_reasons: ["headword: germane", "anchor-missing: main"],
          },
          { sentence: "Main facts stay relevant.", pivot_words: ["main", "relevant"], reject_reasons: [] },
          { sentence: "The main road is long.", pivot_words: ["main"], reject_reasons: ["sense-missing: relevant"] },
        ],
      },
    ]);
  } finally {
    await h.cleanup();
  }
});
