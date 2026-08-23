const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { extractRow, buildDictionary, mergeSoundsByWord, isOtherRegionTagged, hasIpa } =
  require('../scripts/build-kaikki-ipa-dict.js');

test('AC1: audio-only regional entries do not block the untagged ipa fallback', () => {
  const entry = {
    word: 'tree',
    sounds: [
      { ipa: '/tɹiː/' },
      { tags: ['Received-Pronunciation'], audio: 'En-us-tree.ogg' },
      { tags: ['General-American'], audio: 'En-us-tree2.ogg' }
    ]
  };
  const row = extractRow(entry);
  assert.ok(row, 'row should not be dropped');
  assert.equal(row.genam, '/tɹiː/');
  assert.equal(row.rp, '/tɹiː/');
});

test('AC2: a real dialect-tagged ipa entry wins over the untagged fallback', () => {
  const entry = {
    word: 'word',
    sounds: [
      { ipa: '/x/' },
      { tags: ['General-American'], ipa: '/y/' }
    ]
  };
  const row = extractRow(entry);
  assert.ok(row);
  assert.equal(row.genam, '/y/');
});

test('AC3: only other-region-tagged real ipa, no untagged, no US/GA/RP tag -> dropped', () => {
  const entry = {
    word: 'multiculturalism',
    sounds: [
      { tags: ['Canada'], ipa: '/a/' },
      { tags: ['Southern-US'], ipa: '/b/' }
    ]
  };
  const row = extractRow(entry);
  assert.equal(row, null);
});

test('AC5: the newer three-tag RP naming convention still populates RP-IPA', () => {
  const entry = {
    word: 'freed',
    sounds: [
      { tags: ['British', 'Southern', 'Standard'], ipa: '/fɹɪj/' }
    ]
  };
  const row = extractRow(entry);
  assert.ok(row);
  assert.equal(row.rp, '/fɹɪj/');
});

test('AC6: a British-Isles regional real ipa counts toward RP instead of blocking the untagged fallback', () => {
  const entry = {
    word: 'month',
    sounds: [
      { ipa: '/mʌnθ/' },
      { tags: ['Received-Pronunciation'], audio: 'a.ogg' },
      { tags: ['General-American'], audio: 'b.ogg' },
      { tags: ['Ireland'], ipa: '/mʊnt̪/' }
    ]
  };
  const row = extractRow(entry);
  assert.ok(row);
  assert.equal(row.rp, '/mʊnt̪/');
  assert.equal(row.genam, '/mʌnθ/');
});

test('AC7: a genuinely different non-British-Isles region blocks the untagged fallback even with audio-only noise present', () => {
  const entry = {
    word: 'month',
    sounds: [
      { ipa: '/x/' },
      { tags: ['Received-Pronunciation'], audio: 'a.ogg' },
      { tags: ['General-American'], audio: 'b.ogg' },
      { tags: ['Canada'], ipa: '/y/' }
    ]
  };
  const row = extractRow(entry);
  assert.equal(row, null);
});

test('AC8: a homophone-only sounds entry populates the Homophone column', () => {
  const entry = {
    word: 'pie',
    sounds: [
      { ipa: '/paɪ/' },
      { homophone: 'pi' }
    ]
  };
  const row = extractRow(entry);
  assert.ok(row);
  assert.equal(row.homophone, 'pi');
});

test('AC9: no homophone entry anywhere gets an empty Homophone column', () => {
  const entry = {
    word: 'tree',
    sounds: [
      { ipa: '/tɹiː/' },
      { tags: ['General-American'], ipa: '/tɹiː/' }
    ]
  };
  const row = extractRow(entry);
  assert.ok(row);
  assert.equal(row.homophone, '');
});

test('AC4: regenerating the TSV recovers previously-missing words without regressing existing rows',
  { skip: !fs.existsSync(path.join(__dirname, '..', 'resources', 'data', 'kaikki-en.jsonl')) &&
      'resources/data/kaikki-en.jsonl not present locally' },
  async () => {
    const inputPath = path.join(__dirname, '..', 'resources', 'data', 'kaikki-en.jsonl');
    const oldTsvPath = path.join(__dirname, '..', 'resources', 'data', 'en_US_RP_ipa.tsv');

    const sounds = await mergeSoundsByWord(inputPath);
    const rows = await buildDictionary(inputPath);
    const newMap = new Map(rows.map(r => [r.word, r]));

    for (const w of ['ship', 'the', 'tree', 'bus']) {
      const row = newMap.get(w);
      assert.ok(row, `expected a recovered row for "${w}"`);
      assert.ok(row.genam || row.rp, `expected "${w}" to have non-empty GenAm-IPA or RP-IPA`);
    }

    // A word's merged sounds legitimately blocks the untagged fallback
    // (per AC3/AC7) when it carries a real (non-audio-only) ipa entry
    // tagged Canada or Southern-US. Such words are allowed to regress
    // from the old file's (buggy) output — every other word must not.
    function blockedByRegionRule(word) {
      const s = sounds.get(word) || [];
      return s.some(entry => hasIpa(entry) && isOtherRegionTagged(entry));
    }

    const oldLines = fs.readFileSync(oldTsvPath, 'utf8').split('\n').filter(Boolean);
    for (const line of oldLines) {
      const [word, oldGenam, oldRp] = line.split('\t');
      const newRow = newMap.get(word);
      if (!newRow) {
        assert.ok(blockedByRegionRule(word), `word "${word}" unexpectedly dropped, not explained by AC3/AC7's blocking rule`);
        continue;
      }
      if (oldGenam && !newRow.genam) {
        assert.ok(blockedByRegionRule(word), `"${word}" GenAm-IPA unexpectedly regressed to empty`);
      }
      if (oldRp && !newRow.rp) {
        assert.ok(blockedByRegionRule(word), `"${word}" RP-IPA unexpectedly regressed to empty`);
      }
    }
  });
