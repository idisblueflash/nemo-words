#!/usr/bin/env node
// Builds data/index.json from data/lewis-short.txt — a byte-offset index
// mapping a normalized headword to every {offset, length} span in the raw
// text file that holds that entry's full line. Node stdlib only.
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const TXT_PATH = path.join(DATA_DIR, 'lewis-short.txt');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');

const LF = 0x0A; // '\n'

// Combining diacritical marks (U+0300–U+036F) plus the general "does this
// line contain a diacritic-bearing Latin letter" range used only to locate
// where the XML front-matter / revision-log noise ends and real dictionary
// entries begin. Precomposed Latin vowels with macron/breve (e.g. ă ā ē ĭ ī
// ō ŭ ū) fall outside plain ASCII, so a simple non-ASCII test is enough here
// — the front matter is plain English admin text and is virtually all ASCII.
const HAS_DIACRITIC = /[^\x00-\x7F]/;

function normalizeHeadword(raw) {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
    .replace(/-/g, '') // hyphen inside a headword marks a prefix boundary, not a real character
    .toLowerCase()
    .trim();
}

// Heuristic used only to find the first real dictionary-entry line, so the
// ~340 lines of XML front matter / CVS revision log at the top of the file
// are skipped without hardcoding a line number. A line is a plausible first
// entry when: it has a comma, the text before that comma ("headword") is
// short (<=3 whitespace-separated tokens), doesn't start with a digit (dates
// / numbered revision notes), doesn't contain '$'/':'/';' (log markers), and
// the *line* contains a non-ASCII character (a diacritic-bearing Latin
// letter — real entries are full of these; front-matter prose almost never
// is, except one revision-log line that mentions a Latin word but which the
// digit-prefixed-date check above already excludes).
function looksLikeFirstEntryLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const commaIdx = trimmed.indexOf(',');
  if (commaIdx === -1) return false;
  const head = trimmed.slice(0, commaIdx).trim();
  if (!head) return false;
  if (/^\d/.test(head)) return false;
  if (/[$:;]/.test(head)) return false;
  if (head.split(/\s+/).length > 3) return false;
  if (!HAS_DIACRITIC.test(trimmed)) return false;
  return true;
}

function buildIndex() {
  if (!fs.existsSync(TXT_PATH)) {
    console.error(`Missing ${TXT_PATH}. Run download.sh first.`);
    process.exit(1);
  }

  const buf = fs.readFileSync(TXT_PATH);
  const index = Object.create(null);

  let lineStart = 0;
  let started = false;
  let entryCount = 0;

  for (let i = 0; i <= buf.length; i++) {
    const atEnd = i === buf.length;
    if (!atEnd && buf[i] !== LF) continue;

    // [lineStart, i) is one line's bytes (excluding the trailing \n).
    const offset = lineStart;
    const length = i - lineStart;
    lineStart = i + 1;
    if (length === 0) continue; // blank line

    const lineText = buf.toString('utf8', offset, offset + length);

    if (!started) {
      if (!looksLikeFirstEntryLine(lineText)) continue;
      started = true;
    }

    const trimmed = lineText.trim();
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1) continue; // not an entry line, skip

    const headwordRaw = trimmed.slice(0, commaIdx);
    const key = normalizeHeadword(headwordRaw);
    if (!key) continue;

    if (!index[key]) index[key] = [];
    index[key].push({ offset, length });
    entryCount++;
  }

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index));
  console.log(`Indexed ${entryCount} entries (${Object.keys(index).length} distinct headwords).`);
  return index;
}

if (require.main === module) {
  buildIndex();
}

module.exports = { buildIndex, normalizeHeadword, TXT_PATH, INDEX_PATH };
