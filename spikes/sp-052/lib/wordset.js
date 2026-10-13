"use strict";

// SP-052 AC1: the spike's word set — every whole-word row of the card file,
// every word of the mnemonic log, and `sampleSize` more words drawn with a
// fixed seed. Duplicates are merged (one entry per word, with all its
// sources); word-part rows and names are left out and listed with a reason.

const { mulberry32, shuffle } = require("../../sp-037/lib/rng");

const WORD_PART_TAG = "medical-word-parts";

// "colon (intestine)" -> "colon": a sense note in brackets isn't part of the word.
const bareWord = (front) => String(front).replace(/\s*\([^)]*\)\s*$/, "").trim();

// A word part is spelled with a leading or trailing hyphen (`-nomy`, `hepat-`).
const isWordPart = (w) => /^-|-$/.test(w);

// A capitalised entry is a proper name (E07 leaves names with the old tools).
// Ordinary vocabulary in the card file and log is always lower case.
const isName = (w) => /^[A-Z]/.test(w);

// Card-file data rows -> [{ front, tags }]; `#` headers, blank lines and lines
// with no tab (the card pipeline's own reader skips those too) are dropped.
function cardEntries(text) {
  const out = [];
  for (const line of String(text).split("\n")) {
    if (!line.trim() || line.startsWith("#") || !line.includes("\t")) continue;
    const cols = line.split("\t");
    out.push({ front: cols[0], tags: cols[6] || "" });
  }
  return out;
}

function logEntries(text) {
  return String(text)
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l).word)
    .filter(Boolean);
}

// -> { words: [{ word, sources }], leftOut: [{ word, source, reason }] }
function baseWordSet({ cardText, logText }) {
  const words = new Map();
  const leftOut = [];
  const rows = { card: 0, log: 0 }; // whole-word rows read, before names and duplicates
  const seenLeftOut = new Set();
  const add = (raw, source, tags = "") => {
    const w = bareWord(raw);
    let reason = null;
    if (tags.split(/\s+/).includes(WORD_PART_TAG) || isWordPart(w)) reason = "word part";
    else if (isName(w)) reason = "proper name";
    if (reason !== "word part") rows[source]++;
    if (reason) {
      const key = `${w}\t${source}`;
      if (!seenLeftOut.has(key)) leftOut.push({ word: w, source, reason });
      seenLeftOut.add(key);
      return;
    }
    const lw = w.toLowerCase();
    if (!words.has(lw)) words.set(lw, { word: lw, sources: [] });
    const entry = words.get(lw);
    if (!entry.sources.includes(source)) entry.sources.push(source);
  };
  for (const { front, tags } of cardEntries(cardText)) add(front, "card", tags);
  for (const w of logEntries(logText)) add(w, "log");
  return { words: [...words.values()], leftOut, rows };
}

// Draws `size` words from `pool` (words in both dictionaries) in seeded order,
// keeping those with a frequency at or above `threshold` and not already in
// `exclude`. `freqsFor(words)` -> { word: freq } is asked one batch at a time.
function drawSample({ pool, size, seed, threshold, exclude = new Set(), freqsFor, batch = 400 }) {
  if (size <= 0) return [];
  const order = shuffle([...pool].sort(), mulberry32(seed)).filter((w) => !exclude.has(w));
  const picked = [];
  for (let i = 0; i < order.length && picked.length < size; i += batch) {
    const slice = order.slice(i, i + batch);
    const freqs = freqsFor(slice);
    for (const w of slice) {
      if (picked.length >= size) break;
      if (typeof freqs[w] === "number" && freqs[w] >= threshold) picked.push(w);
    }
  }
  return picked;
}

function buildWordSet({ cardText, logText, pool, sampleSize, seed, threshold, freqsFor }) {
  const { words, leftOut, rows } = baseWordSet({ cardText, logText });
  const exclude = new Set(words.map((w) => w.word));
  const sample = drawSample({ pool, size: sampleSize, seed, threshold, exclude, freqsFor });
  for (const w of sample) words.push({ word: w, sources: ["sample"] });
  return { words, leftOut, rows, seed, sampleSize: sample.length };
}

module.exports = { buildWordSet, baseWordSet, drawSample, cardEntries, logEntries, bareWord };
