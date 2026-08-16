#!/usr/bin/env node
// Local dev server for an interactive dependency-graph viewer over
// src/nemo_words/. Re-implements the same regex heuristic as
// scripts/gen-dgml.sh (word-boundary symbol scan, :require :as alias
// resolution) so results stay visually consistent with
// docs/nemo_words.dgml. The two scanners are kept in sync by hand (one's
// Perl, one's this file) -- re-check both if you change the heuristic.
//
//   GET  /            -> docs/graph/index.html (+ /vendor/* static assets)
//   GET  /api/graph   -> current graph JSON, scanned fresh from disk
//   POST /api/rename  -> {qid, newName} rewrites the defn/def site and
//                        every call site (same-namespace bare + cross-
//                        namespace alias/name) on disk. All-or-nothing:
//                        if the post-write `clojure ... :reload-all`
//                        smoke test fails, every touched file is reverted.
//
// Heuristic limitation (same as gen-dgml.sh): this is a text scan, not a
// real Clojure reader -- no macro expansion, no lexical-scope analysis.
// Only point this at a clean git working tree so `git diff` / `git
// checkout` remain your undo button.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src', 'nemo_words');
const WEB_DIR = path.join(__dirname, '..', 'docs', 'graph');
const PORT = 8787;

const SYM_CLASS = "A-Za-z0-9_\\-!?*<>=.+";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function boundaryRegex(name) {
  return new RegExp(`(?<![${SYM_CLASS}])${escapeRegex(name)}(?![${SYM_CLASS}])`, 'g');
}

// Returns {text, start, end} for the docstring immediately following pos
// (start/end span the whole literal, quotes included), or null if there
// isn't one.
function parseDocstring(content, pos) {
  let i = pos;
  while (i < content.length && /\s/.test(content[i])) i++;
  if (content[i] !== '"') return null;
  let j = i + 1;
  let buf = '';
  while (j < content.length && content[j] !== '"') {
    if (content[j] === '\\') { buf += content[j + 1]; j += 2; continue; }
    buf += content[j];
    j++;
  }
  return { text: buf, start: i, end: j + 1 };
}

const CATEGORY_COLOR = {
  Function: '#7fb379',
  PrivateFunction: '#9a95d6',
  Data: '#d8c25a',
  PrivateData: '#c2ac4c',
  EntryPoint: '#c85c5c',
  External: '#9a9a9a',
};

const DEF_START_RE = /^\((defn-|defn|def)\s+(?:\^\S+\s+|\^\{[^}]*\}\s+)*([A-Za-z0-9_\-!?*<>=.+]+)/gm;

