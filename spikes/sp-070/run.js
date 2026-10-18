#!/usr/bin/env node
"use strict";

// SP-070 spike run: caption cells with a must-see mark that asks about the
// action (visible / part only / hidden, lib/caption.js), score the marks
// against Flash's gold set, and redo SP-066's pick (change 4, weights 2·1·1)
// with the new captions.
//
//   node spikes/sp-070/run.js --models sonnet,qwen/qwen3-vl-8b+schema [--grids N | --words a,b]
//   node spikes/sp-070/run.js --pick [--grids N | --words a,b]    Jev picks for the tuning words
//   node spikes/sp-070/run.js --score [--grids N | --words a,b]   gold-set counts and agreement, no call
//
// The 47 grids go in the Staged run's order: anomaly, cottage, optimal, sweep,
// saturation, then the rest of SP-066's tuning order, then the 27 free grids.
// A tuning grid is captioned in all 9 cells (the pick needs them); a free grid
// only in its gold cells. Must-see lists: SP-066's for the tuning words
// (spikes/sp-066/raw/must-see.json), the gold set's for the free words
// (gold/free.json). Compare lines: SP-066's (raw/differences.json).
//
// Cached in spikes/sp-070/raw/: captions.<model>.json (grid → cell → caption,
// with the key of the prompt it was made with) and jev.<line>.json (word →
// Jev's answers, keyed by the request), so a re-run pays only for new cells.
// Pick lines: "sonnet" (Sonnet's new captions) and "mix" (Sonnet's new
// captions with the marks of the 8B model's new captions).
//
// Jev needs TYPESAFE_API_KEY: in a worktree, set NEMO_JEV_ENV_FILE to the main
// checkout's .env. From a CN address, run with NODE_USE_ENV_PROXY=1 HTTPS_PROXY=….

const fs = require("node:fs");
const path = require("node:path");
const { cropCell } = require("../sp-029/lib/caption");
const { prompt, parseCaption, promptKey, itemNames } = require("./lib/caption");
const { captionSchema } = require("./lib/schema");
const { pickCell, loadRubric, START_WEIGHTS } = require("./lib/pick");
const { linesOf } = require("../sp-066/lib/differences");
const { ClaudeError, UsageLimitError, pool } = require("../sp-066/lib/claude");
const { captioner, isLocal } = require("../sp-069/lib/models");
const jev = require("../../scripts/lib/jev");

const HERE = __dirname;
const REPO = path.resolve(HERE, "../..");
const RAW = path.join(HERE, "raw");
const SP066 = path.join(REPO, "spikes/sp-066/raw");
const LOCAL_8B = "qwen/qwen3-vl-8b+schema";
const EARLY = ["anomaly", "cottage", "optimal", "sweep", "saturation"];

const imageDir = () => {
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
const jevFile = (line) => path.join(RAW, `jev.${line}.json`);
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? null : process.argv[i + 1];
};

const gold = () => readJson(path.join(HERE, "gold/gold.json"));

// Every grid of the run, in the staged order: { word, grid, cells, list, tuning, flashCell, story }.
function grids() {
  const split = readJson(path.join(SP066, "split.json"));
  const kept = readJson(path.join(REPO, "spikes/sp-029/raw/grids.json")).kept;
  const lists = readJson(path.join(SP066, "must-see.json"));
  const free = readJson(path.join(HERE, "gold/free.json"));
  const tuning = new Set(split.tuning);
  const order = [...new Set([...EARLY, ...split.tuningOrder])].filter((w) => tuning.has(w));
  const out = order.map((w) => {
    const k = kept.find((x) => x.word === w);
    return { word: w, grid: k.grid, cells: [1, 2, 3, 4, 5, 6, 7, 8, 9], list: lists[w], tuning: true, flashCell: k.flashCell, story: k.story };
  });
  const freeCells = new Map();
  for (const c of gold().cells) {
    if (tuning.has(c.word)) continue;
    if (!freeCells.has(c.grid)) freeCells.set(c.grid, { word: c.word, grid: c.grid, cells: [], list: free[c.word], tuning: false, story: c.story });
    freeCells.get(c.grid).cells.push(c.cell);
  }
  for (const g of freeCells.values()) g.cells.sort((a, b) => a - b);
  return [...out, ...freeCells.values()];
}

function chosen() {
  let gs = grids();
  const only = arg("--words");
  const n = arg("--grids");
  if (only) gs = gs.filter((g) => only.split(",").includes(g.word));
  else if (n) gs = gs.slice(0, Number(n));
  return gs;
}

