// US-039 AC5 — a word with a logged story is never logged again.
//
// Given a word that already has a logged story, when the one-word command
// runs and stops without making a card, then no new log row and no runner-ups
// entry are written.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const logged = { word: "germane", sentence: "Jermaine's main point stayed relevant.", pivot_words: ["Jermaine", "main", "relevant"] };

test("US-039 AC5: a carded word with a logged story stops (already carded) and writes no log row and no runner-ups", async () => {
  const h = await createHarness(germaneFixture(), {
    rows: ["germane\tJermaine's main point stayed relevant.\t\tdʒɚ.ˈmeɪn\trelevant to the point"],
    log: [logged],
  });
  const logBefore = fs.readFileSync(h.mnemonicLog, "utf8");
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^stopped at route: already carded/);

    assert.equal(fs.readFileSync(h.mnemonicLog, "utf8"), logBefore, "no new log row");
    assert.ok(!fs.existsSync(h.alternatesLog), "no runner-ups entry");
    assert.deepEqual(h.jev.calls, [], "Jev is never asked");
  } finally {
    await h.cleanup();
  }
});

// The logged-but-not-carded path (US-028's open question): the card is made
// from the logged story, a human pick. Logging it again would duplicate the
// row and mislabel it `auto`, so it isn't logged either.
test("US-039 AC5 edge: a logged story carded from the log is not re-logged and gets no runner-ups entry", async () => {
  const h = await createHarness(germaneFixture(), { log: [logged] });
  const logBefore = fs.readFileSync(h.mnemonicLog, "utf8");
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /logged story, kept as picked/);

    assert.equal(fs.readFileSync(h.mnemonicLog, "utf8"), logBefore, "no new log row");
    assert.ok(!fs.existsSync(h.alternatesLog), "no runner-ups entry");
    assert.deepEqual(h.jev.calls, [], "Jev is never asked");
  } finally {
    await h.cleanup();
  }
});
