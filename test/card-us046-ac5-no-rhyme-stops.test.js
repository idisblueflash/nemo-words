// US-046 AC5 — no exact-sound word and no common rhyme: still a no-anchor stop.
//
// Given a word with no exact-sound word and no common rhyme for its stressed
// syllable (stew, vapor, bulge), when Flash runs the one-word command, then
// it still stops with "no sound anchor found", as before.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, TERMS_HEADER } = require("./helpers/card-harness");

const define = (primarySense) =>
  JSON.stringify({ primarySense, definition: `${primarySense}, in plain words`, senses: [primarySense] });

// Each fixture holds only words the rhyme rules must turn down: the headword,
// a word with no onset, function words, a word of more than one syllable, a
// word whose rime only contains the chunk's rime, and a too-rare word.
const CASES = [
  {
    word: "stew",
    dict: { stew: "stˈu", ooh: "ˈu", to: "tˈu", who: "hˈu", do: "dˈu", shampoo: "ʃæmpˈu", gnu: "nˈu" },
    freqs: { stew: 5e-6, ooh: 2e-5, to: 2e-2, who: 2e-3, do: 1e-3, shampoo: 3e-6, gnu: 1e-8 },
    stop: "stopped at find-keywords: no sound anchor found; stu\t-\n",
  },
  {
    word: "vapor",
    dict: { vapor: "vˈeɪpɚ", a: "ˈeɪ", they: "ðˈeɪ", may: "mˈeɪ", today: "tədˈeɪ", nay: "nˈeɪ", fey: "fˈeɪ" },
    freqs: { vapor: 6e-6, a: 2e-2, they: 3e-3, may: 8e-4, today: 2e-4, nay: 4e-6, fey: 2e-8 },
    stop: "stopped at find-keywords: no sound anchor found; veɪ\t-; pɚ\t-\n",
  },
  {
    word: "bulge",
    dict: { bulge: "bˈʌldʒ", indulge: "ɪndˈʌldʒ", bulges: "bˈʌldʒɪz" },
    freqs: { bulge: 3e-6, indulge: 4e-6, bulges: 1e-6 },
    stop: "stopped at find-keywords: no sound anchor found; bʌldʒ\t-\n",
  },
];

for (const c of CASES) {
  test(`US-046 AC5: card.js still stops with 'no sound anchor found' for ${c.word} (no common rhyme)`, async () => {
    const h = await createHarness({
      dict: c.dict,
      freqs: c.freqs,
      claude: {
        define: define("thing"),
        gloss: "a thing",
        "compose-stories": JSON.stringify([{ sentence: "Should never be drafted.", pivots: ["never"] }]),
      },
    });
    try {
      const run = await h.runCard(c.word);
      assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
      assert.equal(run.stdout, c.stop);
      assert.deepEqual(h.claudeCalls().filter((x) => x.step === "compose-stories"), []);
      assert.equal(h.readAnkiFile(), TERMS_HEADER.join("\n") + "\n");
      assert.deepEqual(h.readJsonl(h.mnemonicLog), []);
    } finally {
      await h.cleanup();
    }
  });
}
