#!/usr/bin/env node
'use strict';
// AI labels for the image-pick gold set, and their agreement with Flash's labels.
//
//   node scripts/gold-image-pick-ai.js label [--models sonnet,qwen] [--grids G001,G002]
//   node scripts/gold-image-pick-ai.js score
//
// Each model sees the whole 3×3 grid, the story sentence and guidelines.md, and gives
// each of the 9 cells one mark (best | ok | weak | wrong) with a note, plus a reason —
// the same task Flash does on the labeling page. Answers are cached per model in
// data/gold/image-pick/ai/labels.<model>.<guidelines version>.json, so a re-run only asks
// for the missing grids, and a new guidelines version starts a new file.
// The callers are SP-069's (claude -p with the Read tool; LM Studio over curl).

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { claudeVision, localVision } = require('../spikes/sp-069/lib/models');
const { MARKS, agreement } = require('./lib/gold-image-pick');

const ROOT = path.join(__dirname, '..');
const DIR = process.env.GOLD_DIR || path.join(ROOT, 'data', 'gold', 'image-pick');
const AI_DIR = path.join(DIR, 'ai');
const MODELS = { sonnet: 'sonnet', qwen: 'qwen/qwen3-vl-8b' };

const readJson = (f, empty) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : empty);
// The guidelines version, e.g. "v3" from the title "... (v3)".
const guideVersion = () => (/\((v\d+)\)/.exec(fs.readFileSync(path.join(DIR, 'guidelines.md'), 'utf8')) || [])[1] || 'v0';
const aiFile = (name, v = guideVersion()) => path.join(AI_DIR, `labels.${name}.${v}.json`);
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? null : process.argv[i + 1];
};

function imageDir() {
  if (process.env.GOLD_IMG_DIR) return process.env.GOLD_IMG_DIR;
  const own = path.join(ROOT, 'images', 'mnemonic');
  if (fs.existsSync(own) && fs.readdirSync(own).some((f) => f.endsWith('.grid.png'))) return own;
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim();
  return path.join(path.dirname(common), 'images', 'mnemonic');
}

function prompt(g) {
  const guide = fs.readFileSync(path.join(DIR, 'guidelines.md'), 'utf8');
  return `Use the Read tool to look at the image file picture.png in the current folder.

It is a 3×3 grid of nine candidate cells for one story sentence. The cells are numbered 1 to 9: left to right, top to bottom (1 2 3 on the top row, 7 8 9 on the bottom row).

Story sentence: "${g.story}"

Label the grid with these guidelines:

<guidelines>
${guide}
</guidelines>

Answer with JSON only, in this shape:
{"cells": {"1": {"mark": "best|ok|weak|wrong", "note": "short reason"}, ... "9": {...}}, "reason": "why the best cell wins over the next one"}
Give all 9 cells a mark. Use exactly 1 "best", unless every cell is "weak" or "wrong".`;
}

const schema = {
  name: 'grid_label',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['cells', 'reason'],
    properties: {
      cells: {
        type: 'object',
        additionalProperties: false,
        required: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        properties: Object.fromEntries(
          ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((c) => [
            c,
            { type: 'object', additionalProperties: false, required: ['mark', 'note'], properties: { mark: { type: 'string', enum: MARKS }, note: { type: 'string' } } },
          ]),
        ),
      },
      reason: { type: 'string' },
    },
  },
};

// Model text → { cells: {c: mark}, notes: {c: note}, reason }.
function parse(text) {
  const s = String(text);
  const j = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
  const cells = {};
  const notes = {};
  for (const [c, v] of Object.entries(j.cells || {})) {
    const mark = String(v.mark || '').toLowerCase().trim();
    if (!MARKS.includes(mark)) throw new Error(`cell ${c}: unknown mark "${v.mark}"`);
    cells[c] = mark;
    if (v.note) notes[c] = String(v.note);
  }
  if (Object.keys(cells).length !== 9) throw new Error(`${Object.keys(cells).length} cells marked, not 9`);
  return { cells, notes, reason: String(j.reason || '') };
}

