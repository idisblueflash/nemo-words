// SP-052 AC2: each word is looked up in NOAD and CMU; whether each has a US
// IPA is recorded, and the NOAD IPA is kept raw next to its canonical form
// (brackets dropped, the bracketed sound kept, except (h) before w).

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/sp052-harness");
const { canonicalNoad, lookupNoad } = require("../spikes/sp-052/lib/noad");
const { buildIndex, parseExtract } = require("../spikes/sp-052/lib/noad");
const { noadLine } = require("./helpers/sp052-harness");

test("SP-052 AC2: canonical NOAD IPA keeps a bracketed sound and drops only the brackets", () => {
  assert.equal(canonicalNoad("ˈɪnt(ə)rəst"), "ˈɪntərəst");
  assert.equal(canonicalNoad("ˈbʌt(ə)n"), "ˈbʌtən");
  assert.equal(canonicalNoad("kæt"), "kæt");
});

test("SP-052 AC2: canonical NOAD IPA drops (h) before w", () => {
  assert.equal(canonicalNoad("(h)wɪtʃ"), "wɪtʃ");
  assert.equal(canonicalNoad("ˈɛvriˌ(h)wɛr"), "ˈɛvriˌwɛr");
  // (h) not before w is kept like any bracketed sound
  assert.equal(canonicalNoad("ˈvɛ(h)ɪkəl"), "ˈvɛhɪkəl");
});

const index = (rows) => buildIndex(parseExtract(rows.map(noadLine).join("\n")));

test("SP-052 AC2: when NOAD gives several US IPAs (or homographs), the first is used", () => {
  const idx = index([
    { word: "lead", hom: "1", ipas: ["lid"] },
    { word: "lead", hom: "2", ipas: ["lɛd"] },
    { word: "interest", ipas: ["ˈɪnt(ə)rəst", "ˈɪnˌtrɛst"] },
  ]);
  const lead = lookupNoad(idx, "lead");
  assert.equal(lead.hasUsIpa, true);
  assert.equal(lead.rawIpa, "lid");
  assert.deepEqual(lead.variants, ["lid", "lɛd"]);
  assert.equal(lookupNoad(idx, "interest").canonicalIpa, "ˈɪntərəst");
});

test("SP-052 AC2: a word NOAD lists only as a derivative uses the derivative's own full IPA", () => {
  const idx = index([
    { word: "weariless", kind: "der", ipas: ["ˈwɪrilɪs"] },
    { word: "wearily", kind: "der", ipas: ["-rəli"] },
  ]);
  assert.equal(lookupNoad(idx, "weariless").rawIpa, "ˈwɪrilɪs");
  const partial = lookupNoad(idx, "wearily");
  assert.equal(partial.hasUsIpa, false);
});

test("SP-052 AC2: the detail file records US IPA per dictionary, NOAD raw next to canonical", (t) => {
  const h = createHarness({
    card: [["which"], ["interest"], ["zyx"], ["cat"]],
    noad: [
      { word: "which", ipas: ["(h)wɪtʃ"] },
      { word: "interest", ipas: ["ˈɪnt(ə)rəst", "ˈɪnˌtrɛst"] },
    ],
    cmu: { which: "wˈɪtʃ,hwˈɪtʃ", interest: "ˈɪntɚəst", cat: "kˈæt" },
    freqs: {},
  });
  t.after(h.cleanup);
  const r = h.run();
  assert.equal(r.code, 0, r.stderr);
  const rows = Object.fromEntries(h.detail().map((x) => [x.word, x]));

  assert.equal(rows.which.noad_us_ipa, "yes");
  assert.equal(rows.which.noad_raw, "(h)wɪtʃ");
  assert.equal(rows.which.noad_canonical, "wɪtʃ");
  assert.equal(rows.which.cmu_us_ipa, "yes");
  assert.equal(rows.which.cmu_ipa, "wˈɪtʃ");

  assert.equal(rows.interest.noad_raw, "ˈɪnt(ə)rəst");
  assert.equal(rows.interest.noad_canonical, "ˈɪntərəst");

  assert.equal(rows.cat.noad_us_ipa, "no");
  assert.equal(rows.cat.cmu_us_ipa, "yes");
  assert.equal(rows.zyx.noad_us_ipa, "no");
  assert.equal(rows.zyx.cmu_us_ipa, "no");
});
