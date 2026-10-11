#!/usr/bin/env node
"use strict";

// US-028 step `compose-stories <word> <primarySense> <chunk-keywords-file>`
// (claude -p, after _nemo §2 "The core technique") — 5 one-sentence story
// candidates, two-clause shape: the sound anchors first, in syllable order,
// then the meaning. Prints one line per candidate: `sentence\tpivot,pivot`.
// The chunk-keywords file is find-keywords' output.

const fs = require("fs");
const { runCli, claude, flatten, extractJson } = require("./card-lib");

const CANDIDATES = 5;

// find-keywords output -> [{ ipa, keyword|null }] in chunk order.
function readChunkKeywords(text) {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const [ipa, keyword] = l.split("\t");
      return { ipa, keyword: keyword && keyword !== "-" ? keyword : null };
    });
}

function composePrompt(word, primarySense, chunks) {
  const anchors = chunks
    .map((c, i) => `  ${i + 1}. /${c.ipa}/ -> ${c.keyword ? `"${c.keyword}"` : "(no anchor; leave this sound out)"}`)
    .join("\n");
  return [
    "Step: compose-stories",
    `Write ${CANDIDATES} different one-sentence mnemonic stories for the English word "${word}" (main sense: ${primarySense}).`,
    "Its syllables, in order, with the sound-anchor keyword for each:",
    anchors,
    "Rules for every sentence:",
    "- Use each anchor keyword exactly as spelled, in the order above, early in the sentence; then a second clause carrying the meaning.",
    `- Include the word "${primarySense}" (or a simple inflection of it).`,
    `- Never write "${word}" or any form of it.`,
    "- 10 words or fewer. One concrete, drawable scene. No harm to animals.",
    'Reply with JSON only: [{"sentence": "...", "pivots": ["<anchor keywords>", "<meaning words>"]}, ...]',
  ].join("\n");
}

function parseStories(text) {
  const j = extractJson(text);
  if (!Array.isArray(j)) throw new Error("model did not return a JSON array of stories");
  return j
    .map((c) => ({
      sentence: flatten(c && c.sentence),
      pivots: (Array.isArray(c && c.pivots) ? c.pivots : []).map((p) => flatten(p).replace(/,/g, " ")).filter(Boolean),
    }))
    .filter((c) => c.sentence)
    .slice(0, CANDIDATES);
}

if (require.main === module) {
  runCli(([word, primarySense, file]) => {
    if (!word || !primarySense || !file) throw new Error("usage: compose-stories <word> <primarySense> <chunk-keywords-file>");
    const chunks = readChunkKeywords(fs.readFileSync(file, "utf8"));
    const stories = parseStories(claude(composePrompt(word, primarySense, chunks)));
    if (stories.length === 0) throw new Error("model returned no story candidates");
    return { lines: stories.map((s) => `${s.sentence}\t${s.pivots.join(",")}`) };
  });
}

module.exports = { parseStories, readChunkKeywords, composePrompt };
