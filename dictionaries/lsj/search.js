#!/usr/bin/env node
'use strict';

// CLI: search the LSJ Greek-English lexicon (LSJLogeion TEI-XML, see
// download.sh) by Greek-script or Latin-transliteration query. Reads only
// the matched entry's bytes off disk — never loads the full corpus into
// memory. Zero dependencies — Node stdlib only.
//
// Usage: node search.js <query>

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DATA_DIR = path.join(__dirname, 'data');
const CLEAN_TXT_PATH = path.join(DATA_DIR, 'lsj-clean.txt');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');
const TRANSLIT_INDEX_PATH = path.join(DATA_DIR, 'translit-index.json');

const MAX_CANDIDATES = 15;

// Greek/Coptic + Greek Extended Unicode blocks (covers polytonic Greek).
const GREEK_RE = /[Ͱ-Ͽἀ-῿]/;
const COMBINING_MARKS_RE = /[̀-ͯ]/g;

function normalizeKey(greekText) {
  return greekText
    .normalize('NFD')
    .replace(COMBINING_MARKS_RE, '')
    .replace(/ς/g, 'σ')
    .toLowerCase()
    .trim();
}

function ensureIndex() {
  if (!fs.existsSync(CLEAN_TXT_PATH) || !fs.existsSync(INDEX_PATH) || !fs.existsSync(TRANSLIT_INDEX_PATH)) {
    console.error('Index missing or incomplete — building it now (this parses ~110MB of XML, may take a bit)…');
    execFileSync(process.execPath, [path.join(__dirname, 'build-index.js')], { stdio: 'inherit' });
  }
}

function readEntry(fd, { offset, length }) {
  const buf = Buffer.alloc(length);
  fs.readSync(fd, buf, 0, length, offset);
  return buf.toString('utf8');
}

function printEntries(fd, spans) {
  for (const span of spans) {
    console.log(readEntry(fd, span));
    console.log('---');
  }
}

function searchGreek(query, fd, index) {
  const key = normalizeKey(query);
  if (index[key] && index[key].length) {
    printEntries(fd, index[key]);
    return;
  }

  const candidates = Object.keys(index).filter((k) => k.includes(key)).slice(0, MAX_CANDIDATES);
  if (!candidates.length) {
    console.log(`No match found for "${query}".`);
    return;
  }
  console.log(`No exact match for "${query}" — closest candidates:`);
  candidates.forEach((c) => console.log('  ' + c));
}

function searchLatin(query, fd, index, translitIndex) {
  const q = query.toLowerCase().trim();

  if (translitIndex[q] && translitIndex[q].length) {
    for (const headword of translitIndex[q]) {
      const key = normalizeKey(headword);
      if (index[key]) printEntries(fd, index[key]);
    }
    return;
  }

  const candidates = Object.keys(translitIndex).filter((k) => k.includes(q)).slice(0, MAX_CANDIDATES);
  if (!candidates.length) {
    console.log(`No match found for "${query}".`);
    return;
  }
  console.log(`No exact transliteration match for "${query}" — closest candidates:`);
  for (const form of candidates) {
    console.log(`  ${form} → ${translitIndex[form].join(', ')}`);
  }
}

function main() {
  const query = process.argv.slice(2).join(' ').trim();
  if (!query) {
    console.error('Usage: node search.js <greek word or transliteration>');
    process.exit(1);
  }
  if (!fs.existsSync(path.join(__dirname, 'vendor', 'LSJLogeion'))) {
    console.error('Missing vendor/LSJLogeion — run "bash download.sh" first.');
    process.exit(1);
  }

  ensureIndex();

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const translitIndex = JSON.parse(fs.readFileSync(TRANSLIT_INDEX_PATH, 'utf8'));
  const fd = fs.openSync(CLEAN_TXT_PATH, 'r');

  try {
    if (GREEK_RE.test(query)) {
      searchGreek(query, fd, index);
    } else {
      searchLatin(query, fd, index, translitIndex);
    }
  } finally {
    fs.closeSync(fd);
  }
}

main();
