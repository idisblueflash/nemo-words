// US-050 AC3 — the closed chunk's word wins over the open chunk's exact keyword.
//
// Given a word whose stressed syllable ends in a short vowel and has an exact
// keyword today (era /ˈɛ.ɹə/: /ɛ/ is "eh"), when the anchors are found, then
// the keyword of the stressed chunk is the word for the longer chunk (/ɛɹ/,
// "air"), not "eh".

const test = require("node:test");
const assert = require("node:assert/strict");
const { eraFixture, findKeywordsOn } = require("./helpers/us050-fixtures");

test("US-050 AC3: find-keywords gives era's stressed chunk /ɛɹ/ 'air', not the open chunk's 'eh'", async () => {
  const r = await findKeywordsOn(eraFixture(), "ˈɛ.ɹə", "era");
  assert.equal(r.code, 0, r.stderr);
  // before this story: `ɛ\teh\t4.0000e-6`, `ɹə\t-`
  assert.equal(r.stdout, "ɛɹ\tair\t2.0000e-4\nɹə\t-\n");
});

test("US-050 AC3: the closed chunk's word wins even when the open chunk's exact keyword is more frequent", async () => {
  const fx = eraFixture();
  fx.freqs.eh = 9e-3;
  const r = await findKeywordsOn(fx, "ˈɛ.ɹə", "era");
  assert.equal(r.stdout, "ɛɹ\tair\t2.0000e-4\nɹə\t-\n");
});
