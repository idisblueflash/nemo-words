#!/usr/bin/env node
"use strict";

// US-028 step `find-keywords <syllables> [word]` (after _nemo §1, "Finding
// anchor candidates" and the keyword-frequency check) — for each syllable
// chunk, the most frequent common English word whose GA IPA equals the
// chunk's IPA *exactly* (no near matches). Prints one line per chunk:
//   `ipa\tkeyword\tfrequency`, or `ipa\t-` when no common exact match exists
//   (that chunk stays unanchored and is taught by the card's IPA line).
// The optional [word] is the headword itself, never offered as its own anchor.
//
// Candidates come from `nemo-words ipa-lookup --ga <chunk>` (substring search)
// filtered to exact matches; frequency from scripts/word-freq.js (Google
// Ngram). NEMO_WORD_FREQ_BIN overrides the frequency tool (tests inject a fake).

const path = require("path");
const { runCli, runTool, nemoWords, ipaKey } = require("./card-lib");
const { chunk } = require("./chunk");

// Keyword frequency cutoff (mean Ngram share, 2015–2019). Tuned on known words:
// "main" 1.3e-4, "mane" 1.8e-6, "pickle" 9.7e-7 and "veer" 6.1e-7 pass;
// "beck" 4.5e-7, "urbane" 4.2e-7 (_nemo's own example of a too-rare peg) and
// "germaine" 3.3e-9 don't.
const FREQ_THRESHOLD = 5e-7;

// Words in `word\tRP\tGA[,GA…]` lookup output with a GA variant equal to `chunkIpa`.
function exactMatches(stdout, chunkIpa) {
  const want = ipaKey(chunkIpa);
  const words = [];
  for (const line of stdout.split("\n")) {
    const [w, , ga] = line.split("\t");
    if (!w || !ga || !/^[a-z]+$/.test(w)) continue;
    if (ga.split(",").some((v) => ipaKey(v.trim()) === want) && !words.includes(w)) words.push(w);
  }
  return words;
}

function pickKeyword(candidates, freqs, { exclude = [], threshold = FREQ_THRESHOLD } = {}) {
  let best = null;
  for (const w of candidates) {
    if (exclude.includes(w)) continue;
    const f = freqs[w];
    if (typeof f !== "number" || !(f >= threshold)) continue;
    if (!best || f > best.frequency) best = { keyword: w, frequency: f };
  }
  return best;
}

// word<TAB>freq lines -> { word: number } (`(not found)` rows are dropped).
function wordFreqs(words) {
  if (words.length === 0) return {};
  const out = process.env.NEMO_WORD_FREQ_BIN
    ? runTool(process.env.NEMO_WORD_FREQ_BIN, words)
    : runTool(process.execPath, [path.join(__dirname, "word-freq.js"), ...words]);
  const freqs = {};
  for (const line of out.split("\n")) {
    const [w, f] = line.split("\t");
    if (w && f && !Number.isNaN(Number(f))) freqs[w] = Number(f);
  }
  return freqs;
}

function findKeywords(syllableString, word) {
  const chunks = chunk(syllableString);
  const candidates = chunks.map((c) => exactMatches(nemoWords(["ipa-lookup", "--ga", c.ipa]), c.ipa));
  const freqs = wordFreqs([...new Set(candidates.flat())]);
  const exclude = word ? [word.toLowerCase()] : [];
  return chunks.map((c, i) => ({ ipa: c.ipa, ...(pickKeyword(candidates[i], freqs, { exclude }) || { keyword: null }) }));
}

function formatKeywordLine(k) {
  return k.keyword ? `${k.ipa}\t${k.keyword}\t${k.frequency.toExponential(4)}` : `${k.ipa}\t-`;
}

if (require.main === module) {
  runCli(([syllableString, word]) => {
    if (!syllableString) throw new Error("usage: find-keywords <syllables> [word]");
    return { lines: findKeywords(syllableString, word).map(formatKeywordLine) };
  });
}

module.exports = { exactMatches, pickKeyword, ipaKey, findKeywords, FREQ_THRESHOLD };
