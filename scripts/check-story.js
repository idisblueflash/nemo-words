#!/usr/bin/env node
"use strict";

// US-028 step `check-story <word> <primarySense> <sentence> <pivots> <chunk-keywords-file>`
// — the hard gates a story must pass before it can be picked (after _nemo's
// "Before you return" gates and sense lock). Exit 0 with no output on pass;
// exit 1 with one reason per line on fail (e.g. `headword: conceded`).

const fs = require("fs");
const { runCli, ipaKey, stripStress } = require("./card-lib");
const { lookupGa } = require("./ipa");
const { readChunkKeywords } = require("./compose-stories");

// Every regular inflection of `base` (plural/3sg, past, -ing, comparative,
// superlative), with the usual e-drop, y->i and final-consonant doubling.
function inflections(base) {
  const b = base.toLowerCase();
  const forms = new Set([b, `${b}s`, `${b}es`, `${b}ed`, `${b}ing`, `${b}er`, `${b}est`]);
  if (b.endsWith("e")) {
    const stem = b.slice(0, -1);
    for (const s of ["d", "r", "st"]) forms.add(b + s);
    forms.add(`${stem}ing`);
  }
  if (/[^aeiou]y$/.test(b)) {
    const stem = b.slice(0, -1);
    for (const s of ["ies", "ied", "ier", "iest"]) forms.add(stem + s);
  }
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(b)) {
    const last = b[b.length - 1];
    for (const s of ["ed", "ing", "er", "est"]) forms.add(b + last + s);
  }
  return forms;
}

function isInflectionOf(token, base) {
  return inflections(base).has(token.toLowerCase());
}

// Lowercase word tokens, possessive 's dropped.
function tokens(sentence) {
  return (sentence.toLowerCase().match(/[a-z]+(?:'[a-z]+)*/g) || []).map((t) => t.replace(/'s$/, ""));
}

const MAX_WORDS = 10;

// Sound anchors: each anchored chunk's keyword must be in the sentence (as
// that exact word), in syllable order, and its own GA IPA must equal the
// chunk's IPA — re-verified here against the dictionary, never trusted.
function anchorReasons(toks, chunks, lookupGa) {
  const reasons = [];
  let prev = null;
  for (const c of chunks.filter((x) => x.keyword)) {
    const kw = c.keyword.toLowerCase();
    const ga = lookupGa(kw);
    if (!ga || ipaKey(ga) !== ipaKey(c.ipa)) {
      reasons.push(`anchor-ipa: ${kw} /${ga ? stripStress(ga) : "?"}/ is not /${c.ipa}/`);
    }
    const pos = toks.indexOf(kw);
    if (pos === -1) {
      reasons.push(`anchor-missing: ${kw}`);
      continue;
    }
    if (prev && pos < prev.pos) reasons.push(`anchor-order: ${kw} before ${prev.kw}`);
    prev = { kw, pos };
  }
  return reasons;
}

function checkStory({ word, primarySense, sentence, chunks = [], lookupGa }) {
  const reasons = [];
  const toks = tokens(sentence);
  const hit = toks.find((t) => isInflectionOf(t, word));
  if (hit) reasons.push(`headword: ${hit}`);
  const count = sentence.trim().split(/\s+/).filter(Boolean).length; // same as `wc -w`
  if (count > MAX_WORDS) reasons.push(`word-count: ${count} > ${MAX_WORDS}`);
  if (!toks.some((t) => isInflectionOf(t, primarySense))) reasons.push(`sense-missing: ${primarySense}`);
  reasons.push(...anchorReasons(toks, chunks, lookupGa));
  return reasons;
}

if (require.main === module) {
  runCli(([word, primarySense, sentence, pivots, keywordsFile]) => {
    if (!word || !primarySense || !sentence || !keywordsFile) {
      throw new Error("usage: check-story <word> <primarySense> <sentence> <pivots> <chunk-keywords-file>");
    }
    const chunks = readChunkKeywords(fs.readFileSync(keywordsFile, "utf8"));
    const reasons = checkStory({
      word,
      primarySense,
      sentence,
      pivots: (pivots || "").split(",").filter(Boolean),
      chunks,
      lookupGa,
    });
    return reasons.length ? { stop: reasons } : { lines: [] };
  });
}

module.exports = { checkStory, isInflectionOf, inflections, tokens };
