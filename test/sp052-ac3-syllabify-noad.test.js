// SP-052 AC3: the NOAD syllabifier — never moves a boundary a NOAD stress
// mark sets, splits only the unstressed stretches between them. A step CLI
// (`syllabify-noad <ipa>`, EN-036's step contract) so US-053 can promote it.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { repoRoot } = require("./helpers/sp052-harness");
const { syllabifyNoad, erBeforeVowelCount } = require("../spikes/sp-052/syllabify-noad");

const CLI = path.join(repoRoot, "spikes", "sp-052", "syllabify-noad.js");

test("SP-052 AC3: a NOAD stress mark is a syllable boundary, even where a longer onset is legal", () => {
  // Maximal onset alone would give mɪ.steɪk; NOAD puts the boundary before t.
  assert.equal(syllabifyNoad("ˈmɪsˌteɪk"), "ˈmɪs.ˌteɪk");
  assert.equal(syllabifyNoad("ˈæsˌpɛkt"), "ˈæs.ˌpɛkt");
  assert.equal(syllabifyNoad("kæt"), "kæt");
});

test("SP-052 AC3: the unstressed stretches between stress marks are split by maximal legal onset", () => {
  assert.equal(syllabifyNoad("ˌætʃɪˈɑdi"), "ˌæ.tʃɪ.ˈɑ.di");
  assert.equal(syllabifyNoad("ˈhæpəli"), "ˈhæ.pə.li");
  assert.equal(syllabifyNoad("əˈbændən"), "ə.ˈbæn.dən");
  // the stretch before the first stress mark keeps its own boundary too
  assert.equal(syllabifyNoad("ɪnˈtɛnt"), "ɪn.ˈtɛnt");
});

test("SP-052 AC3: ər before a vowel — both rules are available, onset is the default", () => {
  assert.equal(syllabifyNoad("ˈɪntərəst"), "ˈɪn.tə.rəst");
  assert.equal(syllabifyNoad("ˈɪntərəst", { er: "nucleus" }), "ˈɪn.tər.əst");
  // ər before a consonant or at the end is unaffected by the rule
  assert.equal(syllabifyNoad("ˈrɛkərd", { er: "nucleus" }), "ˈrɛ.kərd");
  assert.equal(erBeforeVowelCount("ˈɪntərəst"), 1);
  assert.equal(erBeforeVowelCount("ˈrɛkərd"), 0);
  // across a stress mark the boundary is NOAD's, so it doesn't count
  assert.equal(erBeforeVowelCount("əˈraɪv"), 0);
});

test("SP-052 AC3: syllabify-noad is a step CLI: result on stdout, exit 0; no IPA is an error, exit 2", () => {
  const ok = spawnSync(process.execPath, [CLI, "ˈmɪsˌteɪk"], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout, "ˈmɪs.ˌteɪk\n");
  const bad = spawnSync(process.execPath, [CLI], { encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /usage: syllabify-noad <ipa>/);
});
