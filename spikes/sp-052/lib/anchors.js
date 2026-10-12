"use strict";

// SP-052 AC3: a word's exact sound anchors with one dictionary only, the way
// the card pipeline's find-keywords step picks them today: one chunk per
// syllable (scripts/chunk.js), keyword candidates whose IPA in that same
// dictionary equals the chunk exactly (ipaKey), the most frequent one at or
// above FREQ_THRESHOLD wins (find-keywords' pickKeyword), never the headword.
// No rhyme fallback: the spike compares exact anchors only.

const { ipaKey } = require("../../../scripts/card-lib");
const { chunk } = require("../../../scripts/chunk");
const { exactMatches, pickKeyword } = require("../../../scripts/find-keywords");
const { canonicalNoad, isFullIpa } = require("./noad");

// NOAD keyword candidates: lower-case a–z headwords and derivatives with their
// own full IPA, every variant (and homograph) in canonical form.
// -> Map ipaKey -> [word…] in extract order.
function noadCandidateIndex(index) {
  const out = new Map();
  for (const e of index.entries) {
    if (!/^[a-z]+$/.test(e.word)) continue;
    for (const ipa of e.ipas.filter(isFullIpa)) {
      const k = ipaKey(canonicalNoad(ipa));
      if (!out.has(k)) out.set(k, []);
      if (!out.get(k).includes(e.word)) out.get(k).push(e.word);
    }
  }
  return out;
}

const noadCandidates = (cands, chunkIpa) => cands.get(ipaKey(chunkIpa)) || [];

// Bases a word could be a regular inflection of (-s/-es/-ies, -ed/-d/-ied,
// -ing, -er/-est, with a doubled final consonant or a dropped e).
function inflectionBases(w) {
  const bases = [];
  const doubled = (stem) => (stem.length > 2 && stem.at(-1) === stem.at(-2) ? [stem.slice(0, -1)] : []);
  if (w.endsWith("ies")) bases.push(w.slice(0, -3) + "y");
  if (w.endsWith("es")) bases.push(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss")) bases.push(w.slice(0, -1));
  if (w.endsWith("ied")) bases.push(w.slice(0, -3) + "y");
  if (w.endsWith("ed")) bases.push(w.slice(0, -2), w.slice(0, -1), ...doubled(w.slice(0, -2)));
  if (w.endsWith("ing")) bases.push(w.slice(0, -3), w.slice(0, -3) + "e", ...doubled(w.slice(0, -3)));
  for (const suf of ["er", "est"]) {
    if (!w.endsWith(suf)) continue;
    const stem = w.slice(0, -suf.length);
    bases.push(stem, stem + "e", ...doubled(stem));
    if (stem.endsWith("i")) bases.push(stem.slice(0, -1) + "y");
  }
  return bases.filter((b) => b.length >= 2);
}

// A word is an inflection when NOAD has no entry for it but has a headword it
// regularly inflects (cats <- cat, walked <- walk). NOAD has no inflection
// entries yet (US-055), so they are left out as keywords on both sides.
function isInflection(w, noadHeadwords) {
  if (noadHeadwords.has(w)) return false;
  return inflectionBases(w).some((b) => noadHeadwords.has(b));
}

// CMU keyword candidates for a chunk, through find-keywords' exactMatches on
// the lookup lines indexed under the chunk's ipaKey.
function cmuCandidates(cmu, chunkIpa, { isInflection: infl = () => false } = {}) {
  const lines = cmu.linesByKey.get(ipaKey(chunkIpa)) || [];
  return exactMatches(lines.join("\n"), chunkIpa).filter((w) => !infl(w));
}

// One word's chunks with their candidates (frequencies not yet known).
function chunksWithCandidates(syllableString, candidatesFor) {
  if (!syllableString) return [];
  return chunk(syllableString).map((c) => ({ ipa: c.ipa, candidates: candidatesFor(c.ipa) }));
}

// -> [{ ipa, keyword|null, frequency? }]
function pickAnchors(chunks, freqs, word) {
  const exclude = word ? [word.toLowerCase()] : [];
  return chunks.map((c) => ({ ipa: c.ipa, ...(pickKeyword(c.candidates, freqs, { exclude }) || { keyword: null }) }));
}

module.exports = {
  noadCandidateIndex,
  noadCandidates,
  cmuCandidates,
  isInflection,
  inflectionBases,
  chunksWithCandidates,
  pickAnchors,
};
