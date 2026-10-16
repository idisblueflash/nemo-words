// US-063 AC5 — the hard gates re-check a word rhyme against the WordTail.
//
// Given a story for a word-rhyme card whose anchor word does not match the
// word from the stressed vowel to the end, when the hard gates check the
// story, then the story fails with an "anchor-ipa" reason, and it is not
// picked.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/card-harness");
const { checkStory } = require("../scripts/check-story");

// "capable" ends in /eɪpəbəl/ from its stressed vowel, not durable's /ʊɹəbəl/.
const fixture = {
  dict: { durable: "dˈʊɹəbəl", incurable: "ɪnkjˈʊɹəbəl", capable: "kˈeɪpəbəl" },
  freqs: {},
  claude: {},
};
const wordRimeLines = (kw) => `dʊ\t${kw}\t2.0000e-6\tword-rime\nɹə\t-\nbəl\t-\n`;

test("US-063 AC5: check-stories fails a word-rhyme story whose anchor does not rhyme with the WordTail, and pick-story does not pick it", async () => {
  const h = await createHarness(fixture);
  try {
    const candidates = h.writeFile("candidates.tsv", "A capable love is lasting.\tcapable,lasting\n");
    const keywords = h.writeFile("keywords.tsv", wordRimeLines("capable"));
    const checks = await h.runScript("check-stories.js", ["durable", "lasting", candidates, keywords]);
    assert.equal(checks.code, 0, checks.stderr);
    assert.equal(checks.stdout, "anchor-ipa: capable /keɪpəbəl/ does not rhyme with /ʊɹəbəl/\n");

    const checksFile = h.writeFile("checks.tsv", checks.stdout);
    const pick = await h.runScript("pick-story.js", [candidates, checksFile, "-"]);
    assert.equal(pick.code, 1, pick.stderr);
    assert.match(pick.stdout, /^no-pick: /m);
    assert.match(pick.stdout, /anchor-ipa: capable/);
  } finally {
    await h.cleanup();
  }
});

test("US-063 AC5: the same story on the matching word rhyme passes the gates", async () => {
  const h = await createHarness(fixture);
  try {
    const candidates = h.writeFile("candidates.tsv", "An incurable love is lasting.\tincurable,lasting\n");
    const keywords = h.writeFile("keywords.tsv", wordRimeLines("incurable"));
    const checks = await h.runScript("check-stories.js", ["durable", "lasting", candidates, keywords]);
    assert.equal(checks.code, 0, checks.stderr);
    assert.equal(checks.stdout, "-\n");
  } finally {
    await h.cleanup();
  }
});

test("check-story: a word rhyme with no GA form at all fails anchor-ipa with `?`", () => {
  const reasons = checkStory({
    word: "durable",
    primarySense: "lasting",
    sentence: "A zorble love is lasting.",
    chunks: [
      { ipa: "dʊ", keyword: "zorble", match: "word-rime" },
      { ipa: "ɹə", keyword: null },
      { ipa: "bəl", keyword: null },
    ],
    lookupGa: () => null,
  });
  assert.deepEqual(reasons, ["anchor-ipa: zorble /?/ does not rhyme with /ʊɹəbəl/"]);
});
