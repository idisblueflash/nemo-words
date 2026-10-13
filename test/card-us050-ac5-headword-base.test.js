// US-050 AC5 — the closed chunk's word is never the headword's own base.
//
// Given a headword (C-025) that is an inflection of the word for the longer
// chunk (sweating: /swɛt/ is "sweat"), when the anchors are found, then that
// word is not the keyword; and the stressed chunk has the same result as
// before this story (the rhyme "ye").

const test = require("node:test");
const assert = require("node:assert/strict");
const { soundFixture, findKeywordsOn } = require("./helpers/us050-fixtures");

const sweatingFixture = () =>
  soundFixture({ sweating: "swˈɛtɪŋ", sweat: "swˈɛt", ye: "jˈɛ" }, { sweating: 3e-6, sweat: 1e-5, ye: 9e-6 });

test("US-050 AC5: find-keywords does not anchor sweating on 'sweat'; the stressed chunk keeps the rhyme 'ye'", async () => {
  const r = await findKeywordsOn(sweatingFixture(), "ˈswɛ.tɪŋ", "sweating");
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, "swɛ\tye\t9.0000e-6\trime\ntɪŋ\t-\n");
});

test("US-050 AC5: a word with the same sound that is not the headword's base is still the keyword", async () => {
  // "swett" is a made-up word that sounds exactly /swɛt/
  const fx = sweatingFixture();
  fx.dict.swett = "swˈɛt";
  fx.freqs.swett = 2e-6;
  const r = await findKeywordsOn(fx, "ˈswɛ.tɪŋ", "sweating");
  assert.equal(r.stdout, "swɛt\tswett\t2.0000e-6\ntɪŋ\t-\n");
});
