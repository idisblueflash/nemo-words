#!/usr/bin/env node
"use strict";

// US-028 step `ipa <word>` — the word's US (GA) IPA, straight from
// `nemo-words ipa-lookup --word` (CMU stress placement, e.g. `dʒɚmˈeɪn`).
// When the dictionary lists several GA variants, the first is used.
// Exit 1 (`no-ipa: <word>`) when the dictionary has no entry.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const { runCli, nemoWords } = require("./card-lib");

// Picks the exact word's row out of `word\tRP\tGA[,GA…]` lookup output.
function gaFromLookup(stdout, word) {
  const want = word.toLowerCase();
  for (const line of stdout.split("\n")) {
    const [w, , ga] = line.split("\t");
    if (w && w.toLowerCase() === want && ga) return ga.split(",")[0].trim();
  }
  return null;
}

// Every GA form of the exact word, comma-joined as the dictionary lists them
// (`lˈæst,lˈæs`), or null. check-stories accepts a keyword on any of them.
function gaFormsFromLookup(stdout, word) {
  const want = word.toLowerCase();
  for (const line of stdout.split("\n")) {
    const [w, , ga] = line.split("\t");
    if (w && w.toLowerCase() === want && ga) return ga.split(",").map((x) => x.trim()).filter(Boolean).join(",");
  }
  return null;
}

function lookupGaForms(word) {
  return gaFormsFromLookup(nemoWords(["ipa-lookup", "--word", word.toLowerCase()]), word);
}

function lookupGa(word) {
  return gaFromLookup(nemoWords(["ipa-lookup", "--word", word.toLowerCase()]), word);
}

if (require.main === module) {
  runCli(([word]) => {
    if (!word) throw new Error("usage: ipa <word>");
    const ga = lookupGa(word);
    return ga ? { lines: [ga] } : { stop: [`no-ipa: ${word} is not in the GA dictionary`] };
  });
}

module.exports = { gaFromLookup, gaFormsFromLookup, lookupGa, lookupGaForms };
