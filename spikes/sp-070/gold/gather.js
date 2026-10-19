// Gathers Flash's marks (labels.json) and the picked cells (cells.json) into gold.json.
// Usage: node gather.js
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const cells = JSON.parse(fs.readFileSync(path.join(dir, "cells.json"), "utf8"));
const labels = JSON.parse(fs.readFileSync(path.join(dir, "labels.json"), "utf8"));

const missing = [];
const gold = cells.map((c) => ({
  grid: c.grid, word: c.word, story: c.story, cell: c.cell, group: c.group,
  items: c.items.map((it) => {
    const l = labels[`${c.grid}|${c.cell}|${it.name}`];
    if (!l) missing.push(`${c.grid} cell ${c.cell}: ${it.name}`);
    return { name: it.name, gold: l ? l.mark : null, note: l && l.note ? l.note : "",
             old: { sonnet: it.sonnet, qwen8b: it.qwen8b } };
  }),
}));

const out = { made: new Date().toISOString(), by: "Flash", marks: ["visible", "part only", "hidden"],
              cells: gold };
fs.writeFileSync(path.join(dir, "gold.json"), JSON.stringify(out, null, 2) + "\n");

const items = gold.flatMap((c) => c.items.map((i) => ({ ...i, cell: `${c.word} ${c.cell}`, group: c.group })));
const count = (f) => items.filter(f).length;
console.log(`cells ${gold.length}, items ${items.length}, missing ${missing.length}`);
missing.forEach((m) => console.log("  missing:", m));
for (const m of ["visible", "part only", "hidden", "not sure"]) console.log(`${m}: ${count((i) => i.gold === m)}`);

// Rough match with the old marks: old "partly cut" is set next to new "part only".
const asNew = { visible: "visible", "partly cut": "part only", hidden: "hidden" };
const sure = items.filter((i) => i.gold && i.gold !== "not sure");
for (const who of ["sonnet", "qwen8b"]) {
  const same = sure.filter((i) => asNew[i.old[who]] === i.gold).length;
  console.log(`${who}: same as gold on ${same} of ${sure.length}`);
}
const t = {};
for (const i of sure) { const k = `${i.gold} <- sonnet ${i.old.sonnet} / 8B ${i.old.qwen8b}`; t[k] = (t[k] || 0) + 1; }
Object.entries(t).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`${n}\t${k}`));
console.log("non-visible / not sure items:");
items.filter((i) => i.gold !== "visible").forEach((i) =>
  console.log(`  ${i.cell} ${i.name}: gold ${i.gold}, sonnet ${i.old.sonnet}, 8B ${i.old.qwen8b}`));
