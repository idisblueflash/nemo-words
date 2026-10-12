// US-046: the step changes that carry a rhyme anchor through the pipeline
// (find-keywords' fourth `rime` column, read by compose-stories, check-story
// and log-card).

const test = require("node:test");
const assert = require("node:assert/strict");
const { readChunkKeywords, composePrompt } = require("../scripts/compose-stories");
const { checkStory } = require("../scripts/check-story");
const { anchorUnit } = require("../scripts/log-card");

test("compose-stories: a `rime` fourth column marks the chunk's keyword as a rhyme", () => {
  assert.deepEqual(readChunkKeywords("kɹɪ\t-\ntik\tspeak\t1.0000e-4\trime\n"), [
    { ipa: "kɹɪ", keyword: null },
    { ipa: "tik", keyword: "speak", match: "rime" },
  ]);
});

test("compose-stories: the prompt line for a rhyme chunk says it rhymes", () => {
  const prompt = composePrompt("drown", "die", [{ ipa: "dɹaʊn", keyword: "down", match: "rime" }]);
  assert.match(prompt, /^ {2}1\. \/dɹaʊn\/ -> "down" \(rhymes\)$/m);
  const exact = composePrompt("germane", "relevant", [{ ipa: "meɪn", keyword: "main" }]);
  assert.match(exact, /^ {2}1\. \/meɪn\/ -> "main"$/m);
});

const lookupGa = (w) => ({ down: "dˈaʊn", main: "mˈeɪn", speak: "spˈik", sun: "sˈʌn" })[w] || null;

test("check-story: a rhyme anchor passes when its rime matches the chunk's rime", () => {
  const reasons = checkStory({
    word: "drown",
    primarySense: "die",
    sentence: "Down in the lake, the sailor may die.",
    chunks: [{ ipa: "dɹaʊn", keyword: "down", match: "rime" }],
    lookupGa,
  });
  assert.deepEqual(reasons, []);
});

test("check-story: a rhyme anchor whose rime differs still fails the anchor-ipa gate", () => {
  const reasons = checkStory({
    word: "drown",
    primarySense: "die",
    sentence: "The sun sets and they die.",
    chunks: [{ ipa: "dɹaʊn", keyword: "sun", match: "rime" }],
    lookupGa,
  });
  assert.deepEqual(reasons, ["anchor-ipa: sun /sʌn/ does not rhyme with /dɹaʊn/"]);
});

test("log-card: anchor_unit is rime when the stressed chunk's keyword is a rhyme", () => {
  assert.equal(anchorUnit([{ anchorUnits: ["whole-word", "stressed-syllable", "rime"], keyword: "down", match: "rime" }]), "rime");
  assert.equal(
    anchorUnit([
      { anchorUnits: ["first-syllable", "rime"], keyword: null },
      { anchorUnits: ["stressed-syllable", "rime"], keyword: "speak", match: "rime" },
    ]),
    "rime"
  );
  // unchanged otherwise
  assert.equal(anchorUnit([{ anchorUnits: ["whole-word"], keyword: "main" }]), "whole-word");
});
