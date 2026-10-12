// US-040 unit coverage: how scripts/route-accuracy.js builds its labelled set.

const test = require("node:test");
const assert = require("node:assert/strict");
const { labelledSet, frontWord, exampleWords } = require("../scripts/route-accuracy");

const HEADER = "#separator:tab\n#columns:Front\tBack\tImage\tIPA\tGloss\tDeck\tTags\n";
const wordPartRow = (front, back) => [front, back, "", "", "", "00 Reading Room::01 Medical Terms", "medical-word-parts"].join("\t");

test("route-accuracy: a whole-word Front is lowercased, with a trailing (disambiguation) dropped", () => {
  assert.equal(frontWord("Quebec"), "quebec");
  assert.equal(frontWord("colon (intestine)"), "colon");
  assert.equal(frontWord("ice cream"), null);
});

test("route-accuracy: example words come only from the examples span, not an e.g. in the meaning", () => {
  const back =
    '🎭 Sing.<hr><i>Greek</i><br>together (e.g. sym- before p/b/m)<br><span class="examples">e.g. syndrome, Synthesis, symptom</span>';
  assert.deepEqual(exampleWords(back), ["syndrome", "synthesis", "symptom"]);
  assert.deepEqual(exampleWords("no examples here"), []);
});

test("route-accuracy: word-part Fronts stay out, duplicates collapse, and a word with both labels is left out", () => {
  const text =
    HEADER +
    [
      "colon\tA story.",
      "colon (intestine)\tAnother story.",
      wordPartRow("syn-", '🎭 x<hr><i>Greek</i><br>with<br><span class="examples">e.g. syndrome, colon</span>'),
      wordPartRow("-drome", '<i>Greek</i><br>run<br><span class="examples">e.g. syndrome</span>'),
    ].join("\n");
  const { words, bothLabels } = labelledSet(text);
  assert.deepEqual(bothLabels, ["colon"]);
  assert.ok(!words.some((w) => /-/.test(w.word)), "no word-part Front in the set");
  assert.equal(words.filter((w) => w.word === "syndrome").length, 1);
  assert.deepEqual(words.find((w) => w.word === "syndrome"), { word: "syndrome", label: "word-part" });
  assert.deepEqual(words.find((w) => w.word === "ibuprofen"), { word: "ibuprofen", label: "word-part" });
  assert.deepEqual(words.find((w) => w.word === "trial"), { word: "trial", label: "general" });
});
