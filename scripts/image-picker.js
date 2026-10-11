#!/usr/bin/env node
// Local picker for choosing ONE cell of a _vivian 3×3 grid as a word's
// mnemonic image -- the single-image counterpart of comic-picker.js. The page
// narrows it down row by row (one candidate per row, the other two dim), then
// picks the final image from the three candidates. Confirm crops it with
// scripts/crop-grid-cell.sh to images/mnemonic/<word>.png and, by default,
// attaches it to the word's card (Image column + anki-sync.js) -- the same
// default step CLAUDE.md describes for a hand-run crop.
//
//   node scripts/image-picker.js [word]   -> http://localhost:8789
//
//   GET  /                -> docs/image-picker/index.html
//   GET  /api/words       -> words that have at least one grid
//   GET  /api/grids?word= -> that word's grids + whether it has a card row
//   GET  /img/<file>      -> a grid or image PNG from images/mnemonic/
//   POST /api/confirm     -> {word, grid, cell, attach}
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, IMG_DIR, WORD_RE, gridsFor, attachImage, wordInfo, servePicker } = require('./picker-common');

function confirm({ word, grid, cell, attach }) {
  if (!WORD_RE.test(word || '')) throw new Error('bad word');
  if (!gridsFor(word).includes(grid)) throw new Error(`unknown grid ${grid}`);
  if (!Number.isInteger(cell) || cell < 1 || cell > 9) throw new Error(`bad cell ${cell}`);
  const file = `${word}.png`;
  const r = spawnSync(path.join(__dirname, 'crop-grid-cell.sh'),
    [path.join(IMG_DIR, grid), String(cell), path.join(IMG_DIR, file)], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`crop-grid-cell failed: ${r.stderr.trim()}`);
  const result = { file, cropped: r.stdout.trim() };
  if (attach) Object.assign(result, attachImage(word, file));
  return result;
}

servePicker({
  name: 'image-picker',
  port: Number(process.env.PORT) || 8789,
  webDir: path.join(ROOT, 'docs', 'image-picker'),
  info: (word) => wordInfo(word, `${word}.png`),
  confirm,
});
