#!/usr/bin/env node
// Local picker for turning _vivian grid cells into a 2×2 mnemonic comic
// (ADR-0020/0021/0022). Left pane: every images/mnemonic/<word>*.grid.png as
// a clickable 3×3; right pane: the comic, redrawn live as cells are picked.
// Confirm composes the real file with scripts/compose-comic.sh and, by
// default, attaches it to the word's card (Image column + anki-sync.js) --
// the same default step CLAUDE.md describes for a hand-run crop.
//
//   node scripts/comic-picker.js [word]   -> http://localhost:8788
//
//   GET  /                -> docs/comic-picker/index.html
//   GET  /api/words       -> words that have at least one grid
//   GET  /api/grids?word= -> that word's grids + whether it has a card row
//   GET  /img/<file>      -> a grid or comic PNG from images/mnemonic/
//   POST /api/confirm     -> {word, cells: [{grid, cell}], attach}
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, IMG_DIR, WORD_RE, gridsFor, attachImage, wordInfo, servePicker } = require('./picker-common');

function confirm({ word, cells, attach }) {
  if (!WORD_RE.test(word || '')) throw new Error('bad word');
  if (!Array.isArray(cells) || cells.length < 3 || cells.length > 4) {
    throw new Error('pick 3 or 4 cells');
  }
  const grids = new Set(gridsFor(word));
  const args = cells.map(({ grid, cell }) => {
    if (!grids.has(grid)) throw new Error(`unknown grid ${grid}`);
    if (!Number.isInteger(cell) || cell < 1 || cell > 9) throw new Error(`bad cell ${cell}`);
    return `${path.join(IMG_DIR, grid)}:${cell}`;
  });
  const file = `${word}.comic.png`;
  const out = path.join(IMG_DIR, file);
  const r = spawnSync(path.join(__dirname, 'compose-comic.sh'), [args[0].split(':')[0], out, ...args], {
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`compose-comic failed: ${r.stderr.trim()}`);
  const result = { file, composed: r.stdout.trim() };
  if (attach) Object.assign(result, attachImage(word, file));
  return result;
}

servePicker({
  name: 'comic-picker',
  port: Number(process.env.PORT) || 8788,
  webDir: path.join(ROOT, 'docs', 'comic-picker'),
  info: (word) => wordInfo(word, `${word}.comic.png`),
  confirm,
});
