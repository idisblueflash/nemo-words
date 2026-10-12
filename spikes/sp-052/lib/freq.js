"use strict";

// Word frequencies for the spike, through find-keywords' own `wordFreqs`
// (scripts/word-freq.js, or NEMO_WORD_FREQ_BIN), with a local cache so a
// re-run doesn't ask Google Ngram again. The cache is a `word\tfreq` TSV
// (`-` = not found) in the gitignored extract folder.

const fs = require("node:fs");
const { wordFreqs } = require("../../../scripts/find-keywords");

function makeFreqs(cacheFile, { batch = 400 } = {}) {
  const cache = new Map();
  if (cacheFile && fs.existsSync(cacheFile)) {
    for (const line of fs.readFileSync(cacheFile, "utf8").split("\n")) {
      const [w, f] = line.split("\t");
      if (w) cache.set(w, f === "-" || f === undefined ? null : Number(f));
    }
  }
  return function freqsFor(words) {
    const missing = [...new Set(words)].filter((w) => !cache.has(w));
    for (let i = 0; i < missing.length; i += batch) {
      const slice = missing.slice(i, i + batch);
      const got = wordFreqs(slice);
      const lines = slice.map((w) => {
        const f = typeof got[w] === "number" ? got[w] : null;
        cache.set(w, f);
        return `${w}\t${f === null ? "-" : f}`;
      });
      if (cacheFile) fs.appendFileSync(cacheFile, lines.join("\n") + "\n");
    }
    const out = {};
    for (const w of words) if (typeof cache.get(w) === "number") out[w] = cache.get(w);
    return out;
  };
}

module.exports = { makeFreqs };
