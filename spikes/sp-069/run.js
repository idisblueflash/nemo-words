#!/usr/bin/env node
"use strict";

// SP-069 spike run: caption the cells of SP-066's 20 tuning grids with a
// cheaper model (Haiku, a local LM Studio vision model), have Opus judge each
// caption, and compare with Sonnet's cached SP-066 captions.
//
//   node spikes/sp-069/run.js --models qwen/qwen3-vl-4b[,haiku] [--grids N | --words a,b] [--no-judge]
//   node spikes/sp-069/run.js --report     # write the report from the cache
//   a local model named <id>+schema writes its caption under the JSON schema (lib/schema.js)
//
// Grids go in SP-066's order: its early picks first, then its tuning order.
// Everything is cached in spikes/sp-069/raw/, so a re-run pays only for new
// cells: captions.<model>.json (grid → cell → caption or failure) and
// judgments.json ("model|grid|cell" → judgment). Sonnet's captions are read
// from spikes/sp-066/raw/captions.json and never made again.

const fs = require("node:fs");
const path = require("node:path");
const { cropCell } = require("../sp-029/lib/caption");
const { prompt, parseCaption, promptKey } = require("../sp-066/lib/caption");
const { ClaudeError, UsageLimitError, pool } = require("../sp-066/lib/claude");
const { captioner, claudeVision, isLocal } = require("./lib/models");
const { captionSchema } = require("./lib/schema");
const { PARTS, judgePrompt, parseJudgment, meanScore } = require("./lib/judge");

const HERE = __dirname;
const REPO = path.resolve(HERE, "../..");
const RAW = path.join(HERE, "raw");
const SP066 = path.join(REPO, "spikes/sp-066/raw");
const imageDir = () => {
  if (process.env.SP069_IMAGE_DIR) return process.env.SP069_IMAGE_DIR;
  const own = path.join(REPO, "images/mnemonic");
  // images are gitignored: a worktree reads them from the main checkout
  return fs.existsSync(own) ? own : path.resolve(REPO, "../../..", "images/mnemonic");
};

const readJson = (f, dflt) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : dflt);
const writeJson = (f, v) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(v, null, 2) + "\n");
};
const capFile = (model) => path.join(RAW, `captions.${model.replace(/[^a-z0-9.-]+/gi, "_")}.json`);
const JUDGE_FILE = path.join(RAW, "judgments.json");

function words() {
  const split = readJson(path.join(SP066, "split.json"));
  const kept = readJson(path.join(REPO, "spikes/sp-029/raw/grids.json")).kept;
  const order = [...new Set([...split.earlyPicks.map((e) => e.word), ...split.tuningOrder])].filter((w) => split.tuning.includes(w));
  return order.map((w) => ({ word: w, grid: kept.find((k) => k.word === w).grid }));
}

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? null : process.argv[i + 1];
};

const cellPicture = (dir, grid, cell) => {
  const f = path.join(dir, `${grid}.${cell}.png`);
  if (!fs.existsSync(f)) cropCell(path.join(imageDir(), grid), cell, f);
  return f;
};

async function captionModel(model, ws, lists, cellsDir) {
  const file = capFile(model);
  const cache = readJson(file, {});
  const ask = captioner(model);
  const todo = [];
  for (const w of ws) for (let c = 1; c <= 9; c++) if (!cache[w.grid]?.[c]) todo.push({ ...w, cell: c });
  console.error(`${model}: ${todo.length} cells to caption`);
  await pool(todo, isLocal(model) ? 1 : 4, async ({ word, grid, cell }) => {
    const list = lists[word];
    const main = list.mainSubject ?? null;
    const p = prompt(list.items, word, main);
    let entry;
    try {
      const r = await ask(p, cellPicture(cellsDir, grid, cell), model.endsWith("+schema") ? captionSchema(list.items, word, main) : undefined);
      try {
        entry = { ...parseCaption(r.text, list.items, word, main), promptKey: promptKey(list.items, word, main), ms: r.ms, costUsd: r.costUsd };
      } catch (err) {
        if (!(err instanceof ClaudeError)) throw err;
        entry = { failed: err.message, raw: r.text.slice(0, 4000), ms: r.ms, costUsd: r.costUsd };
      }
    } catch (err) {
      if (!(err instanceof ClaudeError)) throw err;
      entry = { failed: err.message, transport: true };
    }
    cache[grid] = { ...(cache[grid] || {}), [cell]: entry };
    writeJson(file, cache);
    console.error(`  ${model} ${grid} ${cell}: ${entry.failed ? "FAILED " + entry.failed.slice(0, 100) : "ok"} ${entry.ms ? Math.round(entry.ms / 1000) + "s" : ""}`);
  });
  // a transport failure (server down) isn't a caption the model wrote: drop it so a re-run tries again
  for (const g of Object.keys(cache)) for (const c of Object.keys(cache[g])) if (cache[g][c].transport) delete cache[g][c];
  writeJson(file, cache);
  return cache;
}

