#!/usr/bin/env node
"use strict";

/*
 * find-mnemonic.js — look up a user-authored mnemonic sentence for a word.
 *
 * Usage:
 *   node scripts/find-mnemonic.js <word> [LOG_FILE]
 *
 * Default LOG_FILE: <repo>/data/mnemonics/log.jsonl
 *
 * The log is one JSON object per line, e.g.:
 *   {"word":"omin-","sentence":"An almond tree ...","pivot_words":["almond","sign"], ...}
 *
 * On a match, prints the sentence and the pivot_words (the pivot_words are a
 * hint for _vivian's spot-colour element), plus the matched entry as JSON.
 * Exits 0 on a hit, 1 when nothing matches, 2 on a usage / file error.
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_LOG = path.join(__dirname, "..", "data", "mnemonics", "log.jsonl");

function die(code, msg) {
  process.stderr.write(msg + "\n");
  process.exit(code);
}

const [, , rawWord, logArg] = process.argv;
if (!rawWord) {
  die(2, "usage: node scripts/find-mnemonic.js <word> [LOG_FILE]");
}
const logFile = logArg || DEFAULT_LOG;

if (!fs.existsSync(logFile)) {
  die(2, `error: mnemonic log not found: ${logFile}`);
}

// Normalise for matching: lowercase, drop leading/trailing non-letters
// (so "omin-", "-cy", "hepat-" in the log still match "ominous", "hepatic").
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/^[^a-z]+/, "")
    .replace(/[^a-z]+$/, "");
}

const query = norm(rawWord);
if (!query) {
  die(2, `error: no letters in query: ${JSON.stringify(rawWord)}`);
}

const lines = fs
  .readFileSync(logFile, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const exact = [];
const prefix = []; // log entry is a stem/prefix of the query, or vice versa

lines.forEach((line, i) => {
  let rec;
  try {
    rec = JSON.parse(line);
  } catch (e) {
    process.stderr.write(`warning: skipping malformed line ${i + 1}\n`);
    return;
  }
  const entry = norm(rec.word);
  if (!entry) return;
  if (entry === query) exact.push(rec);
  else if (query.startsWith(entry) || entry.startsWith(query)) prefix.push(rec);
});

const hits = exact.length ? exact : prefix;

if (!hits.length) {
  die(1, `error: no mnemonic found for "${rawWord}" in ${logFile}`);
}

for (const rec of hits) {
  const pivots = Array.isArray(rec.pivot_words) ? rec.pivot_words : [];
  process.stdout.write(`word:        ${rec.word}\n`);
  process.stdout.write(`sentence:    ${rec.sentence || "(none)"}\n`);
  process.stdout.write(`pivot_words: ${pivots.join(", ") || "(none)"}\n`);
  if (rec.keyword) process.stdout.write(`keyword:     ${rec.keyword}\n`);
  if (rec.sense) process.stdout.write(`sense:       ${rec.sense}\n`);
  process.stdout.write(`json:        ${JSON.stringify(rec)}\n`);
  if (hits.length > 1) process.stdout.write("---\n");
}

if (hits.length > 1) {
  process.stderr.write(
    `note: ${hits.length} entries matched "${rawWord}" — pick the intended one\n`
  );
}