// Scans src/nemo_words/*.clj fresh from disk every call -- small codebase,
// no caching needed, and it guarantees /api/graph and /api/rename never
// act on stale state.
function scanCodebase() {
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.clj')).sort();
  if (!files.length) throw new Error(`no .clj files found in ${SRC_DIR}`);

  const filePath = new Map(); // ns -> absolute path
  const nsRequires = new Map(); // ns -> {alias: fullNs}
  const nsOrder = new Map(); // ns -> [qid, ...]
  const nsSeen = new Set();
  const nodeByQid = new Map();
  const external = new Set();
  const edgeSet = new Set();

  for (const file of files) {
    const abs = path.join(SRC_DIR, file);
    const content = fs.readFileSync(abs, 'utf8');
    const nsMatch = content.match(/\(ns\s+([A-Za-z0-9_.\-]+)/);
    const ns = nsMatch ? nsMatch[1] : file.replace(/\.clj$/, '');
    nsSeen.add(ns);
    filePath.set(ns, abs);
    nsOrder.set(ns, []);

    const requires = {};
    const reqRe = /\[\s*([A-Za-z0-9_.\-]+)\s+:as\s+([A-Za-z0-9_\-]+)\s*\]/g;
    let rm;
    while ((rm = reqRe.exec(content))) requires[rm[2]] = rm[1];
    nsRequires.set(ns, requires);

    const defs = [];
    let m;
    DEF_START_RE.lastIndex = 0;
    while ((m = DEF_START_RE.exec(content))) {
      defs.push({ start: m.index, end: m.index + m[0].length, form: m[1], name: m[2] });
    }
    if (!defs.length) continue;

    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      const end = i < defs.length - 1 ? defs[i + 1].start : content.length;
      let body = content.slice(d.start, end);
      const qid = `${ns}/${d.name}`;
      const isPrivate = d.form === 'defn-' || /^\([\w-]+\s+\^:private\b/.test(body);
      const category = d.name === '-main'
        ? 'EntryPoint'
        : d.form.startsWith('defn')
          ? (isPrivate ? 'PrivateFunction' : 'Function')
          : (isPrivate ? 'PrivateData' : 'Data');
      const docSpan = d.form.startsWith('defn') ? parseDocstring(content, d.end) : null;
      const docstring = docSpan ? docSpan.text : null;
      // Blank out the docstring so it isn't scanned for calls below --
      // example code in a docstring would otherwise produce phantom edges.
      if (docSpan) {
        const relStart = docSpan.start - d.start;
        const relEnd = docSpan.end - d.start;
        body = body.slice(0, relStart) + ' '.repeat(relEnd - relStart) + body.slice(relEnd);
      }
      // Layer mirrors docs/layers.md's hand-drawn stratification, computed
      // rather than hand-set: -main is always the surface (L3), the
      // strutil adapter namespace is L1, everything else local is L2.
      const layer = d.name === '-main' ? 3 : ns.endsWith('.strutil') ? 1 : 2;

      nodeByQid.set(qid, { qid, ns, name: d.name, form: d.form, category, docstring, layer, body });
      nsOrder.get(ns).push(qid);
    }
  }

  for (const [qid, n] of nodeByQid) {
    const ns = n.ns;
    const body = n.body;

    for (const otherQid of nsOrder.get(ns)) {
      if (otherQid === qid) continue;
      const oname = nodeByQid.get(otherQid).name;
      if (boundaryRegex(oname).test(body)) {
        edgeSet.add(`${qid}\t${otherQid}`);
      }
    }

    const requires = nsRequires.get(ns);
    const aliasRe = /([A-Za-z0-9_\-]+)\/([A-Za-z0-9_\-!?*<>=.+]+)/g;
    let am;
    while ((am = aliasRe.exec(body))) {
      const [, alias, sym] = am;
      const fullNs = requires[alias];
      if (!fullNs) continue;
      if (nsSeen.has(fullNs)) {
        const targetQid = `${fullNs}/${sym}`;
        if (targetQid === qid) continue;
        if (nodeByQid.has(targetQid)) {
          edgeSet.add(`${qid}\t${targetQid}`);
        } else {
          edgeSet.add(`${qid}\t${fullNs}`);
        }
      } else {
        external.add(fullNs);
        edgeSet.add(`${qid}\t${fullNs}`);
      }
    }
  }

  for (const fullNs of external) {
    nodeByQid.set(fullNs, {
      qid: fullNs, ns: fullNs, name: fullNs, form: null,
      category: 'External', docstring: null, layer: 0, body: '',
    });
  }

  return { nsSeen, nsRequires, nsOrder, filePath, nodeByQid, edgeSet };
}

function graphJson() {
  const { nodeByQid, edgeSet } = scanCodebase();
  const nodes = [...nodeByQid.values()].map(({ body, ...rest }) => ({
    ...rest, color: CATEGORY_COLOR[rest.category],
  }));
  const edges = [...edgeSet].map((e) => {
    const [source, target] = e.split('\t');
    return { source, target };
  });
  return { nodes, edges };
}

function handleRename(qid, newName) {
  if (!/^[A-Za-z0-9_\-!?*<>=.+]+$/.test(newName)) {
    return { ok: false, status: 400, error: 'invalid name: only Clojure symbol characters allowed' };
  }
  if (newName === '-main') {
    return { ok: false, status: 400, error: '-main is a reserved entry-point name' };
  }

  const scan = scanCodebase();
  const node = scan.nodeByQid.get(qid);
  if (!node || node.category === 'External') {
    return { ok: false, status: 404, error: `unknown node ${qid}` };
  }
  if (node.name === '-main') {
    return { ok: false, status: 400, error: '-main cannot be renamed (breaks `clj -M -m`)' };
  }

  const newQid = `${node.ns}/${newName}`;
  if (scan.nodeByQid.has(newQid)) {
    return { ok: false, status: 409, error: `${newQid} already exists` };
  }

  const originals = new Map();
  for (const p of scan.filePath.values()) originals.set(p, fs.readFileSync(p, 'utf8'));

  const changedFiles = new Set();

  // Def site + every same-namespace bare call site, in one boundary-regex pass.
  const defPath = scan.filePath.get(node.ns);
  const defOriginal = originals.get(defPath);
  const defUpdated = defOriginal.replace(boundaryRegex(node.name), newName);
  if (defUpdated !== defOriginal) {
    fs.writeFileSync(defPath, defUpdated, 'utf8');
    changedFiles.add(defPath);
  }

  // Cross-namespace alias/name call sites, one file at a time.
  for (const [otherNs, p] of scan.filePath) {
    if (otherNs === node.ns) continue;
    const requires = scan.nsRequires.get(otherNs);
    const aliases = Object.keys(requires).filter((a) => requires[a] === node.ns);
    if (!aliases.length) continue;
    const original = originals.get(p);
    let updated = original;
    for (const alias of aliases) {
      const qualRe = new RegExp(
        `(?<![${SYM_CLASS}])${escapeRegex(alias)}/${escapeRegex(node.name)}(?![${SYM_CLASS}])`, 'g',
      );
      updated = updated.replace(qualRe, `${alias}/${newName}`);
    }
    if (updated !== original) {
      fs.writeFileSync(p, updated, 'utf8');
      changedFiles.add(p);
    }
  }

  if (!changedFiles.size) {
    return { ok: false, status: 500, error: 'rename matched no text; refused to write nothing' };
  }

  const nsSymbols = [...scan.filePath.keys()].map((ns) => `'${ns}`).join(' ');
  const smoke = spawnSync('clojure', ['-M', '-e', `(require ${nsSymbols} :reload-all)`], {
    cwd: ROOT, encoding: 'utf8', timeout: 30000,
  });

  if (smoke.status !== 0) {
    for (const p of changedFiles) fs.writeFileSync(p, originals.get(p), 'utf8');
    return {
      ok: false, status: 422,
      error: 'compile check failed after rename; all changes reverted',
      detail: (smoke.stderr || smoke.stdout || '').slice(0, 4000),
    };
  }

  return {
    ok: true,
    changedFiles: [...changedFiles].map((p) => path.relative(ROOT, p)),
    graph: graphJson(),
  };
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css' };

function serveStatic(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
  const abs = path.join(WEB_DIR, rel);
  if (!abs.startsWith(WEB_DIR)) { res.writeHead(403); res.end(); return; }
  fs.readFile(abs, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && u.pathname === '/api/graph') {
    try {
      send(res, 200, graphJson());
    } catch (e) {
      send(res, 500, { error: String(e.message || e) });
    }
    return;
  }

  if (req.method === 'POST' && u.pathname === '/api/rename') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        const { qid, newName } = JSON.parse(body);
        if (typeof qid !== 'string' || typeof newName !== 'string') {
          send(res, 400, { error: 'qid and newName must be strings' });
          return;
        }
        const result = handleRename(qid, newName);
        send(res, result.ok ? 200 : result.status, result);
      } catch (e) {
        send(res, 400, { error: String(e.message || e) });
      }
    });
    return;
  }

  if (req.method === 'GET') {
    serveStatic(res, u.pathname);
    return;
  }

  res.writeHead(405);
  res.end();
});

server.listen(PORT, () => {
  console.log(`nemo-words graph viewer: http://localhost:${PORT}`);
});