async function judgeAll(models, ws, lists, cellsDir) {
  const judgments = readJson(JUDGE_FILE, {});
  const opus = claudeVision("opus");
  const todo = [];
  for (const model of models) {
    const caps = model === "sonnet" ? readJson(path.join(SP066, "captions.json")) : readJson(capFile(model), {});
    for (const w of ws)
      for (let c = 1; c <= 9; c++) {
        const cap = caps[w.grid]?.[c];
        const key = `${model}|${w.grid}|${c}`;
        if (cap && !cap.failed && !judgments[key]) todo.push({ key, word: w.word, grid: w.grid, cell: c, cap });
      }
  }
  console.error(`opus: ${todo.length} captions to judge`);
  let failed = 0;
  await pool(todo, 4, async ({ key, word, grid, cell, cap }) => {
    try {
      const r = await opus(judgePrompt(lists[word], cap), cellPicture(cellsDir, grid, cell));
      judgments[key] = { ...parseJudgment(r.text, lists[word]), costUsd: r.costUsd };
      writeJson(JUDGE_FILE, judgments);
    } catch (err) {
      if (!(err instanceof ClaudeError)) throw err;
      failed++;
      console.error(`  judge ${key} failed: ${err.message.slice(0, 150)}`);
    }
  });
  if (failed) console.error(`opus: ${failed} judgments failed (re-run to retry)`);
  return judgments;
}

function summary(models, ws) {
  const judgments = readJson(JUDGE_FILE, {});
  const rows = [];
  for (const model of models) {
    const caps = model === "sonnet" ? readJson(path.join(SP066, "captions.json")) : readJson(capFile(model), {});
    let cells = 0, parsed = 0, ms = 0, cost = 0, timed = 0, invented = 0, judged = 0;
    const parts = Object.fromEntries(PARTS.map((p) => [p, []]));
    const means = [];
    for (const w of ws)
      for (let c = 1; c <= 9; c++) {
        const cap = caps[w.grid]?.[c];
        if (!cap) continue;
        cells++;
        if (cap.ms) (ms += cap.ms), timed++;
        if (cap.costUsd) cost += cap.costUsd;
        if (cap.failed) continue;
        parsed++;
        const j = judgments[`${model}|${w.grid}|${c}`];
        if (!j) continue;
        judged++;
        invented += j.invented.length;
        means.push(meanScore(j.scores));
        for (const p of PARTS) if (j.scores[p] !== null) parts[p].push(j.scores[p]);
      }
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    rows.push({
      model, cells, parsed, judged, mean: avg(means),
      parts: Object.fromEntries(PARTS.map((p) => [p, avg(parts[p])])),
      invented, secPerCell: timed ? ms / timed / 1000 : null, costPerGrid: cells ? (cost / cells) * 9 : null,
      spread: means.length ? Math.max(...means) - Math.min(...means) : null,
    });
  }
  return rows;
}

function printSummary(rows) {
  const f = (x, d = 2) => (x === null || x === undefined ? "-" : x.toFixed(d));
  const sonnet = rows.find((r) => r.model === "sonnet");
  console.log(["model", "cells", "parsed", "judged", "mean", "%sonnet", ...PARTS, "invented", "s/cell", "$/grid"].join("\t"));
  for (const r of rows) {
    console.log([r.model, r.cells, r.parsed, r.judged, f(r.mean), sonnet && sonnet.mean ? f((100 * r.mean) / sonnet.mean, 0) + "%" : "-", ...PARTS.map((p) => f(r.parts[p])), r.invented, f(r.secPerCell, 1), r.model === "sonnet" ? "-" : f(r.costPerGrid, 3)].join("\t"));
  }
}

async function main() {
  const lists = readJson(path.join(SP066, "must-see.json"));
  let ws = words();
  const only = arg("--words");
  const n = arg("--grids");
  if (only) ws = ws.filter((w) => only.split(",").includes(w.word));
  else if (n) ws = ws.slice(0, Number(n));
  const models = (arg("--models") || "").split(",").filter(Boolean);
  const cellsDir = path.join(RAW, "cells");
  fs.mkdirSync(cellsDir, { recursive: true });
  try {
    for (const m of models) await captionModel(m, ws, lists, cellsDir);
    if (!process.argv.includes("--no-judge")) await judgeAll(["sonnet", ...models], ws, lists, cellsDir);
  } catch (err) {
    if (err instanceof UsageLimitError) {
      console.error(`stopped: ${err.message}. The cache stays; run again after ${err.resetsAt || "the reset"}.`);
      return 1;
    }
    throw err;
  }
  console.log(`grids: ${ws.map((w) => w.word).join(", ")}`);
  printSummary(summary(["sonnet", ...models], ws));
  return 0;
}

if (require.main === module) main().then((c) => process.exit(c), (e) => (console.error(e), process.exit(2)));

module.exports = { summary, words, capFile, JUDGE_FILE, readJson };
