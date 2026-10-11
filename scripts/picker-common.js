// Shared plumbing for the local grid pickers (comic-picker.js, image-picker.js):
// finding a word's _vivian grids, reading its card row + story, attaching a
// finished image to the card (Image column + anki-sync.js), and the small
// HTTP server both pickers run.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'images', 'mnemonic');
const TERMS = path.join(ROOT, 'anki', 'reading-room-terms.txt');
const SYNC_LOG = path.join(ROOT, 'anki', 'sync.log');

// An optional leading hyphen admits suffix word parts (-tomy, -cy).
const WORD_RE = /^-?[A-Za-z][A-Za-z0-9'-]*$/;
const FILE_RE = /^[A-Za-z0-9'._-]+\.png$/;

// <word>.grid.png and <word>.<anything>.grid.png both belong to <word>.
function gridsFor(word) {
  return fs.readdirSync(IMG_DIR)
    .filter((f) => f === `${word}.grid.png` || (f.startsWith(`${word}.`) && f.endsWith('.grid.png')))
    .sort((a, b) => (a === `${word}.grid.png` ? -1 : b === `${word}.grid.png` ? 1 : a.localeCompare(b)));
}

function allWords() {
  const words = new Set();
  for (const f of fs.readdirSync(IMG_DIR)) {
    if (f.endsWith('.grid.png')) words.add(f.split('.')[0]);
  }
  return [...words].sort();
}

// Words grouped by the local date of their newest grid file, newest date
// first and newest word first within a date -- so fresh grids sit at the top.
function wordGroups() {
  const newest = new Map();
  for (const f of fs.readdirSync(IMG_DIR)) {
    if (!f.endsWith('.grid.png')) continue;
    const word = f.split('.')[0];
    const t = fs.statSync(path.join(IMG_DIR, f)).mtimeMs;
    if (!(newest.get(word) >= t)) newest.set(word, t);
  }
  const day = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const groups = new Map();
  for (const [word, t] of [...newest].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    if (!groups.has(day(t))) groups.set(day(t), []);
    groups.get(day(t)).push(word);
  }
  return [...groups].map(([date, words]) => ({ date, words }));
}

function cardRowIndex(lines, word) {
  return lines.findIndex((l) => !l.startsWith('#') && l.split('\t')[0] === word);
}

// Sets the Image column (3rd) of the word's row, padding short rows.
function attachImage(word, file) {
  const lines = fs.readFileSync(TERMS, 'utf8').split('\n');
  const i = cardRowIndex(lines, word);
  if (i < 0) return { attached: false, note: `no card row for "${word}"` };
  const cols = lines[i].split('\t');
  while (cols.length < 3) cols.push('');
  cols[2] = file;
  lines[i] = cols.join('\t');
  fs.writeFileSync(TERMS, lines.join('\n'));
  const r = spawnSync('node', [path.join(__dirname, 'anki-sync.js'), word], {
    cwd: ROOT,
    env: { ...process.env, ANKI_FILE: 'reading-room-terms.txt' },
    encoding: 'utf8',
  });
  const out = (r.stdout + r.stderr).trim();
  const sync = r.status === 0 ? 'ok' : `failed: ${out.split('\n').pop()}`;
  fs.appendFileSync(SYNC_LOG,
    `${new Date().toISOString().replace(/\.\d+Z$/, 'Z')} term=${word} file=patched(image: ${file}) sync=${sync}\n`);
  return { attached: true, sync, syncOutput: out };
}

// The card's Back is the story (plain text); fall back to the mnemonic log
// for a word that has a logged story but no card yet. A word-part row's Back
// is HTML with the story (if any) ahead of an <hr>, so keep only that part.
function storyFor(line, word) {
  const back = line ? line.split('\t')[1] : '';
  if (back.includes('<hr>')) return back.split('<hr>')[0].replace(/^🎭\s*/, '');
  if (back && !back.includes('<')) return back;
  return loggedField(word, 'sentence|story');
}

// The word's meaning: the card's Gloss column (5th) if set; else, for a
// word-part row, the meaning line of its <i>Origin</i><br>meaning<br>... Back;
// else the mnemonic log's (longer) sense.
function meaningFor(line, word) {
  const cols = line ? line.split('\t') : [];
  if (cols[4]) return cols[4];
  const parts = (cols[1] || '').split('<hr>').pop().split('<br>');
  if (parts.length > 1 && parts[0].startsWith('<i>')) return parts[1].replace(/<[^>]*>/g, '').trim();
  return loggedField(word, 'sense');
}

function loggedField(word, keys) {
  const r = spawnSync('node', [path.join(__dirname, 'find-mnemonic.js'), word], { encoding: 'utf8' });
  const m = r.status === 0 && r.stdout.match(new RegExp(`^(?:${keys})\\s*:\\s*(.+)$`, 'im'));
  return m ? m[1].trim() : null;
}

// What both pickers' GET /api/grids return; `existing` names the output file
// the picker would write, reported back only if it's already on disk.
function wordInfo(word, existing) {
  const lines = fs.readFileSync(TERMS, 'utf8').split('\n');
  const row = cardRowIndex(lines, word);
  return {
    word,
    grids: gridsFor(word),
    hasCard: row >= 0,
    story: storyFor(lines[row], word),
    meaning: meaningFor(lines[row], word),
    existing: fs.existsSync(path.join(IMG_DIR, existing)) ? existing : null,
  };
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

// Serves webDir/index.html, the word list, a word's grids (via info(word)),
// PNGs from images/mnemonic/, and POST /api/confirm (via confirm(body)).
function servePicker({ name, port, webDir, info, confirm }) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (req.method === 'GET' && url.pathname === '/') {
        return send(res, 200, fs.readFileSync(path.join(webDir, 'index.html')), 'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && url.pathname === '/api/words') {
        return send(res, 200, { words: allWords(), groups: wordGroups(), initial: process.argv[2] || null });
      }
      if (req.method === 'GET' && url.pathname === '/api/grids') {
        const word = url.searchParams.get('word') || '';
        if (!WORD_RE.test(word)) return send(res, 400, { error: 'bad word' });
        return send(res, 200, info(word));
      }
      if (req.method === 'GET' && url.pathname.startsWith('/img/')) {
        const file = decodeURIComponent(url.pathname.slice(5));
        if (!FILE_RE.test(file) || !fs.existsSync(path.join(IMG_DIR, file))) return send(res, 404, { error: 'not found' });
        return send(res, 200, fs.readFileSync(path.join(IMG_DIR, file)), 'image/png');
      }
      if (req.method === 'POST' && url.pathname === '/api/confirm') {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          try {
            send(res, 200, confirm(JSON.parse(body)));
          } catch (e) {
            send(res, 400, { error: e.message });
          }
        });
        return;
      }
      send(res, 404, { error: 'not found' });
    } catch (e) {
      send(res, 500, { error: e.message });
    }
  });

  server.listen(port, '127.0.0.1', () => {
    const q = process.argv[2] ? `?word=${encodeURIComponent(process.argv[2])}` : '';
    console.log(`${name}: http://localhost:${port}/${q}`);
  });
  return server;
}

module.exports = { ROOT, IMG_DIR, WORD_RE, gridsFor, attachImage, wordInfo, servePicker };
