"use strict";

// `sample` step: N TestWords from the mnemonic log with a fixed seed. Latest
// row per word; a word whose (latest) sentence contains the headword is
// skipped — it would fail the headword gate before Jev ever saw it.

const { mulberry32, shuffle } = require("./rng");
const { headwordHit } = require("./gates");

function readLog(text) {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function toTestWord(row) {
  return {
    word: row.word,
    sense: row.sense,
    syllables: row.syllabification,
    keyword: row.keyword,
    flashSentence: row.sentence,
    flashPivots: row.pivot_words,
  };
}

function latestPerWord(rows) {
  const byWord = new Map();
  for (const r of rows) byWord.set(r.word, r); // the log is append-only: later wins
  return [...byWord.values()];
}

function eligibleWords(rows) {
  return latestPerWord(rows)
    .filter((r) => !headwordHit(r.word, r.sentence))
    .map(toTestWord);
}

function sampleWords(rows, { n, seed }) {
  return shuffle(eligibleWords(rows), mulberry32(seed)).slice(0, n);
}

module.exports = { readLog, sampleWords, eligibleWords, toTestWord };
