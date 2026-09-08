#!/usr/bin/env node
// CLI: node search.js <word>
// Looks up a Latin headword in the Lewis & Short dictionary and prints the
// full entry text(s). Falls back to substring suggestions on no exact match.
// Node stdlib only.
'use strict';

const fs = require('fs');
const path = require('path');
const {
  buildIndex,
  normalizeHeadword,
  TXT_PATH,
  INDEX_PATH,
} = require('./build-index.js');

function loadIndex() {
  if (!fs.existsSync(TXT_PATH)) {
    console.error(
      `Missing ${TXT_PATH}.\nRun dictionaries/lewis-short/download.sh first to fetch the corpus.`
    );
    process.exit(1);
  }
  if (!fs.existsSync(INDEX_PATH)) {
    console.log('No index found — building it now (one-time step)...');
    return buildIndex();
  }
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
}

function printEntry(fd, offset, length) {
  const buf = Buffer.alloc(length);
  fs.readSync(fd, buf, 0, length, offset);
  console.log(buf.toString('utf8').trim());
}

function main() {
  const query = process.argv[2];
  if (!query) {
    console.error('Usage: node search.js <word>');
    process.exit(1);
  }

  const index = loadIndex();
  const key = normalizeHeadword(query);
  const spans = index[key];

  if (spans && spans.length) {
    const fd = fs.openSync(TXT_PATH, 'r');
    try {
      spans.forEach((span, i) => {
        if (i > 0) console.log('\n---\n');
        printEntry(fd, span.offset, span.length);
      });
    } finally {
      fs.closeSync(fd);
    }
    return;
  }

  console.log(`No exact match for "${query}". Did you mean:`);
  const candidates = Object.keys(index)
    .filter((k) => k.includes(key))
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .slice(0, 15);

  if (candidates.length === 0) {
    console.log('  (no substring matches found either)');
    process.exitCode = 1;
    return;
  }

  candidates.forEach((c) => console.log(`  ${c}`));
}

main();
