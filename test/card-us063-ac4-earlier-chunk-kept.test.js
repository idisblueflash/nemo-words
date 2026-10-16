// US-063 AC4 — a chunk before the stressed chunk keeps its line.
//
// Given a word with a chunk before the stressed chunk (garage /ɡə.ˈɹɑʒ/),
// when the anchors are found, then the stressed chunk gets a word rhyme
// ("massage" or "barrage"); and the chunk before it gets the same result as
// before this story.

const test = require("node:test");
const assert = require("node:assert/strict");
const { findKeywordsOn, soundFixture } = require("./helpers/us050-fixtures");

// garage (ɡə.ˈɹɑʒ): the stress is on the last chunk, so the WordTail is only
// its rime /ɑʒ/; "massage" has more syllables than that, which a word rhyme
// may. "barrage" and "mirage" have the headword's own stressed onset /ɹ/
// (in this fixture), so they are turned down as homophones.
const garageDict = {
  garage: "ɡəɹˈɑʒ",
  massage: "məsˈɑʒ",
  barrage: "bəɹˈɑʒ",
  mirage: "mɪɹˈɑʒ",
};
const garageFreqs = { garage: 2e-5, massage: 6e-6, barrage: 9e-6, mirage: 3e-6 };

test("US-063 AC4: garage's stressed chunk gets the word rhyme massage; the unanchored chunk before it stays `-`", async () => {
  const r = await findKeywordsOn(soundFixture(garageDict, garageFreqs), "ɡə.ˈɹɑʒ", "garage");
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, "ɡə\t-\nɹɑʒ\tmassage\t6.0000e-6\tword-rime\n");
});

test("US-063 AC4: a chunk before the stressed chunk keeps its own exact keyword", async () => {
  // "guh" is a fixture-only word that sounds exactly /ɡə/
  const fx = soundFixture({ ...garageDict, guh: "ɡə" }, { ...garageFreqs, guh: 1e-5 });
  const r = await findKeywordsOn(fx, "ɡə.ˈɹɑʒ", "garage");
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, "ɡə\tguh\t1.0000e-5\nɹɑʒ\tmassage\t6.0000e-6\tword-rime\n");
});
