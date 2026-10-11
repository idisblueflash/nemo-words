#!/usr/bin/env node
"use strict";

// US-028 step `route <word>` (after update-anki-story §1) — decides whether
// a word goes down the one-word card path. Prints `general` on success — or
// `general\t<sentence>\t<pivots>` when the mnemonic log (data/mnemonics/
// log.jsonl, or NEMO_MNEMONIC_LOG) already holds a story for exactly this
// word: per the story's open-question assumption, a logged story was a human
// pick and wins, so only the card gets written.
// Exit 1 when it must stop:
//   already carded — the card file has a row for the word (Front matched
//   case-insensitively) whose Back holds a story; the current story is shown.
//   A row with an empty Back counts as "no story" and is routed on.
//   word-part — scripts/classify-word.js says `medical` (a classical
//   Greek/Latin morpheme or INN drug stem): that's _etta_mology's path.
//   ambiguous — the classifier can't place it (weak suffix match only);
//   routing those is US-040. A `no match` verdict routes general.

const fs = require("fs");
const path = require("path");
const { runCli, cardFilePath, cardRows, findCardRow, alreadyCarded, flatten, REPO_ROOT } = require("./card-lib");
const { classify } = require("./classify-word");

function routeWord(word, { rows = [], log = [] } = {}) {
  const row = findCardRow(rows, word);
  if (row && row.back) return { route: "already-carded", story: row.back };
  const { verdict } = classify(word);
  if (verdict === "medical") return { route: "word-part" };
  if (verdict === "ambiguous") return { route: "ambiguous" };
  const entry = log.find((r) => String(r.word || "").toLowerCase() === word.toLowerCase() && r.sentence);
  if (entry) {
    const pivots = Array.isArray(entry.pivot_words) ? entry.pivot_words : [];
    return { route: "general", logged: { sentence: flatten(entry.sentence), pivots: pivots.map(flatten) } };
  }
  return { route: "general" };
}

function readLog(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
}

function stopReason(word, r) {
  if (r.route === "already-carded") return alreadyCarded(word, r.story);
  if (r.route === "word-part") return `word-part: ${word} belongs to the word-part path (_etta_mology), not a story card`;
  if (r.route === "ambiguous") return `ambiguous: ${word} couldn't be routed automatically (classifier verdict: ambiguous)`;
  return null;
}

if (require.main === module) {
  runCli(([word]) => {
    if (!word) throw new Error("usage: route <word>");
    const r = routeWord(word, {
      rows: cardRows(fs.readFileSync(cardFilePath(), "utf8")),
      log: readLog(process.env.NEMO_MNEMONIC_LOG || path.join(REPO_ROOT, "data", "mnemonics", "log.jsonl")),
    });
    const reason = stopReason(word, r);
    if (reason) return { stop: [reason] };
    return { lines: [r.logged ? `${r.route}\t${r.logged.sentence}\t${r.logged.pivots.join(",")}` : r.route] };
  });
}

module.exports = { routeWord };
