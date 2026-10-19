// Picks the cells for SP-070's gold set from the cached SP-066 (Sonnet) and SP-069 (8B) captions.
// Writes cells.json: [{ grid, word, story, cell, group, items: [{ name, sonnet, qwen8b }] }].
// Run: node spikes/sp-070/gold/pick.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "../../..");
const sonnet = require(path.join(root, "spikes/sp-066/raw/captions.json"));
const qwen = require(path.join(root, "spikes/sp-069/raw/captions.qwen_qwen3-vl-8b.json"));
const lists = require(path.join(root, "spikes/sp-066/raw/must-see.json"));
const run = require(path.join(root, "spikes/sp-066/raw/run.json"));

const QUOTA = { bothCut: 2, hidden: 3, cutVis: 8, bothVis: 6 };
const PER_GRID = 2;
const FIXED = { grid: "anomaly.grid.png", cell: 4 };

let seed = 70;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

function groupOf(items) {
  const pairs = items.map((i) => `${i.sonnet}/${i.qwen8b}`);
  if (pairs.includes("partly cut/partly cut")) return "bothCut";
  if (items.some((i) => i.sonnet === "hidden" || i.qwen8b === "hidden")) return "hidden";
  if (pairs.includes("partly cut/visible")) return "cutVis";
  if (pairs.every((p) => p === "visible/visible")) return "bothVis";
  return null;
}

const pool = [];
let fixed;
for (const w of run.words) {
  const actor = !!lists[w.word]?.mainSubject?.actor;
  for (let cell = 1; cell <= 9; cell++) {
    const s = sonnet[w.grid]?.[cell]?.mustSee;
    const q = qwen[w.grid]?.[cell]?.mustSee;
    if (!s || !q) continue;
    const items = Object.keys(s).map((name) => ({ name, sonnet: s[name]?.mark ?? null, qwen8b: q[name]?.mark ?? null }));
    if (items.some((i) => !i.qwen8b)) continue;
    const entry = { grid: w.grid, word: w.word, story: w.story, cell, actor, items };
    if (w.grid === FIXED.grid && cell === FIXED.cell) { fixed = { ...entry, group: "fixed" }; continue; }
    const group = groupOf(items);
    if (group) pool.push({ ...entry, group, r: rand() });
  }
}

const perGrid = { [fixed.grid]: 1 };
const picked = [fixed];
for (const group of Object.keys(QUOTA)) {
  const cands = pool.filter((c) => c.group === group).sort((a, b) => b.actor - a.actor || a.r - b.r);
  let n = 0;
  for (const c of cands) {
    if (n === QUOTA[group]) break;
    if ((perGrid[c.grid] || 0) >= PER_GRID) continue;
    perGrid[c.grid] = (perGrid[c.grid] || 0) + 1;
    picked.push(c);
    n++;
  }
}

// Batch 2 (Flash asked for more data): more cells from the same 20 grids, at most
// PER_GRID_2 cells from one grid over both batches. Batch 1 stays as it was.
const QUOTA_2 = { bothCut: 99, hidden: 99, other: 99, cutVis: 20, bothVis: 10 };
const BATCH_2 = 40;
const PER_GRID_2 = 4;
const taken = new Set(picked.map((c) => `${c.grid}|${c.cell}`));
for (const c of pool) if (!c.group) c.group = "other";
for (const w of run.words) for (let cell = 1; cell <= 9; cell++) {
  const s = sonnet[w.grid]?.[cell]?.mustSee, q = qwen[w.grid]?.[cell]?.mustSee;
  if (!s || !q || taken.has(`${w.grid}|${cell}`) || pool.some((c) => c.grid === w.grid && c.cell === cell)) continue;
  const items = Object.keys(s).map((name) => ({ name, sonnet: s[name]?.mark ?? null, qwen8b: q[name]?.mark ?? null }));
  if (items.some((i) => !i.qwen8b)) continue;
  pool.push({ grid: w.grid, word: w.word, story: w.story, cell, actor: !!lists[w.word]?.mainSubject?.actor, items, group: "other", r: rand() });
}
const batch2 = [];
for (const group of Object.keys(QUOTA_2)) {
  const cands = pool.filter((c) => c.group === group && !taken.has(`${c.grid}|${c.cell}`))
    .sort((a, b) => b.actor - a.actor || a.r - b.r);
  let n = 0;
  for (const c of cands) {
    if (n === QUOTA_2[group] || batch2.length === BATCH_2) break;
    if ((perGrid[c.grid] || 0) >= PER_GRID_2) continue;
    perGrid[c.grid] = (perGrid[c.grid] || 0) + 1;
    batch2.push({ ...c, batch: 2 });
    n++;
  }
}
picked.forEach((c) => (c.batch = 1));
picked.push(...batch2);

// Batch 3 (Flash asked for more cells to balance the set): cells from the free grids,
// which are in neither the 20 tuning words nor the 62 held-out words (lists.js makes their
// must-see lists in free.json). They have no captions, so no old marks; PER_FREE_GRID
// random cells from each grid.
const PER_FREE_GRID = 2;
const free = require(path.join(__dirname, "free.json"));
for (const [word, list] of Object.entries(free).sort()) for (const grid of list.grids.sort()) {
  const cells = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((cell) => ({ cell, r: rand() })).sort((a, b) => a.r - b.r);
  for (const { cell } of cells.slice(0, PER_FREE_GRID)) {
    picked.push({ grid, word, story: list.story, cell, group: "free", batch: 3,
      // a name that repeats in one list ("calm street", "urgent street") gets its adjectives
      items: list.items.map((i) => ({
        name: list.items.filter((j) => j.name === i.name).length > 1 ? `${i.adjectives.join(" ")} ${i.name}` : i.name,
        sonnet: null, qwen8b: null })) });
    perGrid[grid] = (perGrid[grid] || 0) + 1;
  }
}

const out = picked.map(({ r, actor, ...c }) => c);
fs.writeFileSync(path.join(__dirname, "cells.json"), JSON.stringify(out, null, 2) + "\n");
const count = (g) => out.filter((c) => c.group === g).length;
console.log(`cells ${out.length}, items ${out.reduce((n, c) => n + c.items.length, 0)}, grids ${Object.keys(perGrid).length}`);
console.log(["fixed", ...Object.keys(QUOTA_2), "free"].map((g) => `${g} ${count(g)}`).join(", "));
