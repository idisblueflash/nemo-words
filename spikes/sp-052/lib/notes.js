"use strict";

// SP-052 report notes beyond the ACs: dictionary-wide US IPA share (Done
// when), the CMU anchors that were inflections (logic sketch), and the
// measured rule for ər before a vowel (open question). Counts only.

const { isFullIpa, canonicalNoad } = require("./noad");
const { erBeforeVowelCount } = require("../syllabify-noad");

const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");
const anchoredCount = (anchors) => anchors.filter((a) => a.keyword).length;

function coverageNote(noad, results) {
  const heads = new Map(); // word -> has a full IPA (any homograph)
  const ders = new Map(); // word -> "full" | "partial" | "none"
  const rank = { none: 0, partial: 1, full: 2 };
  for (const e of noad.entries) {
    if (!/^[a-z]+$/.test(e.word)) continue;
    if (e.kind === "hw") heads.set(e.word, heads.get(e.word) || e.ipas.some(isFullIpa));
    if (e.kind === "der") {
      const kind = e.ipas.some(isFullIpa) ? "full" : e.ipas.length ? "partial" : "none";
      if (!ders.has(e.word) || rank[kind] > rank[ders.get(e.word)]) ders.set(e.word, kind);
    }
  }
  const withIpa = [...heads.values()].filter(Boolean).length;
  const dCount = (k) => [...ders.values()].filter((v) => v === k).length;
  const derMissing = results.filter((r) => /^derivative/.test(r.noad.reason || "")).map((r) => r.word);
  return [
    "## Dictionary coverage",
    "",
    `- NOAD: ${withIpa} of ${heads.size} lower-case headwords (${pct(withIpa, heads.size)}) have a US IPA; ` +
      `derivatives: ${dCount("full")} of ${ders.size} have their own full US IPA, ${dCount("partial")} only a partial one, ${dCount("none")} none.`,
    "- CMU: every entry has a US (GA) IPA, by construction.",
    "",
    "Derivatives without their own full IPA get none by rule (the default kept): they are left out as keywords, " +
      `and a set word NOAD lists only that way has no NOAD IPA (${derMissing.length} in the set${
        derMissing.length ? `: ${derMissing.join(", ")}` : ""
      }).`,
  ];
}

function inflectionNote(results) {
  let syllables = 0;
  const words = new Set();
  let lost = 0;
  for (const r of results) {
    r.cmu.anchors.forEach((a, i) => {
      const w = r.cmu.anchorsWithInflections[i];
      if (w.keyword && w.keyword !== a.keyword) {
        syllables++;
        words.add(w.keyword);
      }
    });
    if (anchoredCount(r.cmu.anchors) === 0 && anchoredCount(r.cmu.anchorsWithInflections) > 0) lost++;
  }
  return [
    "## Inflections",
    "",
    "Inflections are left out as keywords on both sides (NOAD has no inflection entries until US-055). A CMU word " +
      "counts as an inflection when NOAD has no entry for it but has a headword it regularly inflects.",
    "",
    `${syllables} CMU syllable${syllables === 1 ? "" : "s"} would have been anchored by an inflection (${[...words].sort().join(", ")}); ` +
      `${lost} words lose their only anchor to this rule.`,
  ];
}

const ruleTotals = (results) => ({
  words: results.filter((r) => anchoredCount(r.noad.anchors) > 0).length,
  syllables: results.reduce((n, r) => n + anchoredCount(r.noad.anchors), 0),
});

// More NOAD-anchored words wins, then more anchored syllables; a tie keeps onset.
function pickErRule(study) {
  const a = ruleTotals(study.onset);
  const b = ruleTotals(study.nucleus);
  if (b.words > a.words || (b.words === a.words && b.syllables > a.syllables)) return "nucleus";
  return "onset";
}

function erNote({ study, rule, noad }) {
  const withIpa = study.onset.filter((r) => r.noad.hasUsIpa);
  const hit = withIpa.filter((r) => erBeforeVowelCount(r.noad.canonicalIpa) > 0);
  const spots = hit.reduce((n, r) => n + erBeforeVowelCount(r.noad.canonicalIpa), 0);
  let heads = 0;
  let headHits = 0;
  const seen = new Set();
  for (const e of noad.entries) {
    if (e.kind !== "hw" || !/^[a-z]+$/.test(e.word) || seen.has(e.word)) continue;
    const ipa = e.ipas.find(isFullIpa);
    if (!ipa) continue;
    seen.add(e.word);
    heads++;
    if (erBeforeVowelCount(canonicalNoad(ipa)) > 0) headHits++;
  }
  const line = (name) => {
    const t = ruleTotals(study[name]);
    return `- ${name} rule (${name === "onset" ? "ˈɪn.tə.rəst" : "ˈɪn.tər.əst"}): NOAD anchors ${t.words} words, ${t.syllables} syllables.`;
  };
  const changed = study.onset.filter(
    (r, i) => anchoredCount(r.noad.anchors) !== anchoredCount(study.nucleus[i].noad.anchors)
  );
  return [
    "## ər before a vowel (open question)",
    "",
    `ər before a vowel: ${hit.length} of ${withIpa.length} words with a NOAD IPA in the set (${spots} spots); ` +
      `across NOAD's lower-case headwords with a US IPA: ${headHits} of ${heads} (${pct(headHits, heads)}).`,
    "",
    line("onset"),
    line("nucleus"),
    "",
    `Words whose anchored-syllable count changes with the rule: ${changed.length}${
      changed.length ? ` (${changed.map((r) => r.word).join(", ")})` : ""
    }.`,
    "",
    `Rule used: ${rule} (more NOAD-anchored words wins, then more anchored syllables; a tie keeps onset, ` +
      "the same maximal-onset split today's syllabify step gives every other consonant).",
  ];
}

module.exports = { coverageNote, inflectionNote, erNote, pickErRule };
