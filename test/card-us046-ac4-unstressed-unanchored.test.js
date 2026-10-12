// US-046 AC4 — only the stressed syllable gets a rhyme.
//
// Given a word with an unstressed syllable that has no exact-sound word
// (critique: kɹɪ), when the anchors are found, then that syllable stays
// unanchored, with no rhyme offered; and the stressed syllable still gets its
// rhyme (tik -> speak).

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/card-harness");

// critique (kɹɪ.ˈtik): no common word sounds exactly /kɹɪ/ or /tik/. "speak"
// and "seek" rhyme with /tik/; "bih" (a made-up one-syllable /bɪ/) rhymes with
// the unstressed /kɹɪ/ and is the most frequent word of all, so only the
// stressed-only rule keeps it out.
function critiqueFixture() {
  return {
    dict: { critique: "kɹɪtˈik", teak: "tˈik", speak: "spˈik", seek: "sˈik", bih: "bˈɪ" },
    freqs: { teak: 3e-8, critique: 2e-5, speak: 1e-4, seek: 2e-5, bih: 9e-3 },
    claude: {
      define: JSON.stringify({
        primarySense: "review",
        definition: "a detailed analysis and assessment of something",
        senses: ["review"],
      }),
      gloss: "a careful written judgment of a work",
      "compose-stories": JSON.stringify([{ sentence: "Speak up, then write your review.", pivots: ["speak", "review"] }]),
    },
  };
}

test("US-046 AC4: find-keywords leaves the unstressed /kɹɪ/ unanchored and rhymes the stressed /tik/ with 'speak'", async () => {
  const h = await createHarness(critiqueFixture());
  try {
    const r = await h.runScript("find-keywords.js", ["kɹɪ.ˈtik", "critique"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "kɹɪ\t-\ntik\tspeak\t1.0000e-4\trime\n");
  } finally {
    await h.cleanup();
  }
});

test("US-046 AC4: card.js cards critique on the rhyme 'speak'; /kɹɪ/ is offered no anchor", async () => {
  const h = await createHarness(critiqueFixture());
  try {
    const run = await h.runCard("critique");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^carded critique \(added\)$/m);

    const prompt = h.claudeCalls().find((c) => c.step === "compose-stories").prompt;
    assert.match(prompt, /^ {2}1\. \/kɹɪ\/ -> \(no anchor; leave this sound out\)$/m);
    assert.match(prompt, /^ {2}2\. \/tik\/ -> "speak" \(rhymes\)$/m);

    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 1);
    assert.equal(log[0].keyword, "speak");
    assert.equal(log[0].anchor_unit, "rime");
  } finally {
    await h.cleanup();
  }
});

test("US-046 edge: a secondary-stressed (ˌ) chunk gets no rhyme; only the primary-stressed one does", async () => {
  const h = await createHarness(critiqueFixture());
  try {
    const r = await h.runScript("find-keywords.js", ["ˌkɹɪ.ˈtik", "critique"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "kɹɪ\t-\ntik\tspeak\t1.0000e-4\trime\n");
  } finally {
    await h.cleanup();
  }
});
