#!/usr/bin/env node
"use strict";

// US-028 step `chunk <syllables>` (after _nemo process §0) — one chunk per
// syllable, and for each the `anchor_unit` values from _logan's controlled
// vocabulary (.claude/agents/_logan/reference-tables.md) it actually offers.
// Prints one line per chunk: `ipa\tanchorUnits` (ipa without stress marks).
//   chunk dʒɚ.ˈmeɪn -> dʒɚ	first-syllable,rime,onset,nucleus
//                      meɪn	stressed-syllable,rime,onset,nucleus,coda

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const { runCli, stripStress } = require("./card-lib");
const { syllables } = require("./syllabify");

function chunk(syllableString) {
  const parts = syllableString.split(".").filter(Boolean);
  return parts.map((text, i) => {
    const syl = syllables(text)[0];
    const units = [];
    if (parts.length === 1) units.push("whole-word");
    if (i === 0) units.push("first-syllable");
    if (text.includes("ˈ")) units.push("stressed-syllable");
    if (syl.nucleus) units.push("rime");
    if (syl.onset.length) units.push("onset");
    if (syl.nucleus) units.push("nucleus");
    if (syl.coda.length) units.push("coda");
    return { ipa: stripStress(text), anchorUnits: units };
  });
}

if (require.main === module) {
  runCli(([syllableString]) => {
    if (!syllableString) throw new Error("usage: chunk <syllables>");
    return { lines: chunk(syllableString).map((c) => `${c.ipa}\t${c.anchorUnits.join(",")}`) };
  });
}

module.exports = { chunk };