const cellPicture = (dir, grid, cell) => {
  const f = path.join(dir, `${grid}.${cell}.png`);
  if (!fs.existsSync(f)) cropCell(path.join(imageDir(), grid), cell, f);
  return f;
};

const fits = (cap, g) => cap && !cap.failed && cap.promptKey === promptKey(g.list.items, g.word, g.list.mainSubject ?? null);

async function captionModel(model, gs) {
  const file = capFile(model);
  const cache = readJson(file, {});
  const ask = captioner(model);
  const cellsDir = path.join(RAW, "cells");
  fs.mkdirSync(cellsDir, { recursive: true });
  const todo = [];
  for (const g of gs) for (const c of g.cells) if (!fits(cache[g.grid]?.[c], g)) todo.push({ g, cell: c });
  console.error(`${model}: ${todo.length} cells to caption`);
  let calls = 0;
  await pool(todo, isLocal(model) ? 1 : 4, async ({ g, cell }) => {
    const { items } = g.list;
    const main = g.list.mainSubject ?? null;
    let entry;
    calls++;
    try {
      const r = await ask(prompt(items, g.word, main), cellPicture(cellsDir, g.grid, cell), model.endsWith("+schema") ? captionSchema(items, g.word, main) : undefined);
      try {
        entry = { ...parseCaption(r.text, items, g.word, main), promptKey: promptKey(items, g.word, main), ms: r.ms, costUsd: r.costUsd };
      } catch (err) {
        if (!(err instanceof ClaudeError)) throw err;
        entry = { failed: err.message, raw: r.text.slice(0, 4000), ms: r.ms, costUsd: r.costUsd };
      }
    } catch (err) {
      if (!(err instanceof ClaudeError)) throw err;
      entry = { failed: err.message, transport: true };
    }
    cache[g.grid] = Object.fromEntries(Object.entries({ ...(cache[g.grid] || {}), [cell]: entry }).sort(([a], [b]) => a - b));
    writeJson(file, cache);
    console.error(`  ${model} ${g.grid} ${cell}: ${entry.failed ? "FAILED " + entry.failed.slice(0, 120) : "ok"} ${entry.ms ? Math.round(entry.ms / 1000) + "s" : ""}`);
  });
  // a transport failure (server down) isn't a caption the model wrote: drop it so a re-run tries again
  for (const g of Object.keys(cache)) for (const c of Object.keys(cache[g])) if (cache[g][c].transport) delete cache[g][c];
  writeJson(file, cache);
  return calls;
}

// The captions of one pick line for a tuning grid: cell → caption, or null when a cell has none.
function lineCaptions(line, g) {
  const sonnet = readJson(capFile("sonnet"), {})[g.grid] || {};
  const local = readJson(capFile(LOCAL_8B), {})[g.grid] || {};
  const out = {};
  for (const c of g.cells) {
    const s = sonnet[c];
    if (!fits(s, g)) return null;
    if (line === "sonnet") {
      out[c] = s;
      continue;
    }
    const l = local[c];
    if (!fits(l, g)) return null;
    // only the marks come from the 8B model; a size and a place only where Sonnet has none
    const mustSee = {};
    for (const name of itemNames(g.list.items)) {
      const sm = s.mustSee[name];
      const lm = l.mustSee[name];
      if (lm.mark === "hidden") mustSee[name] = { mark: "hidden", size: null, place: null };
      else if (sm.mark === "hidden") mustSee[name] = { mark: lm.mark, size: lm.size, place: lm.place };
      else mustSee[name] = { mark: lm.mark, size: sm.size, place: sm.place };
    }
    out[c] = { ...s, mustSee };
  }
  return out;
}

async function pickLine(line, gs) {
  const rubric = loadRubric();
  const lines = readJson(path.join(SP066, "differences.json"));
  const file = jevFile(line);
  const cache = readJson(file, {});
  let calls = 0;
  const results = [];
  await pool(gs.filter((g) => g.tuning), 4, async (g) => {
    const captions = lineCaptions(line, g);
    if (!captions) return results.push({ word: g.word, unjudged: "captions missing or failed" });
    const l = g.list;
    try {
      const { fromCache, ...pick } = await pickCell(
        { word: g.word, story: g.story, items: l.items, nameSigns: l.nameSigns || [], mainSubject: l.mainSubject ?? null, isSequence: l.isSequence, angleCase: l.angleCase, captions, lines: linesOf(lines[g.grid]) },
        { rubric, weights: START_WEIGHTS, cache, onSave: (c) => writeJson(file, c) },
      );
      if (!fromCache) calls++;
      results.push({ word: g.word, flashCell: g.flashCell, mainCell: pick.mainCell, ranking: pick.ranking, gatedOut: pick.gatedOut, gateSkipped: pick.gateSkipped, partOnly: pick.partOnly, totals: pick.totals });
    } catch (err) {
      if (!(err instanceof jev.JevError)) throw err;
      calls++;
      results.push({ word: g.word, unjudged: err.message });
    }
  });
  const order = gs.map((g) => g.word);
  results.sort((a, b) => order.indexOf(a.word) - order.indexOf(b.word));
  return { calls, results };
}

