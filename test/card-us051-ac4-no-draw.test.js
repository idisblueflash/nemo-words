// US-051 AC4 — words that don't get a story card today are never drawn.
//
// Given a word with a logged story, a word with no sound anchor, or a word on
// the word-part path, when Flash runs the one-word command, then no draw
// happens, and the word is handled as before this story; and it doesn't count
// toward either arm.
//
// Every run forces NEMO_ARM=control: had a draw happened, the word would land
// in the control arm, so a word handled as before proves there was no draw.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture, TERMS_HEADER } = require("./helpers/card-harness");
const { countArms } = require("../scripts/draw-arm");

test("US-051 AC4: a logged-story word is carded with its logged story as before: no draw, no arm tag, no arm line", async () => {
  const logged = "Jermaine's main point stayed relevant.";
  const h = await createHarness(germaneFixture(), {
    arm: "control",
    log: [{ word: "germane", sentence: logged, pivot_words: ["main"] }],
  });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    const rows = h.readAnkiFile().split("\n").filter((l) => l && !l.startsWith("#"));
    assert.deepEqual(rows, [`germane\t${logged}\t\tdʒɚ.ˈmeɪn\trelevant to the matter at hand`]);
    assert.equal(h.mock.calls.find((c) => c.action === "addNote").params.note.deckName, "00 Reading Room::Terms");
    assert.match(run.stdout, /\(logged story, kept as picked\)/);
    assert.doesNotMatch(run.stdout, /arm/);
    assert.deepEqual(countArms(h.readAnkiFile()), { control: 0, story: 0 });
  } finally {
    await h.cleanup();
  }
});

test("US-051 AC4: a no-anchor word still stops at find-keywords, before any draw, with nothing written", async () => {
  const fx = germaneFixture();
  fx.dict = { stew: "stˈu" };
  fx.freqs = { stew: 5e-6 };
  const h = await createHarness(fx, { arm: "control" });
  try {
    const run = await h.runCard("stew");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(run.stdout, "stopped at find-keywords: no sound anchor found; stu\t-\n");
    assert.equal(h.readAnkiFile(), TERMS_HEADER.join("\n") + "\n");
    assert.deepEqual(h.mock.calls, []);
  } finally {
    await h.cleanup();
  }
});

test("US-051 AC4: a word-part word still stops at route, before any draw, with nothing written", async () => {
  const h = await createHarness(germaneFixture(), { arm: "control" });
  try {
    const run = await h.runCard("nephrectomy");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^stopped at route: word-part: nephrectomy/);
    assert.equal(h.readAnkiFile(), TERMS_HEADER.join("\n") + "\n");
    assert.deepEqual(h.mock.calls, []);
  } finally {
    await h.cleanup();
  }
});
