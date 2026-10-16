// US-063 AC6 — no exact keyword, no one-chunk rhyme and no word rhyme: a stop.
//
// Given a word with no exact keyword, no one-chunk rhyme and no word rhyme
// (breadth, realms, rigged, scarce), when Flash runs the one-word command,
// then it stops with "no sound anchor found", and no card or log row is
// written.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, TERMS_HEADER } = require("./helpers/card-harness");

const define = (primarySense) =>
  JSON.stringify({ primarySense, definition: `${primarySense}, in plain words`, senses: [primarySense] });

// Each fixture holds only words the word-rhyme rules must turn down: an
// inflection of the headword, a word too rare (below 5e-7), a word with the
// headword's own stressed onset (a homophone), a word whose end differs.
const CASES = [
  {
    word: "breadth",
    dict: { breadth: "bɹˈɛdθ", breadths: "bɹˈɛdθs" },
    freqs: { breadth: 6e-6, breadths: 1e-7 },
    stop: "stopped at find-keywords: no sound anchor found; bɹɛdθ\t-\n",
  },
  {
    word: "realms",
    dict: { realms: "ɹˈɛlmz", realm: "ɹˈɛlm", overwhelms: "ˌoʊvɚwˈɛlmz", helms: "hˈɛlmz" },
    freqs: { realms: 5e-6, realm: 2e-5, overwhelms: 3e-7, helms: 4e-7 },
    stop: "stopped at find-keywords: no sound anchor found; ɹɛlmz\t-\n",
  },
  {
    word: "rigged",
    dict: { rigged: "ɹˈɪɡd", rig: "ɹˈɪɡ", unrigged: "ʌnɹˈɪɡd" },
    freqs: { rigged: 3e-6, rig: 5e-6, unrigged: 1e-5 },
    stop: "stopped at find-keywords: no sound anchor found; ɹɪɡd\t-\n",
  },
  {
    word: "scarce",
    dict: { scarce: "skˈɛɹs", scarcer: "skˈɛɹsɚ", scarcely: "skˈɛɹsli" },
    freqs: { scarce: 8e-6, scarcer: 3e-7, scarcely: 9e-6 },
    stop: "stopped at find-keywords: no sound anchor found; skɛɹs\t-\n",
  },
];

for (const c of CASES) {
  test(`US-063 AC6: card.js stops with 'no sound anchor found' for ${c.word} (no word rhyme either)`, async () => {
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
