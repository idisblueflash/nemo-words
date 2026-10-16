// US-063: the word rhyme (C-031) rules in scripts/lib/rhyme.js (pure, no I/O),
// one test per rule of the logic sketch, plus its edge cases.

const test = require("node:test");
const assert = require("node:assert/strict");
const { wordRhymeFor, wordRhymeCandidates, wordTail, stressedEnd } = require("../scripts/lib/rhyme");

// `word\tRP\tGA[,GA…]` lines, as `nemo-words ipa-lookup --ga <tail>` prints them.
const lookup = (dict) => Object.entries(dict).map(([w, ga]) => `${w}\t\t${ga}`).join("\n") + "\n";

test("wordTail: the stressed chunk's rime plus every later chunk's IPA", () => {
  assert.equal(wordTail("ˈdʊ.ɹə.bəl"), "ʊɹəbəl");
  assert.equal(wordTail("ˈbʌldʒ"), "ʌldʒ");
  // primary stress on the last chunk: only that chunk's rime
  assert.equal(wordTail("ɡə.ˈɹɑʒ"), "ɑʒ");
  // a secondary stress after the primary is part of the tail
  assert.equal(wordTail("ˈæp.ɹəˌhɛnd"), "æpɹəhɛnd");
});

test("stressedEnd: from the primary-stressed vowel to the end, with that syllable's onset", () => {
  assert.deepEqual(stressedEnd("ɪnkjˈʊɹəbəl"), { tail: "ʊɹəbəl", onset: "kj" });
  assert.deepEqual(stressedEnd("ɪndˈʌldʒ"), { tail: "ʌldʒ", onset: "d" });
  // a one-syllable form with no ˈ counts as stressed; a longer one is skipped
  assert.deepEqual(stressedEnd("bʌldʒ"), { tail: "ʌldʒ", onset: "b" });
  assert.equal(stressedEnd("ɪndʌldʒ"), null);
  // only the primary stress counts
  assert.deepEqual(stressedEnd("ˌæpɹəhˈɛnd"), { tail: "ɛnd", onset: "h" });
});

test("rule 2: a candidate of any number of syllables whose end from its stressed vowel is the tail", () => {
  const lookupLines = lookup({ indulge: "ɪndˈʌldʒ", divulge: "dɪvˈʌldʒ", indulgent: "ɪndˈʌldʒənt" });
  assert.deepEqual(wordRhymeCandidates({ syllableString: "ˈbʌldʒ", lookupLines, headword: "bulge" }), ["indulge", "divulge"]);
});

test("rule 2: every GA form is tried", () => {
  const lookupLines = lookup({ incurable: "ɪnkjˈʊɹəbəl,ɪnkjˈɝəbəl" });
  const lookupLines2 = lookup({ incurable: "ɪnkjˈɝəbəl,ɪnkjˈʊɹəbəl" });
  for (const l of [lookupLines, lookupLines2]) {
    assert.deepEqual(wordRhymeCandidates({ syllableString: "ˈdʊ.ɹə.bəl", lookupLines: l, headword: "durable" }), ["incurable"]);
  }
});

test("rule 3: the stressed onset must be non-empty and differ from the headword's", () => {
  const lookupLines = lookup({ ulge: "ˈʌldʒ", endurable: "ɛndˈʊɹəbəl", incurable: "ɪnkjˈʊɹəbəl" });
  assert.deepEqual(wordRhymeCandidates({ syllableString: "ˈbʌldʒ", lookupLines, headword: "bulge" }), []);
  assert.deepEqual(wordRhymeCandidates({ syllableString: "ˈdʊ.ɹə.bəl", lookupLines, headword: "durable" }), ["incurable"]);
});

test("rule 4: not the headword, not an inflection of it, not a word it is an inflection of, not a function word", () => {
  const lookupLines = lookup({ swelling: "swˈɛlɪŋ", swell: "swˈɛl", swellings: "swˈɛlɪŋz", dwelling: "dwˈɛlɪŋ" });
  assert.deepEqual(wordRhymeCandidates({ syllableString: "ˈswɛ.lɪŋ", lookupLines, headword: "swelling" }), ["dwelling"]);
  const lookupLines2 = lookup({ swell: "swˈɛl", swells: "swˈɛlz", dwells: "dwˈɛlz" });
  assert.deepEqual(wordRhymeCandidates({ syllableString: "ˈswɛlz", lookupLines: lookupLines2, headword: "swells" }), ["dwells"]);
  const lookupLines3 = lookup({ thus: "ðˈʌs", plus: "plˈʌs" });
  assert.deepEqual(wordRhymeCandidates({ syllableString: "ˈflʌs", lookupLines: lookupLines3, headword: "fluss" }), ["plus"]);
});

test("rule 4: the most frequent candidate at or above 5e-7 wins, with the tail", () => {
  const lookupLines = lookup({ indulge: "ɪndˈʌldʒ", divulge: "dɪvˈʌldʒ" });
  assert.deepEqual(wordRhymeFor({ syllableString: "ˈbʌldʒ", lookupLines, freqs: { indulge: 4e-6, divulge: 1e-6 }, headword: "bulge" }), {
    keyword: "indulge",
    frequency: 4e-6,
    tail: "ʌldʒ",
  });
  assert.deepEqual(
    wordRhymeFor({ syllableString: "ˈbʌldʒ", lookupLines, freqs: { indulge: 4.9e-7, divulge: 5e-7 }, headword: "bulge" }).keyword,
    "divulge"
  );
  assert.equal(wordRhymeFor({ syllableString: "ˈbʌldʒ", lookupLines, freqs: { indulge: 4.9e-7 }, headword: "bulge" }), null);
});
