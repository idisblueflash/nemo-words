// Bug-007 (US-028 AC5): classical-morpheme compounds the medical-flavoured seed
// list missed must classify as word-part, without turning ordinary general
// English into word-parts or changing the ambiguous verdict.

const test = require("node:test");
const assert = require("node:assert/strict");
const { classify } = require("../scripts/classify-word");
const { routeWord } = require("../scripts/route");

for (const word of ["photograph", "telephone", "adjoining", "biography", "thermometer", "telegraph", "autograph", "homophone", "adjoin"]) {
  test(`${word} classifies medical (word-part) and routes word-part`, () => {
    assert.equal(classify(word).verdict, "medical");
    assert.equal(routeWord(word).route, "word-part");
  });
}

// Words the classifier must NOT newly send to the word-part path.
for (const word of ["germane", "candor", "ubiquitous", "severe", "cracks", "adult", "address", "telling", "photon", "graphite", "joint", "phone", "adjust", "advice", "admit", "tele"]) {
  test(`${word} is not routed word-part`, () => {
    assert.notEqual(classify(word).verdict, "medical");
  });
}

test("ambiguous stays ambiguous (famous)", () => {
  assert.equal(classify("famous").verdict, "ambiguous");
  assert.equal(routeWord("famous").route, "ambiguous");
});