// SP-066's change-4 picks (spikes/sp-066/raw/run.json) for the same words.
function sp066Picks(words) {
  const run = readJson(path.join(SP066, "run.json"));
  return run.words.filter((w) => words.includes(w.word) && w.pick).map((w) => ({ word: w.word, flashCell: w.flashCell, mainCell: w.pick.mainCell, ranking: w.pick.ranking }));
}

const tally = (rs) => {
  const j = rs.filter((r) => !r.unjudged);
  const exact = j.filter((r) => r.mainCell === r.flashCell).length;
  const inThree = j.filter((r) => r.ranking.slice(0, 3).includes(r.flashCell)).length;
  return { judged: j.length, exact, inThree, sum: exact + inThree, unjudged: rs.length - j.length };
};

// Gold-set scores for one model over the chosen grids' gold cells.
function goldScore(model, gs) {
  const caps = readJson(capFile(model), {});
  const byGrid = new Map(gs.map((g) => [g.grid, g]));
  const batch = new Map(readJson(path.join(HERE, "gold/cells.json")).map((c) => [`${c.grid}|${c.cell}`, c.batch]));
  const rows = [];
  for (const c of gold().cells) {
    const g = byGrid.get(c.grid);
    if (!g) continue;
    const cap = caps[c.grid]?.[c.cell];
    for (const it of c.items) {
      if (it.gold === "not sure") continue;
      const ok = fits(cap, g);
      // a name that repeats in a list (-cy: "calm street", "urgent street") is one
      // caption key ("street"), since the caption names items by name only (ADR-0032)
      const key = cap && cap.mustSee && cap.mustSee[it.name] ? it.name : (g.list.items.find((i) => [...i.adjectives, i.name].join(" ") === it.name) || {}).name;
      rows.push({ word: c.word, cell: c.cell, batch: batch.get(`${c.grid}|${c.cell}`), name: it.name, gold: it.gold, mark: ok ? cap.mustSee[key]?.mark ?? "missing" : "no caption" });
    }
  }
  const n = (f) => rows.filter(f).length;
  const s = {
    model,
    items: rows.length,
    captioned: n((r) => r.mark !== "no caption"),
    same: n((r) => r.mark === r.gold),
    byGold: Object.fromEntries(["visible", "part only", "hidden"].map((m) => [m, { same: n((r) => r.gold === m && r.mark === m), of: n((r) => r.gold === m) }])),
    falsePartOnly: n((r) => r.gold === "visible" && r.mark === "part only"),
    byBatch: Object.fromEntries([1, 2, 3].map((b) => [b, { same: n((r) => r.batch === b && r.mark === r.gold), of: n((r) => r.batch === b) }])),
    confusion: {},
    misses: rows.filter((r) => r.mark !== r.gold),
    family: rows.find((r) => r.word === "anomaly" && r.cell === 4 && r.name === "family") || null,
    knocks: rows.filter((r) => r.word === "anomaly" && r.name === "knock"),
  };
  for (const r of rows) s.confusion[`${r.gold} → ${r.mark}`] = (s.confusion[`${r.gold} → ${r.mark}`] || 0) + 1;
  return s;
}

// The 8B model's mark against Sonnet's, on every must-see item of every cell both captioned.
function agreement(gs) {
  const a = readJson(capFile("sonnet"), {});
  const b = readJson(capFile(LOCAL_8B), {});
  let same = 0, of = 0;
  const pairs = {};
  for (const g of gs)
    for (const c of g.cells) {
      const x = a[g.grid]?.[c], y = b[g.grid]?.[c];
      if (!fits(x, g) || !fits(y, g)) continue;
      for (const name of itemNames(g.list.items)) {
        of++;
        const p = `${x.mustSee[name].mark} / ${y.mustSee[name].mark}`;
        pairs[p] = (pairs[p] || 0) + 1;
        if (x.mustSee[name].mark === y.mustSee[name].mark) same++;
      }
    }
  return { same, of, pairs };
}

