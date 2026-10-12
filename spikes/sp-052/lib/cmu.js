"use strict";

// SP-052: the CMU side, read through the same `nemo-words ipa-lookup` the card
// pipeline uses. One `ipa-lookup --ga ""` call (an empty fragment matches
// every row) dumps the whole GA dictionary as `word\tRP\tGA[,GA…]` lines; it
// is indexed here so each word and each chunk costs a map lookup instead of a
// JVM start. The matching itself stays today's code: ipa.js's gaFromLookup
// for a word's IPA, find-keywords' exactMatches for a chunk's keywords.

const { nemoWords, ipaKey } = require("../../../scripts/card-lib");
const { gaFromLookup } = require("../../../scripts/ipa");

function loadCmu(lookupText = nemoWords(["ipa-lookup", "--ga", ""])) {
  const lineByWord = new Map(); // word -> its lookup line(s)
  const linesByKey = new Map(); // ipaKey(GA variant) -> lookup lines
  for (const line of lookupText.split("\n")) {
    const [w, , ga] = line.split("\t");
    if (!w || !ga) continue;
    const lw = w.toLowerCase();
    lineByWord.set(lw, (lineByWord.has(lw) ? lineByWord.get(lw) + "\n" : "") + line);
    for (const v of ga.split(",")) {
      const k = ipaKey(v.trim());
      if (!linesByKey.has(k)) linesByKey.set(k, []);
      linesByKey.get(k).push(line);
    }
  }
  return { lineByWord, linesByKey };
}

// -> { hasUsIpa, ipa, variants, reason }: the word's first GA variant, as the
// card pipeline's `ipa` step picks it.
function lookupCmu(cmu, word) {
  const lines = cmu.lineByWord.get(word.toLowerCase());
  const ipa = lines ? gaFromLookup(lines, word) : null;
  if (!ipa) return { hasUsIpa: false, ipa: null, variants: [], reason: "not in CMU" };
  const variants = lines.split("\n").flatMap((l) => l.split("\t")[2].split(",").map((v) => v.trim()));
  return { hasUsIpa: true, ipa, variants, reason: null };
}

// Lower-case a–z words with a GA entry.
const cmuWords = (cmu) => new Set([...cmu.lineByWord.keys()].filter((w) => /^[a-z]+$/.test(w)));

module.exports = { loadCmu, cmuWords, lookupCmu };
