// US-063 AC2 — a word rhyme on the stressed chunk covers every later chunk.
//
// Given a word whose stressed chunk has no anchor, with chunks after it
// (durable /ˈdʊ.ɹə.bəl/), when the anchors are found, then the stressed chunk
// gets a word rhyme that matches /ʊɹəbəl/ ("incurable"), marked as a word
// rhyme; and each later chunk has no anchor of its own, because the word rhyme
// covers it; and a story with "incurable" passes the hard gates, and the
// card's IPA line is the same as before.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/card-harness");

// durable (ˈdʊ.ɹə.bəl): no word sounds /dʊ/ or /dʊɹ/ (its closed chunk), and
// no one-syllable word rhymes with /ʊ/. "incurable" and "endurable" end in
// /ʊɹəbəl/ from their stressed vowel; "endurable" has the headword's own
// stressed onset /d/, so it is turned down. The later chunk /bəl/ has its own
// exact keyword "bull" (a fixture-only form), which the word rhyme replaces.
function durableFixture() {
  return {
    dict: {
      durable: "dˈʊɹəbəl",
      incurable: "ɪnkjˈʊɹəbəl",
      endurable: "ɛndˈʊɹəbəl",
      bull: "bəl",
    },
    freqs: { durable: 1e-5, incurable: 2e-6, endurable: 9e-6, bull: 1e-5 },
    claude: {
      define: JSON.stringify({
        primarySense: "lasting",
        definition: "able to stay in good shape for a long time; lasting",
        senses: ["lasting", "tough"],
      }),
      gloss: "lasting a long time",
      "compose-stories": JSON.stringify([{ sentence: "An incurable love is lasting.", pivots: ["incurable", "lasting"] }]),
    },
  };
}

test("US-063 AC2: find-keywords gives the stressed chunk the word rhyme incurable and the later chunks no anchor", async () => {
  const h = await createHarness(durableFixture());
  try {
    const r = await h.runScript("find-keywords.js", ["ˈdʊ.ɹə.bəl", "durable"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "dʊ\tincurable\t2.0000e-6\tword-rime\nɹə\t-\nbəl\t-\n");
  } finally {
    await h.cleanup();
  }
});

test("US-063 AC2: card.js cards durable on incurable; the story passes the hard gates and the IPA line is unchanged", async () => {
  const h = await createHarness(durableFixture());
  try {
    const run = await h.runCard("durable");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^carded durable \(added\)$/m);
    // the card's IPA column is the syllabified IPA, as before this story
    assert.match(h.readAnkiFile(), /^durable\tAn incurable love is lasting\.\t[^\t]*\tˈdʊ\.ɹə\.bəl\t/m);

    const compose = h.claudeCalls().filter((c) => c.step === "compose-stories");
    assert.equal(compose.length, 1);
    assert.match(compose[0].prompt, /^ {2}1\. \/dʊ\/ -> "incurable" \(rhymes with \/ʊɹəbəl\/, the end of the word\)$/m);
    assert.match(compose[0].prompt, /^ {2}2\. \/ɹə\/ -> \(covered by the rhyme above\)$/m);
    assert.match(compose[0].prompt, /^ {2}3\. \/bəl\/ -> \(covered by the rhyme above\)$/m);

    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 1);
    assert.equal(log[0].keyword, "incurable");
    assert.equal(log[0].anchor_unit, "rime");
    assert.deepEqual(log[0].syllabification, ["ˈdʊ", "ɹə", "bəl"]);
  } finally {
    await h.cleanup();
  }
});