async function label(names, ids) {
  fs.mkdirSync(AI_DIR, { recursive: true });
  const grids = readJson(path.join(DIR, 'grids.json'), []).filter((g) => !ids || ids.includes(g.id));
  const imgDir = imageDir();
  await Promise.all(
    names.map(async (name) => {
      const model = MODELS[name];
      if (!model) throw new Error(`unknown model ${name} (use ${Object.keys(MODELS).join(', ')})`);
      const ask = name === 'qwen' ? localVision(model) : claudeVision(model);
      const file = aiFile(name);
      const out = readJson(file, {});
      for (const g of grids) {
        if (out[g.id] && !out[g.id].failed) continue;
        const t0 = Date.now();
        try {
          const r = await ask(prompt(g), path.join(imgDir, g.grid), name === 'qwen' ? schema : undefined);
          out[g.id] = { ...parse(r.text), model, ms: r.ms, costUsd: r.costUsd, at: new Date().toISOString() };
          console.error(`${name} ${g.id}: ok ${Math.round((Date.now() - t0) / 1000)}s`);
        } catch (err) {
          out[g.id] = { failed: err.message.slice(0, 300), model, at: new Date().toISOString() };
          console.error(`${name} ${g.id}: FAILED ${err.message.slice(0, 160)}`);
        }
        fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
      }
    }),
  );
}

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-');

function printPair(title, a, b, grids) {
  const r = agreement(grids, a, b);
  console.log(`\n## ${title} (${r.grids} grids, ${r.cells} cells)`);
  console.log(`same mark: ${pct(r.same, r.cells)}   kappa: ${r.kappa.toFixed(2)}   weighted kappa (order best>ok>weak>wrong): ${r.weightedKappa.toFixed(2)}`);
  console.log(`B's best is A's best: ${r.best.same}/${r.best.of}   in A's ok set: ${r.best.inOk}/${r.best.of}   A marked it wrong: ${r.best.wrong}/${r.best.of}`);
  console.log(`A's wrong cells that B also marks wrong: ${r.wrongRecall.hit}/${r.wrongRecall.of}`);
  console.log(`\nrows = A, columns = B\n${['', ...MARKS].map((s) => s.padEnd(7)).join('')}`);
  for (const m of MARKS) console.log([m, ...MARKS.map((n) => String(r.confusion[m][n]))].map((s) => s.padEnd(7)).join(''));
  console.log(`\nbiggest gaps (A mark → B mark: cells):`);
  for (const [k, n] of r.gaps.slice(0, 6)) console.log(`  ${k}: ${n}`);
  return r;
}

function score(v = guideVersion()) {
  const grids = readJson(path.join(DIR, 'grids.json'), []);
  const flash = readJson(path.join(DIR, 'labels.json'), {});
  console.log(`# AI labels made with guidelines ${v}`);
  const ai = Object.fromEntries(Object.keys(MODELS).map((n) => [n, Object.fromEntries(Object.entries(readJson(aiFile(n, v), {})).filter(([, v]) => !v.failed))]));
  for (const n of Object.keys(MODELS)) printPair(`Flash (A) vs ${n} (B)`, flash, ai[n], grids);
  printPair('sonnet (A) vs qwen (B)', ai.sonnet, ai.qwen, grids);
}

const cmd = process.argv[2];
if (cmd === 'label') {
  const names = (arg('--models') || 'sonnet,qwen').split(',').filter(Boolean);
  const ids = arg('--grids') ? arg('--grids').split(',') : null;
  label(names, ids).catch((err) => {
    console.error(err.message);
    process.exit(2);
  });
} else if (cmd === 'score') score(arg('--guidelines') || undefined);
else {
  console.error('usage: node scripts/gold-image-pick-ai.js label [--models sonnet,qwen] [--grids G001,...] | score [--guidelines v2]');
  process.exit(2);
}
