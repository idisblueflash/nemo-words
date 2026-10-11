// US-028 AC2 — the automatic pick passes the hard gates.
//
// Given the candidate stories for a word, when the command picks one
// automatically, then the picked story has 10 words or fewer and does not
// contain the word or any inflection of it, it contains the word's primary
// sense word, and its sound anchors appear in the word's syllable order, each
// matching its chunk's US (GA) IPA exactly.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("AC2: card.js skips candidates that break a hard gate and picks the first that passes", async () => {
  const h = await createHarness(
    germaneFixture([
      { sentence: "Germanes stay relevant at the main meeting.", pivots: ["main", "relevant"] }, // inflection of the word
      { sentence: "The main point stays relevant to the whole long winding meeting tonight.", pivots: ["main", "relevant"] }, // 12 words
      { sentence: "The main road runs past the old town.", pivots: ["main"] }, // no sense word
      { sentence: "A mane of hair is relevant.", pivots: ["mane", "relevant"] }, // /meɪn/ anchor "main" missing
      { sentence: "The main point stays relevant to the talk.", pivots: ["main", "relevant"] }, // passes
    ])
  );
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    const picked = "The main point stays relevant to the talk.";
    assert.match(run.stdout, new RegExp(`story: ${picked.replace(/\./g, "\\.")}`));

    const back = h.mock.calls.find((c) => c.action === "addNote").params.note.fields.Back;
    assert.ok(back.startsWith(picked));

    // The gates, restated on the picked story itself:
    const words = picked.split(/\s+/);
    assert.ok(words.length <= 10);
    assert.ok(!/\bgerman(e|es|ed|ing)?\b/i.test(picked));
    assert.match(picked, /\brelevant\b/);
    // the only anchored chunk is /meɪn/ -> "main" (GA mˈeɪn), present in the story
    assert.match(picked, /\bmain\b/);
  } finally {
    await h.cleanup();
  }
});
