// SP-052 AC3: each word's anchors are found with one dictionary only — CMU IPA
// split by today's syllabify step, NOAD IPA by syllabify-noad — and each
// syllable gets the most frequent common word whose IPA in that same
// dictionary equals the syllable exactly (cut-off 5e-7); never the word itself.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/sp052-harness");
const { noadCandidateIndex, cmuCandidates, isInflection } = require("../spikes/sp-052/lib/anchors");
const { buildIndex, parseExtract } = require("../spikes/sp-052/lib/noad");
const { loadCmu } = require("../spikes/sp-052/lib/cmu");
const { noadLine } = require("./helpers/sp052-harness");

function fixture() {
  return {
    card: [["mistake"], ["catsbee"], ["miss"]],
    noad: [
      { word: "mistake", ipas: ["ˌmɪsˈteɪk"] },
      { word: "miss", ipas: ["mɪs"] },
      { word: "mis", ipas: ["mɪs"] }, // rarer homophone
      { word: "take", ipas: ["teɪk"] },
      { word: "catsbee", ipas: ["ˈkætsˌbi"] },
      { word: "cat", ipas: ["kæt"] },
      { word: "bee", ipas: ["bi"] },
      { word: "be", ipas: ["bi"] },
      { word: "Bea", ipas: ["bi"] }, // not a lower-case a–z headword
      { word: "Steak", ipas: ["steɪk"] },
    ],
    cmu: {
      mistake: "mɪstˈeɪk",
      miss: "mˈɪs",
      mis: "mˈɪs",
      take: "tˈeɪk",
      steak: "stˈeɪk",
      stake: "stˈeɪk",
      catsbee: "kˈætsbˌi",
      cats: "kˈæts",
      cat: "kˈæt",
      bee: "bˈi",
      be: "bˈi",
      mih: "mˈɪ", // CMU-only word
    },
    freqs: {
      miss: 2e-5,
      mis: 6e-7,
      take: 3e-4,
      steak: 4e-6,
      stake: 6e-6,
      cats: 9e-6,
      cat: 1e-5,
      bee: 3e-6,
      be: 4e-3,
      mih: 1e-6,
      mistake: 4e-5,
    },
  };
}

test("SP-052 AC3: NOAD and CMU anchors, each from its own syllable split and its own dictionary", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  const r = h.run();
  assert.equal(r.code, 0, r.stderr);
  const rows = Object.fromEntries(h.detail().map((x) => [x.word, x]));

  // NOAD's stress marks set the split; CMU's maximal onset gives mɪ.ˈsteɪk.
  assert.equal(rows.mistake.noad_syllables, "ˌmɪs.ˈteɪk");
  assert.equal(rows.mistake.noad_anchors, "mɪs=miss teɪk=take");
  assert.equal(rows.mistake.cmu_syllables, "mɪ.ˈsteɪk");
  // mih is the only CMU word sounding mɪ; stake beats steak on frequency.
  assert.equal(rows.mistake.cmu_anchors, "mɪ=mih steɪk=stake");
  assert.equal(rows.mistake.noad_anchored, "2/2");
  assert.equal(rows.mistake.cmu_anchored, "2/2");
});

test("SP-052 AC3: the word itself is never its own anchor", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  h.run();
  const miss = h.detail().find((x) => x.word === "miss");
  // miss is excluded; mis is next and clears the cut-off
  assert.equal(miss.noad_anchors, "mɪs=mis");
  assert.equal(miss.cmu_anchors, "mɪs=mis");
});

test("SP-052 AC3: inflections are never anchors, on either side", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  h.run();
  const row = h.detail().find((x) => x.word === "catsbee");
  // CMU: kæts.bi — cats is an inflection of cat, so kæts stays unanchored
  assert.equal(row.cmu_anchors, "kæts=- bi=be");
  assert.equal(row.cmu_anchored, "1/2");
  assert.equal(row.noad_anchors, "kæts=- bi=be");
});

const noadIdx = (rows) => buildIndex(parseExtract(rows.map(noadLine).join("\n")));

test("SP-052 AC3: NOAD candidates are lower-case a–z headwords and derivatives with their own full IPA", () => {
  const cands = noadCandidateIndex(
    noadIdx([
      { word: "take", ipas: ["teɪk"] },
      { word: "Taik", ipas: ["teɪk"] },
      { word: "re-take", ipas: ["teɪk"] },
      { word: "tayk", kind: "der", ipas: ["teɪk"] },
      { word: "teyk", kind: "der", ipas: ["-teɪk"] },
      { word: "which", ipas: ["(h)wɪtʃ"] },
    ])
  );
  assert.deepEqual(cands.get("teɪk"), ["take", "tayk"]);
  assert.deepEqual(cands.get("wɪtʃ"), ["which"]);
});

test("SP-052 AC3: a CMU candidate is an inflection when NOAD lacks it but has its regular base", () => {
  const heads = new Set(["cat", "walk", "stop", "try", "make", "big", "bed", "news"]);
  for (const w of ["cats", "walked", "walking", "stopped", "stopping", "tries", "tried", "making", "bigger", "biggest"]) {
    assert.equal(isInflection(w, heads), true, w);
  }
  for (const w of ["bed", "news", "dog", "bedding"]) assert.equal(isInflection(w, new Set(["bed", "news"])), w === "bedding", w);
  const cmu = loadCmu("cats\t\tkˈæts\nkats\t\tkˈæts\n");
  assert.deepEqual(cmuCandidates(cmu, "kæts", { isInflection: (w) => w === "cats" }), ["kats"]);
});
