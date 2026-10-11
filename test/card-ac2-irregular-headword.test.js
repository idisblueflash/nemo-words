// bug-006 (US-028 AC2): the headword gate must reject irregular inflections of
// the word (sang, ran, dying, lying, children ...), not only regular ones.

const test = require("node:test");
const assert = require("node:assert/strict");
const { checkStory, isInflectionOf } = require("../scripts/check-story");

test("check-story: irregular and ie->ying forms of the headword are rejected", () => {
  const cases = [
    ["sing", "She sang music.", "sang"],
    ["sing", "The sung music rang.", "sung"],
    ["run", "He ran music.", "ran"],
    ["die", "Dying music.", "dying"],
    ["lie", "Lying music.", "lying"],
    ["child", "Children music.", "children"],
    ["go", "Music went on.", "went"],
    ["mouse", "The mice heard music.", "mice"],
    ["leaf", "Leaves of music.", "leaves"],
  ];
  for (const [word, sentence, hit] of cases) {
    const reasons = checkStory({ word, primarySense: "music", sentence, chunks: [], lookupGa: () => null });
    assert.ok(reasons.includes(`headword: ${hit}`), `${word}: ${sentence} -> ${JSON.stringify(reasons)}`);
  }
});

test("check-story: irregular forms do not over-match unrelated words", () => {
  assert.equal(isInflectionOf("ran", "sing"), false);
  assert.equal(isInflectionOf("sang", "run"), false);
  assert.equal(isInflectionOf("sings", "sing"), true);
});
