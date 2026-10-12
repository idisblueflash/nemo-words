// SP-052 AC5: a word in only one dictionary, or whose NOAD entry has no US
// IPA, counts as unanchored for the dictionary that lacks it, and the report
// lists these words separately with their reason. Also: a missing extract
// stops the spike (exit 2) with how to build it.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/sp052-harness");

function fixture() {
  return {
    card: [["zyx"], ["xyst"], ["wearily"], ["qwop"], ["cat"]],
    noad: [
      { word: "xyst", ipas: [], respell: true }, // respelling, no IPA
      { word: "wearily", kind: "der", ipas: ["-rəli"] }, // partial derivative IPA only
      { word: "qwop", ipas: ["kwɑp"] },
      { word: "cat", ipas: ["kæt"] },
      { word: "kat", ipas: ["kæt"] },
      { word: "zicks", ipas: ["zɪks"] },
    ],
    cmu: { zyx: "zˈɪks", zicks: "zˈɪks", xyst: "zˈɪst", wearily: "wˈɪɹəli", cat: "kˈæt", kat: "kˈæt", fist: "fˈɪst" },
    freqs: { zicks: 1e-6, kat: 1e-6 },
  };
}

function list(report, heading) {
  const lines = report.split("\n");
  const start = lines.findIndex((l) => l.startsWith("## ") && heading.test(l));
  assert.ok(start >= 0, `no section ${heading}`);
  const out = [];
  for (const l of lines.slice(start + 1)) {
    if (l.startsWith("## ")) break;
    if (l.startsWith("- ")) out.push(l.slice(2));
  }
  return out;
}

test("SP-052 AC5: a word a dictionary lacks counts as unanchored for that dictionary", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  const r = h.run();
  assert.equal(r.code, 0, r.stderr);
  const rows = Object.fromEntries(h.detail().map((x) => [x.word, x]));
  // zyx: CMU has it and anchors it (zicks); NOAD has no zyx at all.
  assert.equal(rows.zyx.cmu_anchored, "1/1");
  assert.equal(rows.zyx.noad_anchored, "0/0");
  assert.equal(rows.qwop.cmu_anchored, "0/0");
  const total = h.report().split("\n").find((l) => l.startsWith("| total |"));
  // words with an anchor: NOAD cat only (1/5); CMU zyx, cat (2/5)
  assert.match(total, /\| 1\/5 \(20\.0%\) \| 2\/5 \(40\.0%\) \|$/);
});

test("SP-052 AC5: the report lists the words each dictionary lacks, with the reason", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  h.run();
  const report = h.report();
  assert.deepEqual(list(report, /no US IPA in NOAD/i), [
    "zyx: not in NOAD",
    "xyst: respelling but no US IPA",
    "wearily: derivative without its own full IPA",
  ]);
  assert.deepEqual(list(report, /no US IPA in CMU/i), ["qwop: not in CMU"]);
});

test("SP-052 AC5 (edge): the extract is missing — exit 2, and how to run extract.py", (t) => {
  const h = createHarness({ ...fixture(), noad: null });
  t.after(h.cleanup);
  const r = h.run();
  assert.equal(r.code, 2);
  assert.match(r.stderr, /python3 dictionaries\/noad\/extract\.py/);
  assert.equal(h.report(), null, "no report is written");
});
