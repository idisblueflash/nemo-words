// SP-052 report notes beyond the ACs, from Done when / the logic sketch / the
// open questions: dictionary-wide US IPA share, how many CMU anchors were
// inflections, and the measured ər-before-a-vowel rule.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/sp052-harness");

function fixture() {
  return {
    card: [["catsbee"], ["interest"], ["ladle"]],
    noad: [
      { word: "catsbee", ipas: ["ˈkætsˌbi"] },
      { word: "cat", ipas: ["kæt"] },
      { word: "bee", ipas: ["bi"] },
      { word: "interest", ipas: ["ˈɪnt(ə)rəst"] },
      { word: "in", ipas: ["ɪn"] },
      { word: "rest", ipas: ["rɛst"] },
      { word: "tour", ipas: ["tər"] }, // only the nucleus rule's tər matches this
      { word: "ladle", ipas: ["ˈleɪd(ə)l"] },
      { word: "nopron", ipas: [] },
      { word: "Proper", ipas: ["ˈprɑpər"] },
      { word: "wearily", kind: "der", ipas: ["-rəli"] },
      { word: "weariness", kind: "der", ipas: [] },
      { word: "weariless", kind: "der", ipas: ["ˈwɪrilɪs"] },
    ],
    cmu: { catsbee: "kˈætsbˌi", cats: "kˈæts", bee: "bˈi", interest: "ˈɪntɚəst", ladle: "lˈeɪdəl" },
    freqs: { cats: 9e-6, cat: 1e-5, bee: 3e-6, in: 1e-2, tour: 2e-5 },
  };
}

test("SP-052 report: the share of NOAD headwords and derivatives with a US IPA", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  const r = h.run();
  assert.equal(r.code, 0, r.stderr);
  const report = h.report();
  // lower-case a–z headwords: catsbee cat bee interest in rest tour ladle nopron = 9, 8 with IPA
  assert.match(report, /NOAD: 8 of 9 lower-case headwords \(88\.9%\) have a US IPA/);
  assert.match(report, /derivatives: 1 of 3 have their own full US IPA, 1 only a partial one, 1 none/);
  assert.match(report, /CMU: every entry has a US \(GA\) IPA/);
});

test("SP-052 report: how many CMU anchors were inflections (left out as keywords)", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  h.run();
  // catsbee's kæts would be anchored by cats if inflections counted
  assert.match(h.report(), /1 CMU syllable would have been anchored by an inflection \(cats\); 0 words lose their only anchor/);
});

test("SP-052 report: ər before a vowel — both rules measured, the rule picked and why", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  h.run();
  const report = h.report();
  assert.match(report, /ər before a vowel: 1 of 3 words/);
  // onset: ˈɪn.tə.rəst -> in only; nucleus: ˈɪn.tər.əst -> in, tour (+ catsbee bi=bee on both)
  assert.match(report, /onset rule.*NOAD anchors 2 words, 2 syllables/);
  assert.match(report, /nucleus rule.*NOAD anchors 2 words, 3 syllables/);
  assert.match(report, /Rule used: nucleus/);
  const row = h.detail().find((x) => x.word === "interest");
  assert.equal(row.noad_syllables, "ˈɪn.tər.əst");
});

test("SP-052 report: hand-written findings (--findings) go in just before the verdict", (t) => {
  const fs = require("node:fs");
  const path = require("node:path");
  const h = createHarness(fixture());
  t.after(h.cleanup);
  const findings = path.join(h.dir, "findings.md");
  fs.writeFileSync(findings, "## Findings\n\nNOAD has no inflected forms.\n");
  h.run(["--findings", findings]);
  const report = h.report();
  const at = report.indexOf("## Findings");
  assert.ok(at > 0 && at < report.indexOf("## Verdict"), "findings before the verdict");
  assert.match(report.trim().split("\n").at(-1), /^\*\*(Go|No-go)\*\*/);
});
