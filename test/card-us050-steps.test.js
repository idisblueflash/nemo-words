// US-050: the closed chunk (C-026) rules in scripts/lib/closed-chunk.js, and
// the logic sketch's edge cases.

const test = require("node:test");
const assert = require("node:assert/strict");
const { closedChunk, canBeClosedKeyword } = require("../scripts/lib/closed-chunk");

test("closedChunk: the stressed chunk plus the next chunk's first consonant sound", () => {
  assert.deepEqual(closedChunk("ˈpɛ.nəl.ti"), { index: 0, ipa: "pɛn" });
  assert.deepEqual(closedChunk("ɪ.ˈlæ.stɪk"), { index: 1, ipa: "læs" }); // one consonant, not the cluster
  assert.deepEqual(closedChunk("ˈɛ.ɹə"), { index: 0, ipa: "ɛɹ" });
});

test("closedChunk: each of /ɪ ɛ æ ʌ ʊ/ closes", () => {
  assert.equal(closedChunk("ˈsɪ.kən").ipa, "sɪk");
  assert.equal(closedChunk("ˈɹæ.təlz").ipa, "ɹæt");
  assert.equal(closedChunk("ˈplʌ.mɚ").ipa, "plʌm");
  assert.equal(closedChunk("ˈdʊ.ɹə.bəl").ipa, "dʊɹ");
});

test("closedChunk: /tʃ/ and /dʒ/ are one sound", () => {
  assert.deepEqual(closedChunk("ˈlɛ.dʒə.bəl"), { index: 0, ipa: "lɛdʒ" });
  assert.deepEqual(closedChunk("ˈkɪ.tʃən"), { index: 0, ipa: "kɪtʃ" });
});

test("closedChunk: no rule for another final vowel, a diphthong or a closed syllable", () => {
  assert.equal(closedChunk("ˈkɑ.tədʒ"), null);
  assert.equal(closedChunk("ˈlɔ.ndɹi"), null);
  assert.equal(closedChunk("ˈpeɪ.pɚ"), null);
  assert.equal(closedChunk("ˈhaʊ.zɪz"), null); // /aʊ/ is one sound, not a final /ʊ/
  assert.equal(closedChunk("ˈpɛn.səl"), null); // already ends in a consonant
});

test("closedChunk: no rule when the stressed chunk is the last chunk or the next chunk starts with a vowel", () => {
  assert.equal(closedChunk("ə.ˈdɪ"), null);
  assert.equal(closedChunk("ˈnʌ.ɪŋ"), null);
  assert.equal(closedChunk("ˈmɛ.ɚ"), null); // /ɚ/ is a vowel
});

test("closedChunk: no rule for secondary stress, no stress or a one-chunk word", () => {
  assert.equal(closedChunk("ˌpɛ.nəl.ti"), null);
  assert.equal(closedChunk("pɛ.nəl.ti"), null);
  assert.equal(closedChunk("ˈpɛ"), null);
  // only the primary-stressed chunk is looked at
  assert.deepEqual(closedChunk("ˌdɛ.və.ˈsteɪ.ʃən"), null);
  assert.deepEqual(closedChunk("ˌɪn.fə.ˈdɛ.lə.ti"), { index: 2, ipa: "dɛl" });
});

test("canBeClosedKeyword: 3+ letters, not a function word, not a word the headword is an inflection of", () => {
  assert.equal(canBeClosedKeyword("pen", "penalty"), true);
  assert.equal(canBeClosedKeyword("al", "aloe"), false);
  assert.equal(canBeClosedKeyword("does", "dozen"), false);
  assert.equal(canBeClosedKeyword("sweat", "sweating"), false);
  assert.equal(canBeClosedKeyword("snub", "snubbing"), false);
  assert.equal(canBeClosedKeyword("sweat", "sweater"), false); // -er counts as an inflection in check-story
  assert.equal(canBeClosedKeyword("sweat"), true); // no headword given
});
