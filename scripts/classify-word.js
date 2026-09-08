#!/usr/bin/env node
"use strict";

// Cheap heuristic pre-filter for routing "explain <word>" requests to
// _etta_mology (medical/clinical morpheme or INN drug stem) vs _glossy_ary
// (general English) vs an LLM judgment call, without spending an LLM call
// on the obvious cases. See AGENTS.md's word-workflow.md for the agents
// this feeds.
//
// Usage:
//   node scripts/classify-word.js <word>
//
// Matches the word against scripts/word-part-reference.json (prefixes,
// roots, suffixes, INN stems). A match on a root, an INN stem, or a
// non-weak prefix/suffix is enough on its own to call it medical. The
// generic "pertaining to" suffixes (-al, -ic, -ary, ...) are tagged
// "weak" in the reference file because nearly any English word ends in
// one of them (e.g. "national", "specific") — a weak match alone is not
// enough, it only counts alongside a stronger match.
//
// This is a pre-filter, not a verdict: words with no match, or only a
// weak match, are ambiguous and should fall through to an LLM classify
// call (or a human) rather than being guessed at here.

const fs = require("fs");
const path = require("path");

const REFERENCE_PATH = path.join(__dirname, "word-part-reference.json");
const MIN_PART_LENGTH = 3; // shorter substrings (e.g. "ur", "ot") false-positive too often

function loadParts() {
  const raw = JSON.parse(fs.readFileSync(REFERENCE_PATH, "utf8"));
  return raw.parts;
}

function normalize(word) {
  return (word || "").trim().toLowerCase().replace(/[^a-z]/g, "");
}

// "cardi/o" -> "cardi", "-itis" -> "itis", "hyper-" -> "hyper"
function bareForm(part) {
  return part.replace(/^-/, "").replace(/-$/, "").replace(/\/o$/, "");
}

function classify(word) {
  const norm = normalize(word);
  const parts = loadParts();
  const matches = [];

  for (const entry of parts) {
    const bare = bareForm(entry.part);
    if (bare.length < MIN_PART_LENGTH) continue;

    let hit = false;
    if (entry.type === "prefix") hit = norm.startsWith(bare);
    else if (entry.type === "suffix" || entry.type === "stem") hit = norm.endsWith(bare);
    else if (entry.type === "root") hit = norm.includes(bare);

    if (hit) matches.push(entry);
  }

  const strong = matches.filter((m) => !m.weak);
  const weak = matches.filter((m) => m.weak);

  let verdict, route;
  if (strong.length > 0) {
    verdict = "medical";
    route = "_etta_mology";
  } else if (weak.length > 0) {
    verdict = "ambiguous";
    route = "LLM classify (weak suffix match only)";
  } else {
    verdict = "no match";
    route = "LLM classify (or _glossy_ary if clearly general English)";
  }

  return { word, norm, matches: [...strong, ...weak], verdict, route };
}

function printResult(result) {
  console.log(`## ${result.word}`);
  console.log("");
  console.log(`**Verdict:** ${result.verdict}`);
  console.log(`**Route:** ${result.route}`);
  if (result.matches.length) {
    console.log("");
    console.log("**Matched parts:**");
    for (const m of result.matches) {
      const weakTag = m.weak ? " _(weak)_" : "";
      console.log(`- \`${m.part}\` (${m.origin} ${m.type}) — ${m.meaning}${weakTag}`);
    }
  }
}

if (require.main === module) {
  const word = process.argv[2];
  if (!word) {
    console.error("Usage: node scripts/classify-word.js <word>");
    process.exit(1);
  }
  printResult(classify(word));
}

module.exports = { classify, normalize, bareForm };
