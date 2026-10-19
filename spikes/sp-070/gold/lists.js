// Batch 3 of SP-070's gold set: the must-see lists of the free grids, made with SP-066's
// own must-see step (one Sonnet call for each story). A free grid is in neither SP-066's
// 20 tuning words nor its 62 held-out words. Word-part cards with two stories are left
// out, because the grid's story is not known. Cached in free.json; a re-run reuses it.
// Run: node spikes/sp-070/gold/lists.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "../../..");
const { makeClaude } = require(path.join(root, "spikes/sp-066/lib/claude"));
const { mustSeeLists } = require(path.join(root, "spikes/sp-066/lib/must-see"));
const split = require(path.join(root, "spikes/sp-066/raw/split.json"));

const used = new Set([...split.tuning, ...split.measure]);
const rows = new Map(fs.readFileSync(path.join(root, "anki/reading-room-terms.txt"), "utf8")
  .split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t")).map(([f, b]) => [f, b || ""]));
const grids = fs.readdirSync(path.join(root, "images/mnemonic")).filter((f) => /\.grid.*\.png$/.test(f))
  .filter((g) => !used.has(g.split(".")[0])).sort();

const words = [];
const skipped = [];
for (const grid of grids) {
  const word = grid.split(".")[0];
  const back = rows.get(word);
  const stories = (back || "").split(/<hr>/)[0].split(/<br>/).map((s) => s.replace("🎭", "").trim()).filter(Boolean);
  if (stories.length !== 1) { skipped.push(`${grid}: ${stories.length} stories`); continue; }
  words.push({ word, grid, story: stories[0] });
}

const file = path.join(__dirname, "free.json");
const cache = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
const save = (c) => fs.writeFileSync(file, JSON.stringify(c, null, 2) + "\n");
const ask = makeClaude({ model: "sonnet" });
const byWord = [...new Map(words.map((w) => [w.word, w])).values()];
mustSeeLists({ words: byWord, ask, cache, jobs: 6, onSave: save }).then(({ cache, failures }) => {
  for (const w of words) if (cache[w.word]) cache[w.word].grids = [...new Set([...(cache[w.word].grids || []), w.grid])];
  save(cache);
  console.log(`grids ${words.length}, words ${byWord.length}, lists ${Object.keys(cache).length}, failed ${Object.keys(failures).length}`);
  Object.entries(failures).forEach(([w, e]) => console.log("  failed:", w, e));
  skipped.forEach((s) => console.log("  skipped:", s));
});
