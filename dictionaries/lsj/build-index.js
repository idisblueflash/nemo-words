#!/usr/bin/env node
'use strict';

// Parses the LSJLogeion TEI-XML files (86 files, one entry per <div2
// type="main"|"gloss"> block) into a consolidated plaintext file (one
// dictionary entry per line, tags stripped) plus a byte-offset index keyed
// by a diacritic-stripped Greek headword, and a Latin-transliteration index
// layered on top so an ASCII query (e.g. "logos") can find the polytonic
// Greek headword (e.g. "λόγος"). Zero dependencies — Node stdlib only.
//
// This mirrors dictionaries/lewis-short/build-index.js's byte-offset design:
// search.js reads only the matched entry's bytes off disk rather than
// loading the whole corpus into memory.

const fs = require('fs');
const path = require('path');

const VENDOR_DIR = path.join(__dirname, 'vendor', 'LSJLogeion');
const DATA_DIR = path.join(__dirname, 'data');
const CLEAN_TXT_PATH = path.join(DATA_DIR, 'lsj-clean.txt');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');
const TRANSLIT_INDEX_PATH = path.join(DATA_DIR, 'translit-index.json');

const ENTRY_RE = /<div2\b[^>]*\btype="(?:main|gloss)"[^>]*>([\s\S]*?)<\/div2>/g;
const HEAD_RE = /<head\b[^>]*>([\s\S]*?)<\/head>/;

// Combining diacritical marks left behind after NFD normalization splits a
// precomposed Greek letter (accent, breathing mark, iota subscript, etc.)
// into base letter + marks.
const COMBINING_MARKS_RE = /[̀-ͯ]/g;

const TRANSLIT = {
  'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'ε': 'e',
  'ζ': 'z', 'η': 'e', 'θ': 'th', 'ι': 'i', 'κ': 'k',
  'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o',
  'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't',
  'υ': 'y', 'φ': 'ph', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o',
};

function stripTags(fragment) {
  return fragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(greekText) {
  return greekText
    .normalize('NFD')
    .replace(COMBINING_MARKS_RE, '')
    .replace(/ς/g, 'σ')
    .toLowerCase()
    .trim();
}

function transliterate(strippedLowerGreek) {
  let out = '';
  for (const ch of strippedLowerGreek) {
    out += TRANSLIT[ch] || '';
  }
  return out;
}

function extractEntries(xml) {
  const entries = [];
  let m;
  ENTRY_RE.lastIndex = 0;
  while ((m = ENTRY_RE.exec(xml))) {
    const block = m[1];
    const headMatch = HEAD_RE.exec(block);
    if (!headMatch) continue;
    const headword = stripTags(headMatch[1]);
    if (!headword) continue;
    const cleanText = stripTags(block);
    if (!cleanText) continue;
    entries.push({ headword, cleanText });
  }
  return entries;
}

function build() {
  if (!fs.existsSync(VENDOR_DIR)) {
    console.error(`Missing ${VENDOR_DIR} — run download.sh first.`);
    process.exit(1);
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const files = fs.readdirSync(VENDOR_DIR)
    .filter((f) => /^greatscott\d+\.xml$/.test(f))
    .sort();

  const index = Object.create(null);
  const translitSets = Object.create(null);
  let offset = 0;
  let entryCount = 0;

  const outFd = fs.openSync(CLEAN_TXT_PATH, 'w');

  for (const file of files) {
    const xml = fs.readFileSync(path.join(VENDOR_DIR, file), 'utf8');
    for (const { headword, cleanText } of extractEntries(xml)) {
      const line = Buffer.from(cleanText.replace(/\n/g, ' ') + '\n', 'utf8');
      fs.writeSync(outFd, line);
      const length = line.length - 1; // exclude the trailing newline

      const key = normalizeKey(headword);
      if (key) {
        (index[key] || (index[key] = [])).push({ offset, length });

        const translit = transliterate(key);
        if (translit) {
          (translitSets[translit] || (translitSets[translit] = new Set())).add(headword);
        }
      }

      offset += line.length;
      entryCount++;
    }
  }
  fs.closeSync(outFd);

  const translitIndex = {};
  for (const [form, headwords] of Object.entries(translitSets)) {
    translitIndex[form] = [...headwords];
  }

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index));
  fs.writeFileSync(TRANSLIT_INDEX_PATH, JSON.stringify(translitIndex));

  console.log(
    `Indexed ${entryCount} entries (${Object.keys(index).length} distinct headwords, ` +
    `${Object.keys(translitIndex).length} transliterated forms) → ${CLEAN_TXT_PATH}`
  );
}

if (require.main === module) {
  build();
}

module.exports = { transliterate, normalizeKey, stripTags, build };