// Checks after each stage: every caption parses and uses only the 3 marks.
function parseCheck(model, gs) {
  const caps = readJson(capFile(model), {});
  let cells = 0, ok = 0, failed = 0, stale = 0, badMark = 0;
  for (const g of gs)
    for (const c of g.cells) {
      cells++;
      const cap = caps[g.grid]?.[c];
      if (!cap) continue;
      if (cap.failed) failed++;
      else if (!fits(cap, g)) stale++;
      else {
        ok++;
        if (Object.values(cap.mustSee).some((m) => !["visible", "part only", "hidden"].includes(m.mark))) badMark++;
      }
    }
  return { model, cells, ok, failed, stale, badMark };
}

const pct = (a, b) => (b ? `${a}/${b} (${((100 * a) / b).toFixed(1)}%)` : `${a}/0`);

function printScore(gs) {
  console.log(`grids (${gs.length}): ${gs.map((g) => g.word).join(", ")}`);
  for (const m of ["sonnet", LOCAL_8B]) {
    const p = parseCheck(m, gs);
    console.log(`parse ${m}: ${p.ok}/${p.cells} usable, ${p.failed} failed, ${p.stale} stale, ${p.badMark} with another mark`);
  }
  for (const m of ["sonnet", LOCAL_8B]) {
    const s = goldScore(m, gs);
    if (!s.captioned) continue;
    console.log(`\ngold ${m}: ${pct(s.same, s.items)} same (captioned ${s.captioned})`);
    for (const [k, v] of Object.entries(s.byGold)) console.log(`  ${k}: ${pct(v.same, v.of)}`);
    console.log(`  false part only (gold visible): ${s.falsePartOnly}`);
    console.log(`  batches: ${Object.entries(s.byBatch).map(([b, v]) => `${b} ${pct(v.same, v.of)}`).join(", ")}`);
    if (s.family) console.log(`  anomaly 4 family: ${s.family.mark}`);
    console.log(`  knocks: ${s.knocks.map((k) => `cell ${k.cell} ${k.mark}`).join(", ")}`);
    console.log(`  confusion: ${Object.entries(s.confusion).map(([k, v]) => `${k} ${v}`).join("; ")}`);
    for (const r of s.misses) console.log(`    miss: ${r.word} ${r.cell} ${r.name}: gold ${r.gold}, ${r.mark}`);
  }
  const a = agreement(gs);
  if (a.of) console.log(`\nagreement 8B = Sonnet: ${pct(a.same, a.of)}; ${Object.entries(a.pairs).map(([k, v]) => `${k} ${v}`).join("; ")}`);
}

async function main() {
  const gs = chosen();
  const models = (arg("--models") || "").split(",").filter(Boolean);
  try {
    for (const m of models) {
      const calls = await captionModel(m, gs);
      console.log(`${m}: ${calls} new caption calls`);
    }
    if (process.argv.includes("--pick")) {
      const words = gs.filter((g) => g.tuning).map((g) => g.word);
      const t0 = tally(sp066Picks(words));
      console.log(`SP-066 change 4 on these ${words.length} words: exact ${t0.exact}, in-three ${t0.inThree}, sum ${t0.sum}`);
      for (const line of ["sonnet", "mix"]) {
        const { calls, results } = await pickLine(line, gs);
        const t = tally(results);
        console.log(`pick ${line}: exact ${t.exact}, in-three ${t.inThree}, sum ${t.sum} (judged ${t.judged}, unjudged ${t.unjudged}, ${calls} new Jev calls)`);
        for (const r of results) console.log(`  ${r.word}: ${r.unjudged ? "unjudged: " + r.unjudged.slice(0, 120) : `flash ${r.flashCell}, main ${r.mainCell}, top3 ${r.ranking.slice(0, 3).join(" ")}, gated ${r.gatedOut.join(" ") || "-"}, part only ${r.partOnly.join(" ") || "-"}`}`);
        writeJson(path.join(RAW, `pick.${line}.json`), results);
      }
    }
  } catch (err) {
    if (err instanceof UsageLimitError) {
      console.error(`stopped: ${err.message}. The cache stays; run again after ${err.resetsAt || "the reset"}.`);
      return 1;
    }
    throw err;
  }
  if (process.argv.includes("--score") || models.length) printScore(gs);
  return 0;
}

if (require.main === module) main().then((c) => process.exit(c), (e) => (console.error(e), process.exit(2)));

module.exports = { grids, goldScore, agreement, parseCheck, tally, sp066Picks, capFile, LOCAL_8B, readJson, RAW };
