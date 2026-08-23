#!/usr/bin/env node
// Extracts word -> GenAm-IPA / RP-IPA / Homophone rows from kaikki's
// English dictionary JSONL dump. See docs/user-stories/US-016.md.

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DEFAULT_OUTPUT = path.join('resources', 'data', 'en_US_RP_ipa.tsv');
const DEFAULT_INPUT = path.join('resources', 'data', 'kaikki-en.jsonl');

function hasIpa(soundsEntry) {
  return typeof soundsEntry.ipa === 'string' && soundsEntry.ipa.length > 0;
}

function isUntagged(soundsEntry) {
  return !soundsEntry.tags || soundsEntry.tags.length === 0;
}

const GA_TAG_RE = /^(US|General-American)$/i;
const RP_TAG_RE = /^(RP|Received-Pronunciation)$/i;

function isGaTagged(soundsEntry) {
  return !!(soundsEntry.tags && soundsEntry.tags.some(t => GA_TAG_RE.test(t)));
}

function isBritishSouthernStandardCombo(soundsEntry) {
  const tags = soundsEntry.tags;
  if (!tags) return false;
  const lower = tags.map(t => t.toLowerCase());
  return ['british', 'southern', 'standard'].every(t => lower.includes(t));
}

const RP_ADJACENT_TAG_RE = /^(Ireland|Northern-Ireland)$/i;

function isRpTagged(soundsEntry) {
  if (soundsEntry.tags && soundsEntry.tags.some(t => RP_TAG_RE.test(t) || RP_ADJACENT_TAG_RE.test(t))) {
    return true;
  }
  return isBritishSouthernStandardCombo(soundsEntry);
}

// Other recognized dialect/region tags kaikki uses, besides the GA/RP
// (and RP-adjacent British-Isles) tags handled above. A real-ipa entry
// tagged with one of these blocks the untagged fallback, since it
// signals genuine dialectal variation the untagged form doesn't
// necessarily represent. Deliberately limited to the tags the ACs
// themselves evidence (Canada, Southern-US) rather than every region tag
// kaikki uses: checking a broader guessed list against the real corpus
// (docs/issues/investigation-002-us-016-kaikki-dialect-tag-gating.md)
// produced regressions on ordinary words (e.g. "ace", tagged
// "Australia") that no AC calls for blocking. Widening this list is a
// known-incomplete, deliberately out-of-scope follow-up, not a bug in
// this implementation.
const OTHER_REGION_TAG_RE = /^(Canada|Southern-US)$/i;

function isOtherRegionTagged(soundsEntry) {
  if (isGaTagged(soundsEntry) || isRpTagged(soundsEntry)) return false;
  return !!(soundsEntry.tags && soundsEntry.tags.some(t => OTHER_REGION_TAG_RE.test(t)));
}

function collectIpas(sounds, predicate) {
  const seen = new Set();
  const out = [];
  for (const s of sounds) {
    if (!hasIpa(s)) continue;
    if (!predicate(s)) continue;
    if (!seen.has(s.ipa)) {
      seen.add(s.ipa);
      out.push(s.ipa);
    }
  }
  return out;
}

function pickDialectIpas(sounds) {
  const gaValues = collectIpas(sounds, isGaTagged);
  const rpValues = collectIpas(sounds, isRpTagged);
  const blocked = sounds.some(s => hasIpa(s) && isOtherRegionTagged(s));
  const untaggedValues = blocked ? [] : collectIpas(sounds, isUntagged);

  const genamValues = gaValues.length ? gaValues : untaggedValues;
  const finalRpValues = rpValues.length ? rpValues : untaggedValues;

  return {
    genam: genamValues.join(', '),
    rp: finalRpValues.join(', ')
  };
}

function pickHomophone(sounds) {
  const found = sounds.find(s => typeof s.homophone === 'string' && s.homophone.length > 0);
  return found ? found.homophone : '';
}

function extractRow(entry) {
  const sounds = entry.sounds || [];
  const { genam, rp } = pickDialectIpas(sounds);

  if (!genam && !rp) return null;

  return {
    word: entry.word,
    genam: genam || '',
    rp: rp || '',
    homophone: pickHomophone(sounds)
  };
}

async function mergeSoundsByWord(inputPath) {
  const merged = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (e) {
      continue; // a handful of kaikki lines contain unescaped raw newlines
    }
    if (!entry || !entry.word) continue;
    const word = entry.word.toLowerCase();
    if (!merged.has(word)) merged.set(word, []);
    merged.get(word).push(...(entry.sounds || []));
  }

  return merged;
}

async function buildDictionary(inputPath) {
  const merged = await mergeSoundsByWord(inputPath);

  const rows = [];
  for (const [word, sounds] of merged) {
    const row = extractRow({ word, sounds });
    if (row) rows.push(row);
  }
  return rows;
}

function formatTsv(rows) {
  return rows.map(r => `${r.word}\t${r.genam}\t${r.rp}\t${r.homophone}`).join('\n') + '\n';
}

async function main() {
  const outputPath = process.argv[2] || DEFAULT_OUTPUT;
  const inputPath = process.argv[3] || DEFAULT_INPUT;
  const rows = await buildDictionary(inputPath);
  fs.writeFileSync(outputPath, formatTsv(rows));
}

if (require.main === module) {
  main();
}

module.exports = {
  extractRow,
  pickDialectIpas,
  buildDictionary,
  mergeSoundsByWord,
  formatTsv,
  isOtherRegionTagged,
  hasIpa
};
