// US-046 AC3 — a function word is never a rhyme anchor.
//
// Given a stressed syllable whose most frequent rhyme is a function word
// (flʌs -> "us", "thus"), when the anchors are found, then no function word
// is used as a rhyme; and the most frequent rhyme that is not a function word
// is used (flʌs -> "plus").

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/card-harness");

const FLUS = {
  dict: { us: "ˈʌs", thus: "ðˈʌs", plus: "plˈʌs", bus: "bˈʌs" },
  freqs: { us: 1e-3, thus: 3e-4, plus: 2e-4, bus: 3e-5 },
};

test("US-046 AC3: find-keywords skips the function words and anchors flʌs on 'plus'", async () => {
  const h = await createHarness(FLUS);
  try {
    const r = await h.runScript("find-keywords.js", ["ˈflʌs", "fluss"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "flʌs\tplus\t2.0000e-4\trime\n");
  } finally {
    await h.cleanup();
  }
});
