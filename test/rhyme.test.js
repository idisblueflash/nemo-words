// US-046: the rhyme rules of scripts/lib/rhyme.js (pure, no I/O).

const test = require("node:test");
const assert = require("node:assert/strict");
const { rhymeFor, rhymeCandidates, rimeOf, FUNCTION_WORDS } = require("../scripts/lib/rhyme");

// `word\tRP\tGA[,GA…]` lines, as `nemo-words ipa-lookup --ga <rime>` prints them.
const lookup = (dict) => Object.entries(dict).map(([w, ga]) => `${w}\t\t${ga}`).join("\n") + "\n";

test("rhyme: the rime is the nucleus plus coda, stress ignored", () => {
  assert.equal(rimeOf("ˈdɹaʊn"), "aʊn");
  assert.equal(rimeOf("tik"), "ik");
  assert.equal(rimeOf("stu"), "u");
});

test("rhyme: the most frequent word with the same rime wins", () => {
  const lookupLines = lookup({ down: "dˈaʊn", town: "tˈaʊn", gown: "ɡˈaʊn" });
  const freqs = { down: 5e-4, town: 1e-4, gown: 3e-6 };
  assert.deepEqual(rhymeFor({ chunkIpa: "dɹaʊn", lookupLines, freqs }), { keyword: "down", frequency: 5e-4 });
});

test("rhyme: a word with more than one syllable is not a rhyme", () => {
  const lookupLines = lookup({ downtown: "dˈaʊntˈaʊn", town: "tˈaʊn" });
  const freqs = { downtown: 9e-4, town: 1e-4 };
  assert.deepEqual(rhymeFor({ chunkIpa: "dɹaʊn", lookupLines, freqs }), { keyword: "town", frequency: 1e-4 });
});

test("rhyme: a word whose rime differs (only contains the rime) is not a rhyme", () => {
  const lookupLines = lookup({ downs: "dˈaʊnz", town: "tˈaʊn" });
  const freqs = { downs: 9e-4, town: 1e-4 };
  assert.deepEqual(rhymeFor({ chunkIpa: "dɹaʊn", lookupLines, freqs }), { keyword: "town", frequency: 1e-4 });
});

test("rhyme: a word with no onset is not a rhyme (own-type vowel-first words)", () => {
  const lookupLines = lookup({ ooh: "ˈu", two: "tˈu" });
  const freqs = { ooh: 9e-4, two: 1e-4 };
  assert.deepEqual(rhymeFor({ chunkIpa: "stu", lookupLines, freqs }), { keyword: "two", frequency: 1e-4 });
});

test("rhyme: the headword is never its own rhyme", () => {
  const lookupLines = lookup({ drown: "dɹˈaʊn", town: "tˈaʊn" });
  const freqs = { drown: 9e-4, town: 1e-4 };
  assert.deepEqual(rhymeFor({ chunkIpa: "dɹaʊn", lookupLines, freqs, exclude: ["drown"] }), {
    keyword: "town",
    frequency: 1e-4,
  });
});

test("rhyme: a word below the exact-keyword frequency limit (5e-7) is not a rhyme; none left -> null", () => {
  const lookupLines = lookup({ gown: "ɡˈaʊn", town: "tˈaʊn" });
  assert.deepEqual(rhymeFor({ chunkIpa: "dɹaʊn", lookupLines, freqs: { gown: 5e-7, town: 4.9e-7 } }), {
    keyword: "gown",
    frequency: 5e-7,
  });
  assert.equal(rhymeFor({ chunkIpa: "dɹaʊn", lookupLines, freqs: { town: 4.9e-7 } }), null);
});

test("rhyme: any GA variant can rhyme; r and ɹ count alike", () => {
  const lookupLines = lookup({ crown: "kɹˈaʊn,kɹˈaʊnd" });
  assert.deepEqual(rhymeFor({ chunkIpa: "dɹaʊn", lookupLines, freqs: { crown: 1e-5 } }), {
    keyword: "crown",
    frequency: 1e-5,
  });
  const lookupLines2 = lookup({ car: "kˈɑɹ" });
  assert.deepEqual(rhymeFor({ chunkIpa: "stɑr", lookupLines: lookupLines2, freqs: { car: 1e-4 } }).keyword, "car");
});

test("rhyme: rhymeCandidates lists only the one-syllable, onset, same-rime words (what word-freq is asked about)", () => {
  const lookupLines = lookup({ down: "dˈaʊn", downtown: "dˈaʊntˈaʊn", downs: "dˈaʊnz", drown: "dɹˈaʊn", "o'down": "oʊdˈaʊn" });
  assert.deepEqual(rhymeCandidates({ chunkIpa: "dɹaʊn", lookupLines, exclude: ["drown"] }), ["down"]);
});

test("rhyme: a function word is never a rhyme, even with an onset", () => {
  const lookupLines = "thus\t\tðˈʌs\nplus\t\tplˈʌs\n";
  assert.deepEqual(rhymeFor({ chunkIpa: "flʌs", lookupLines, freqs: { thus: 3e-4, plus: 2e-4 } }), {
    keyword: "plus",
    frequency: 2e-4,
  });
  assert.equal(rhymeFor({ chunkIpa: "flʌs", lookupLines: "thus\t\tðˈʌs\n", freqs: { thus: 3e-4 } }), null);
});

test("rhyme: FunctionWords covers pronouns, articles, prepositions, conjunctions, auxiliaries and words like 'thus'", () => {
  for (const w of ["he", "she", "they", "them", "us", "the", "an", "to", "for", "from", "with", "and", "but", "nor", "was", "were", "has", "does", "can", "will", "would", "should", "must", "thus"]) {
    assert.ok(FUNCTION_WORDS.has(w), w);
  }
  for (const w of ["plus", "down", "speak", "catch", "bus"]) assert.ok(!FUNCTION_WORDS.has(w), w);
});
