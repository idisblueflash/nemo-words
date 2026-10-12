#!/usr/bin/env node
"use strict";

// SP-052 step `syllabify-noad <ipa>` — splits a canonical NOAD IPA string into
// syllables joined with `.` (EN-036 step contract: result on stdout, exit 0;
// 2 on error). A prototype for US-053 to promote.
//
// NOAD puts its stress marks at syllable starts (ˈmɪsˌteɪk: the boundary is
// before t), unlike CMU, which puts them before the vowel. So a stress mark is
// a fixed boundary, never moved; only the unstressed stretches between marks
// are split, each by today's maximal-legal-onset syllabifier
// (scripts/syllabify.js).
//   syllabify-noad ˈmɪsˌteɪk  -> ˈmɪs.ˌteɪk
//   syllabify-noad ˌætʃɪˈɑdi  -> ˌæ.tʃɪ.ˈɑ.di
//
// NOAD writes the r-coloured vowel as ər. Before a vowel inside a stretch
// (ˈɪntərəst) it can go two ways: `onset` (default) gives the r to the next
// syllable like any consonant (ˈɪn.tə.rəst); `nucleus` keeps ər as one vowel
// (ˈɪn.tər.əst). SP-052's report measures both; see spikes/sp-052/report.md.

if (require.main === module) require("../../scripts/lib/step-contract"); // a crash exits 2, never 1
const { runCli } = require("../../scripts/card-lib");
const { syllabify } = require("../../scripts/syllabify");

const ER_BEFORE_VOWEL = /ər(?=[iɪeɛæɑɒɔoʊuʌəɚɝaɐɜ])/g;
const RHOTIC = "ɚ"; // stand-in: never in NOAD, a single vowel to syllabify.js

// The stretches a NOAD string's stress marks cut it into: ˌætʃɪˈɑdi -> ˌætʃɪ, ˈɑdi.
const stretches = (ipa) => String(ipa).split(/(?=[ˈˌ])/).filter(Boolean);

function syllabifyStretch(stretch, er) {
  if (er !== "nucleus") return syllabify(stretch);
  return syllabify(stretch.replace(ER_BEFORE_VOWEL, RHOTIC)).replace(new RegExp(RHOTIC, "g"), "ər");
}

function syllabifyNoad(ipa, { er = "onset" } = {}) {
  return stretches(ipa)
    .map((s) => syllabifyStretch(s, er))
    .join(".");
}

// How many ər-before-a-vowel spots the rule decides (none across a stress mark).
function erBeforeVowelCount(ipa) {
  return stretches(ipa).reduce((n, s) => n + (s.match(ER_BEFORE_VOWEL) || []).length, 0);
}

if (require.main === module) {
  runCli(([ipa]) => {
    if (!ipa) throw new Error("usage: syllabify-noad <ipa>");
    return { lines: [syllabifyNoad(ipa)] };
  });
}

module.exports = { syllabifyNoad, erBeforeVowelCount };
