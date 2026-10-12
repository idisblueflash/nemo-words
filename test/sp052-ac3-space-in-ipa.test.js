// SP-052 AC3 (bug-011): a space inside a raw NOAD IPA ("pər ˈsɛnt") is not
// part of a sound, so it must not stay in a syllable ("pər ") and break the
// exact match with NOAD's own "per" /pər/.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/sp052-harness");
const { canonicalNoad } = require("../spikes/sp-052/lib/noad");

test("SP-052 AC3: canonical NOAD IPA drops a space", () => {
  assert.equal(canonicalNoad("pər ˈsɛnt"), "pərˈsɛnt");
  assert.equal(canonicalNoad(" kæt "), "kæt");
});

test("SP-052 AC3: a word whose NOAD IPA has a space is anchored on every syllable", (t) => {
  const h = createHarness({
    card: [["percent"]],
    noad: [
      { word: "percent", ipas: ["pər ˈsɛnt"] },
      { word: "per", ipas: ["pər"] },
      { word: "sent", ipas: ["sɛnt"] },
    ],
    cmu: { percent: "pɚsˈɛnt", per: "pˈɚ", sent: "sˈɛnt" },
    freqs: { percent: 1e-4, per: 1.5e-4, sent: 1e-4 },
  });
  t.after(h.cleanup);
  const r = h.run();
  assert.equal(r.code, 0, r.stderr);
  const row = h.detail().find((x) => x.word === "percent");
  assert.equal(row.noad_syllables, "pər.ˈsɛnt");
  assert.equal(row.noad_anchors, "pər=per sɛnt=sent");
  assert.equal(row.noad_anchored, "2/2");
});
