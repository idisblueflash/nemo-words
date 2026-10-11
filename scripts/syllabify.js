#!/usr/bin/env node
"use strict";

// US-028 step `syllabify <ipa>` — splits a GA IPA string into syllables joined
// with `.`, stress taken from the input (CMU puts the stress mark right before
// the stressed vowel; here it moves to the start of that syllable).
//   syllabify ˈtraɪəl   -> ˈtraɪ.əl
//   syllabify dʒɚmˈeɪn  -> dʒɚ.ˈmeɪn
// Consonants between two vowels go to the later syllable as far as English
// allows them to start a syllable (maximal legal onset).

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const { runCli } = require("./card-lib");

const MULTI = ["aɪ", "aʊ", "ɔɪ", "eɪ", "oʊ", "tʃ", "dʒ"];
const VOWEL_CHARS = new Set([..."iɪeɛæɑɒɔoʊuʌəɚɝaɐɜɨ"]);
const STRESS = new Set(["ˈ", "ˌ"]);

// Legal English syllable onsets (r and ɹ both accepted).
const ONSETS = new Set(
  [
    "p b t d k g ɡ f v θ ð s z ʃ ʒ h m n l ɹ w j tʃ dʒ",
    "pl bl kl gl ɡl fl sl pɹ bɹ tɹ dɹ kɹ gɹ ɡɹ fɹ θɹ ʃɹ",
    "tw dw kw gw ɡw sw θw pj bj kj gj ɡj mj nj fj vj hj lj",
    "sp st sk sm sn sf spl spɹ stɹ skɹ skw spj skj",
  ]
    .join(" ")
    .split(/\s+/)
);

function isVowelSeg(seg) {
  return VOWEL_CHARS.has(seg[0]);
}

// Splits IPA into segments: { seg, vowel, stress } — stress only on vowels.
function segments(ipa) {
  const out = [];
  let pending = "";
  let i = 0;
  const s = ipa.replace(/\./g, "");
  while (i < s.length) {
    const ch = s[i];
    if (STRESS.has(ch)) {
      pending = ch;
      i++;
      continue;
    }
    let seg = MULTI.find((m) => s.startsWith(m, i)) || ch;
    i += seg.length;
    while (s[i] === "ː") seg += s[i++];
    const vowel = isVowelSeg(seg);
    out.push({ seg, vowel, stress: vowel ? pending : "" });
    if (vowel) pending = "";
  }
  return out;
}

function isOnset(segs) {
  return segs.length === 0 || ONSETS.has(segs.map((x) => x.seg.replace(/r/g, "ɹ")).join(""));
}

// Returns an array of syllables, each { onset: [segs], nucleus: seg, coda: [segs] }.
function syllables(ipa) {
  const segs = segments(ipa);
  const nuclei = segs.map((x, i) => (x.vowel ? i : -1)).filter((i) => i >= 0);
  if (nuclei.length === 0) return [{ onset: segs, nucleus: null, coda: [] }];
  const sylls = nuclei.map((n) => ({ onset: [], nucleus: segs[n], coda: [] }));
  sylls[0].onset = segs.slice(0, nuclei[0]);
  sylls[sylls.length - 1].coda = segs.slice(nuclei[nuclei.length - 1] + 1);
  for (let j = 0; j + 1 < nuclei.length; j++) {
    const between = segs.slice(nuclei[j] + 1, nuclei[j + 1]);
    let k = 0;
    while (!isOnset(between.slice(k))) k++;
    sylls[j].coda = between.slice(0, k);
    sylls[j + 1].onset = between.slice(k);
  }
  return sylls;
}

function syllableText(syl) {
  const stress = syl.nucleus ? syl.nucleus.stress : "";
  return stress + [...syl.onset, syl.nucleus, ...syl.coda].filter(Boolean).map((x) => x.seg).join("");
}

function syllabify(ipa) {
  return syllables(ipa).map(syllableText).join(".");
}

if (require.main === module) {
  runCli(([ipa]) => {
    if (!ipa) throw new Error("usage: syllabify <ipa>");
    return { lines: [syllabify(ipa)] };
  });
}

module.exports = { syllabify, syllables, segments };
