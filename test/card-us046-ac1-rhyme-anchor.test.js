// US-046 AC1 — a word with no exact-sound match gets a rhyme anchor.
//
// Given a word whose stressed syllable has no common word with exactly its
// sound, but rhymes with one (drown /dɹaʊn/ -> down), when Flash runs the
// one-word command, then the card is made, with the story built on the rhyme
// word; and the log row's keyword is the rhyme word and its anchor unit is
// "rime".

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/card-harness");

// "drown" (ˈdɹaʊn): only the headword itself sounds exactly /dɹaʊn/; "down",
// "town" and "gown" rhyme with it, "down" the most frequent.
function drownFixture() {
  return {
    dict: { drown: "dɹˈaʊn", down: "dˈaʊn", town: "tˈaʊn", gown: "ɡˈaʊn" },
    freqs: { drown: 4e-6, down: 5e-4, town: 1e-4, gown: 3e-6 },
    claude: {
      define: JSON.stringify({
        primarySense: "die",
        definition: "to die under water because you cannot breathe",
        senses: ["die", "sink"],
      }),
      gloss: "to die under water",
      "compose-stories": JSON.stringify([
        { sentence: "Down in the lake, the sailor may die.", pivots: ["down", "die"] },
      ]),
    },
  };
}

test("US-046 AC1: card.js cards a rhyme-anchored word; the log keyword is the rhyme word and its anchor unit is rime", async () => {
  const h = await createHarness(drownFixture());
  try {
    const run = await h.runCard("drown");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^carded drown \(added\)$/m);
    assert.match(h.readAnkiFile(), /^drown\tDown in the lake, the sailor may die\.\t/m);

    // the story was drafted on the rhyme word, marked as a rhyme
    const compose = h.claudeCalls().filter((c) => c.step === "compose-stories");
    assert.equal(compose.length, 1);
    assert.match(compose[0].prompt, /\/dɹaʊn\/ -> "down" \(rhymes\)/);

    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 1);
    assert.equal(log[0].word, "drown");
    assert.equal(log[0].keyword, "down");
    assert.equal(log[0].anchor_unit, "rime");
  } finally {
    await h.cleanup();
  }
});

test("US-046 AC1: find-keywords CLI prints the rhyme as `ipa\\tkeyword\\tfreq\\trime`", async () => {
  const h = await createHarness(drownFixture());
  try {
    const r = await h.runScript("find-keywords.js", ["ˈdɹaʊn", "drown"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "dɹaʊn\tdown\t5.0000e-4\trime\n");
  } finally {
    await h.cleanup();
  }
});
