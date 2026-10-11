"use strict";

// Builds one word's candidate set: Flash's logged story + 5 fresh drafts,
// shuffled with a fixed seed. `source` stays on the record for scoring the
// spike, but `forJudge` strips it so the judge never sees it.

const { mulberry32, seedFor, shuffle } = require("./rng");

const FRESH_COUNT = 5;

// Lowercase, punctuation stripped, whitespace collapsed.
function normalize(sentence) {
  return sentence
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// `draft(testWord, count)` → [{ sentence, pivot_words }]. A fresh candidate
// equal to Flash's (normalized) is redrafted once, then dropped.
async function buildCandidateSet(tw, { draft, seed }) {
  const flashKey = normalize(tw.flashSentence);
  const isEcho = (c) => normalize(c.sentence) === flashKey;
  const fresh = [];
  for (const c of await draft(tw, FRESH_COUNT)) {
    if (!isEcho(c)) {
      fresh.push(c);
      continue;
    }
    const [redraft] = await draft(tw, 1);
    if (redraft && !isEcho(redraft)) fresh.push(redraft);
  }
  const all = [
    { sentence: tw.flashSentence, pivot_words: tw.flashPivots, source: "flash" },
    ...fresh.map((c) => ({ sentence: c.sentence, pivot_words: c.pivot_words, source: "fresh" })),
  ];
  return shuffle(all, mulberry32(seedFor(seed, tw.word)));
}

function forJudge({ sentence, pivot_words }) {
  return { sentence, pivot_words };
}

module.exports = { buildCandidateSet, forJudge, normalize, FRESH_COUNT };
