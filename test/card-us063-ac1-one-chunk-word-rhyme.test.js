// US-063 AC1 — a one-chunk word with no exact keyword and no one-chunk rhyme
// gets a word rhyme (C-031).
//
// Given a one-chunk word with no exact keyword and no one-chunk rhyme (bulge
// /ˈbʌldʒ/), when Flash runs the one-word command, then the card is made, with
// the story built on a word rhyme ("indulge"); and the log row's keyword is
// that word and its anchor unit is "rime".

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/card-harness");

// bulge (ˈbʌldʒ): no other word sounds exactly /bʌldʒ/ and no one-syllable
// word rhymes with it; "indulge" and "divulge" end in /ʌldʒ/ from their
// stressed vowel, "indulge" the more frequent.
function bulgeFixture() {
  return {
    dict: { bulge: "bˈʌldʒ", bulges: "bˈʌldʒɪz", indulge: "ɪndˈʌldʒ", divulge: "dɪvˈʌldʒ" },
    freqs: { bulge: 3e-6, bulges: 1e-6, indulge: 4e-6, divulge: 1e-6 },
    claude: {
      define: JSON.stringify({
        primarySense: "swell",
        definition: "to swell out in a round shape",
        senses: ["swell", "stick out"],
      }),
      gloss: "to swell out in a round shape",
      "compose-stories": JSON.stringify([
        { sentence: "Indulge in cake, and your belly starts to swell.", pivots: ["indulge", "swell"] },
      ]),
    },
  };
}

test("US-063 AC1: card.js cards bulge on the word rhyme indulge; the log keyword is indulge, anchor unit rime", async () => {
  const h = await createHarness(bulgeFixture());
  try {
    const run = await h.runCard("bulge");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^carded bulge \(added\)$/m);
    assert.match(h.readAnkiFile(), /^bulge\tIndulge in cake, and your belly starts to swell\.\t/m);

    const compose = h.claudeCalls().filter((c) => c.step === "compose-stories");
    assert.equal(compose.length, 1);
    assert.match(compose[0].prompt, /\/bʌldʒ\/ -> "indulge" \(rhymes with \/ʌldʒ\/, the end of the word\)/);

    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 1);
    assert.equal(log[0].word, "bulge");
    assert.equal(log[0].keyword, "indulge");
    assert.equal(log[0].anchor_unit, "rime");
  } finally {
    await h.cleanup();
  }
});

test("US-063 AC1: find-keywords CLI prints the word rhyme as `ipa\\tkeyword\\tfreq\\tword-rime`", async () => {
  const h = await createHarness(bulgeFixture());
  try {
    const r = await h.runScript("find-keywords.js", ["ˈbʌldʒ", "bulge"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "bʌldʒ\tindulge\t4.0000e-6\tword-rime\n");
  } finally {
    await h.cleanup();
  }
});
