// US-063: the step changes that carry a word rhyme (C-031) through the
// pipeline (find-keywords' fourth `word-rime` column, read by compose-stories,
// check-story and log-card).

const test = require("node:test");
const assert = require("node:assert/strict");
const { readChunkKeywords, composePrompt } = require("../scripts/compose-stories");
const { checkStory } = require("../scripts/check-story");
const { anchorUnit } = require("../scripts/log-card");

const durableLines = "dʊ\tincurable\t2.0000e-6\tword-rime\nɹə\t-\nbəl\t-\n";

test("compose-stories: a `word-rime` fourth column marks the chunk's keyword as a word rhyme", () => {
  assert.deepEqual(readChunkKeywords(durableLines), [
    { ipa: "dʊ", keyword: "incurable", match: "word-rime" },
    { ipa: "ɹə", keyword: null },
    { ipa: "bəl", keyword: null },
  ]);
});

test("compose-stories: the word-rhyme line names the tail; covered chunks say so; an earlier chunk with no anchor is left out", () => {
  const prompt = composePrompt("garage", "shed", [
    { ipa: "ɡə", keyword: null },
    { ipa: "ɹɑʒ", keyword: "massage", match: "word-rime" },
  ]);
  assert.match(prompt, /^ {2}1\. \/ɡə\/ -> \(no anchor; leave this sound out\)$/m);
  assert.match(prompt, /^ {2}2\. \/ɹɑʒ\/ -> "massage" \(rhymes with \/ɑʒ\/, the end of the word\)$/m);
  const durable = composePrompt("durable", "lasting", readChunkKeywords(durableLines));
  assert.match(durable, /^ {2}1\. \/dʊ\/ -> "incurable" \(rhymes with \/ʊɹəbəl\/, the end of the word\)$/m);
  assert.match(durable, /^ {2}2\. \/ɹə\/ -> \(covered by the rhyme above\)$/m);
});

const lookupGa = (w) => ({ incurable: "ɪnkjˈʊɹəbəl", curable: "kjˈʊɹəbəl", capable: "kˈeɪpəbəl", massage: "məsˈɑʒ" })[w] || null;

test("check-story: a word-rhyme anchor passes when a GA form's end from its stressed vowel is the WordTail", () => {
  const reasons = checkStory({
    word: "durable",
    primarySense: "lasting",
    sentence: "An incurable love is lasting.",
    chunks: readChunkKeywords(durableLines),
    lookupGa,
  });
  assert.deepEqual(reasons, []);
});

test("log-card: a word rhyme on the stressed chunk logs anchor_unit rime", () => {
  assert.equal(
    anchorUnit([
      { anchorUnits: ["first-syllable", "stressed-syllable", "rime"], keyword: "incurable", match: "word-rime" },
      { anchorUnits: ["rime"], keyword: null },
      { anchorUnits: ["rime"], keyword: null },
    ]),
    "rime"
  );
  assert.equal(anchorUnit([{ anchorUnits: ["whole-word", "stressed-syllable"], keyword: "indulge", match: "word-rime" }]), "rime");
});
