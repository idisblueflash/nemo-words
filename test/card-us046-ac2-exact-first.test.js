// US-046 AC2 — an exact-sound keyword always wins over a rhyme.
//
// Given a word whose stressed syllable has a common word with exactly its
// sound, when Flash runs the one-word command, then that exact-sound word is
// the anchor, never a rhyme.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

// germane (dʒɚ.ˈmeɪn): /meɪn/ is exactly "main"; "rain" rhymes with it and is
// made more frequent than "main", so only the exact-first rule keeps "main".
function germaneWithRhyme() {
  const fx = germaneFixture();
  fx.dict.rain = "ɹˈeɪn";
  fx.dict.pain = "pˈeɪn";
  fx.freqs.rain = 9e-4;
  fx.freqs.pain = 5e-4;
  return fx;
}

test("US-046 AC2: card.js anchors the stressed chunk on its exact-sound word, not a more frequent rhyme", async () => {
  const h = await createHarness(germaneWithRhyme());
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

    const compose = h.claudeCalls().filter((c) => c.step === "compose-stories");
    assert.equal(compose.length, 1);
    assert.match(compose[0].prompt, /\/meɪn\/ -> "main"$/m);
    assert.doesNotMatch(compose[0].prompt, /rhymes|"rain"|"pain"/);

    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 1);
    assert.equal(log[0].keyword, "main");
    assert.equal(log[0].anchor_unit, "stressed-syllable");
  } finally {
    await h.cleanup();
  }
});

test("US-046 AC2: find-keywords CLI prints the exact keyword with no `rime` column", async () => {
  const h = await createHarness(germaneWithRhyme());
  try {
    const r = await h.runScript("find-keywords.js", ["dʒɚ.ˈmeɪn", "germane"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "dʒɚ\t-\nmeɪn\tmain\t1.2800e-4\n");
  } finally {
    await h.cleanup();
  }
});
