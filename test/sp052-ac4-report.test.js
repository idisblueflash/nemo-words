// SP-052 AC4: the spike report — per source and in total, NOAD and CMU side by
// side; words anchored by one dictionary only; split differences where the
// IPA is the same; and a go / no-go for E07 at the end.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/sp052-harness");
const { verdict } = require("../spikes/sp-052/lib/report");

function fixture() {
  return {
    card: [["mistake"], ["bobcat"], ["ladle"], ["zyx"], ["xyst"]],
    log: ["qwop", "mistake"],
    noad: [
      { word: "mistake", ipas: ["ˌmɪsˈteɪk"] },
      { word: "miss", ipas: ["mɪs"] },
      { word: "take", ipas: ["teɪk"] },
      { word: "bobcat", ipas: ["ˈbɑbˌkæt"] },
      { word: "bob", ipas: ["bɑb"] },
      { word: "cat", ipas: ["kæt"] },
      { word: "ladle", ipas: ["ˈleɪd(ə)l"] },
      { word: "xyst", ipas: [], respell: true },
      { word: "qwop", ipas: ["kwɑp"] },
    ],
    cmu: {
      mistake: "mɪstˈeɪk",
      stake: "stˈeɪk",
      bobcat: "bˈɑbkˌæt",
      ladle: "lˈeɪdəl",
      lay: "lˈeɪ",
      zyx: "zˈɪks",
      xyst: "zˈɪst",
    },
    freqs: { miss: 2e-5, take: 3e-4, stake: 6e-6, bob: 2e-6, cat: 1e-5, lay: 5e-5 },
  };
}

// The cells of the results-table row whose first cell is `label`.
function row(report, label) {
  const line = report.split("\n").find((l) => l.startsWith(`| ${label} |`));
  assert.ok(line, `no table row for ${label}`);
  return line.split("|").slice(1, -1).map((c) => c.trim());
}

// The bullet list under the heading that matches `heading`.
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

test("SP-052 AC4: per source and in total, US IPA, anchored syllables and anchored words, NOAD and CMU side by side", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  const r = h.run();
  assert.equal(r.code, 0, r.stderr);
  const report = h.report();

  const header = report.split("\n").find((l) => l.startsWith("| Source |"));
  assert.match(header, /US IPA NOAD \| US IPA CMU \| Anchored syllables NOAD \| Anchored syllables CMU \| Words with an anchor NOAD \| Words with an anchor CMU/);

  // total: 6 words; NOAD IPA for 4 (not zyx, xyst), CMU for 5 (not qwop).
  // syllables: NOAD mistake 2/2, bobcat 2/2, ladle 0/2, qwop 0/1 = 4/7;
  //            CMU mistake 1/2, bobcat 0/2, ladle 1/2, zyx 0/1, xyst 0/1 = 2/8.
  assert.deepEqual(row(report, "total"), ["total", "6", "4/6 (66.7%)", "5/6 (83.3%)", "4/7 (57.1%)", "2/8 (25.0%)", "2/6 (33.3%)", "2/6 (33.3%)"]);
  assert.deepEqual(row(report, "card").slice(0, 4), ["card", "5", "3/5 (60.0%)", "5/5 (100.0%)"]);
  assert.deepEqual(row(report, "log").slice(0, 4), ["log", "2", "2/2 (100.0%)", "1/2 (50.0%)"]);
  assert.deepEqual(row(report, "sample").slice(0, 2), ["sample", "0"]);
});

test("SP-052 AC4: the report lists each word anchored by one dictionary and not the other", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  h.run();
  const report = h.report();
  assert.deepEqual(list(report, /anchored with NOAD only/i), ["bobcat"]);
  assert.deepEqual(list(report, /anchored with CMU only/i), ["ladle"]);
});

test("SP-052 AC4: where both dictionaries give the same IPA, split differences are counted and listed", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  h.run();
  const report = h.report();
  // same IPA: mistake (mɪs.teɪk vs mɪ.steɪk: differs), bobcat, ladle (same split)
  assert.match(report, /1 of 3 words with the same IPA in both dictionaries are split differently/);
  assert.deepEqual(list(report, /split differently/i), ["mistake"]);
});

test("SP-052 AC4: the report ends with a go or no-go for E07 against the 95% bar", (t) => {
  const h = createHarness(fixture());
  t.after(h.cleanup);
  h.run();
  const lines = h.report().trim().split("\n");
  const last = lines.at(-1);
  assert.match(last, /^\*\*Go\*\* for E07/);
  assert.match(last, /NOAD anchors 2 words, CMU 2: 100\.0% of CMU's \(bar: at least 95%\)/);
});

test("SP-052 AC4: the verdict is go at 95% of CMU's anchored words or more, else no-go", () => {
  assert.equal(verdict(95, 100).go, true);
  assert.equal(verdict(94, 100).go, false);
  assert.equal(verdict(120, 100).go, true);
  assert.equal(verdict(0, 0).go, true);
});
