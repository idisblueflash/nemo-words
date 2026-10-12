// SP-052 AC1: the word set — card rows + log words + a seeded sample, merged,
// each word once with its sources; word-part rows and personal names left out.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/sp052-harness");

function fixture(extra = {}) {
  return {
    card: [
      ["cat"],
      ["dog"],
      ["Quebec"],
      ["colon (intestine)"],
      ["-nomy", "<i>Greek</i>", "medical-word-parts"],
    ],
    log: ["dog", "hepat-", "sun", "sun"],
    noad: [
      { word: "cat", ipas: ["kæt"] },
      { word: "dog", ipas: ["dɔɡ"] },
      { word: "sun", ipas: ["sən"] },
      { word: "colon", ipas: ["ˈkoʊlən"] },
      { word: "tree", ipas: ["tri"] },
      { word: "house", ipas: ["haʊs"] },
      { word: "river", ipas: ["ˈrɪvər"] },
      { word: "rare", ipas: ["rɛr"] },
    ],
    cmu: {
      cat: "kˈæt",
      dog: "dˈɔɡ",
      sun: "sˈʌn",
      colon: "kˈoʊlən",
      tree: "tɹˈi",
      house: "hˈaʊs",
      river: "ɹˈɪvɚ",
      rare: "ɹˈɛɹ",
    },
    freqs: { cat: 1e-5, dog: 1e-5, sun: 1e-5, tree: 1e-5, house: 1e-4, river: 1e-5, rare: 1e-8 },
    sampleSize: 2,
    seed: 7,
    ...extra,
  };
}

test("SP-052 AC1: duplicates are merged and each word is listed once with its sources", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  const r = h.run();
  assert.equal(r.code, 0, r.stderr);

  const rows = h.detail();
  const words = rows.map((x) => x.word);
  assert.equal(new Set(words).size, words.length, "each word listed once");
  const byWord = Object.fromEntries(rows.map((x) => [x.word, x.sources]));
  assert.equal(byWord.cat, "card");
  assert.equal(byWord.dog, "card,log");
  assert.equal(byWord.colon, "card");
  assert.equal(byWord.sun, "log");

  // Two sampled words, from words in both dictionaries at or above the cut-off,
  // never one already in the set.
  const sampled = rows.filter((x) => x.sources === "sample").map((x) => x.word);
  assert.equal(sampled.length, 2);
  for (const w of sampled) assert.ok(["tree", "house", "river"].includes(w), `${w} is a frequent word in both`);
  assert.match(h.report(), /seed 7/i);
});

test("SP-052 AC1: word-part rows and personal names are left out, and the report says so", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  const r = h.run();
  assert.equal(r.code, 0, r.stderr);

  const words = h.detail().map((x) => x.word);
  for (const w of ["-nomy", "hepat-", "Quebec", "quebec"]) assert.ok(!words.includes(w), `${w} left out`);
  const report = h.report();
  assert.match(report, /-nomy.*word part/i);
  assert.match(report, /hepat-.*word part/i);
  assert.match(report, /Quebec.*name/i);
  // raw row counts, before names are left out and duplicates merged
  assert.match(report, /card file: 4 whole-word rows/);
  assert.match(report, /mnemonic log: 3 whole-word rows/);
});

test("SP-052 AC1: the same seed draws the same sample", (t) => {
  const a = createHarness(fixture());
  const b = createHarness(fixture());
  t.after(a.cleanup);
  t.after(b.cleanup);
  a.run();
  b.run();
  const sample = (h) => h.detail().filter((x) => x.sources === "sample").map((x) => x.word);
  assert.deepEqual(sample(a), sample(b));
});
