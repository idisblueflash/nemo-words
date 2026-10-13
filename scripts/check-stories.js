#!/usr/bin/env node
"use strict";

// US-028 step `check-stories <word> <primarySense> <candidates-file> <chunk-keywords-file>`
// (dags/card.yaml) — runs check-story's hard gates over every compose-stories
// candidate and prints the checks file pick-story reads: one line per
// candidate, same order — `-` when it passed, otherwise its reasons,
// comma-separated. Always exit 0: rejecting candidates is pick-story's call.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli } = require("./card-lib");
const { checkStory } = require("./check-story");
const { readChunkKeywords } = require("./compose-stories");
const { lookupGaForms: lookupGa } = require("./ipa"); // every GA form (bug-014)

function checkStories({ word, primarySense, candidatesText, chunks, lookupGa }) {
  return candidatesText
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const [sentence, pivots = ""] = line.split("\t");
      const reasons = checkStory({ word, primarySense, sentence, pivots: pivots.split(",").filter(Boolean), chunks, lookupGa });
      return reasons.length ? reasons.join(",") : "-";
    });
}

if (require.main === module) {
  runCli(([word, primarySense, candidatesFile, keywordsFile]) => {
    if (!word || !primarySense || !candidatesFile || !keywordsFile) {
      throw new Error("usage: check-stories <word> <primarySense> <candidates-file> <chunk-keywords-file>");
    }
    const lines = checkStories({
      word,
      primarySense,
      candidatesText: fs.readFileSync(candidatesFile, "utf8"),
      chunks: readChunkKeywords(fs.readFileSync(keywordsFile, "utf8")),
      lookupGa,
    });
    return { lines };
  });
}

module.exports = { checkStories };
