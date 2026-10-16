// Throwaway: does the must-see gate mark items "hidden" because of their adjectives?
// Captions 3 words' grids twice: must-see items with adjectives, and names only.
const path = require("node:path"), fs = require("node:fs");
const SP = process.argv[2], OUT = process.argv[3];
const { captionGrids } = require(path.join(SP, "lib/caption"));
const { makeClaude } = require(path.join(SP, "lib/claude"));
const ms = require(path.join(SP, "raw/must-see.json"));
const lists = ms.entries || ms;
const grids = require(path.join(SP, "../sp-029/raw/grids.json")).kept;
const WORDS = ["corncob", "ventilator", "scalpel"];
const ask = makeClaude({ model: "sonnet" });

(async () => {
  const res = {};
  for (const variant of ["adjectives", "names"]) {
    const L = {};
    for (const w of WORDS) {
      const l = lists[w];
      L[w] = variant === "names" ? { ...l, items: l.items.map((i) => ({ name: i.name, adjectives: [] })) } : l;
    }
    const words = WORDS.map((w) => ({ word: w, grid: grids.find((g) => g.word === w).grid }));
    res[variant] = await captionGrids({ words, lists: L, imageDir: "/Users/husongtao/Projects/nemo-words/images/mnemonic", ask, jobs: 6 });
  }
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  for (const w of WORDS) {
    const g = grids.find((x) => x.word === w);
    console.log(`\n${w} (Flash's cell ${g.flashCell})`);
    for (const v of ["adjectives", "names"]) {
      const c = res[v].cache[g.grid] || {};
      const row = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
        const m = c[n]?.mustSee;
        if (!m) return n + ":ERR";
        const hidden = Object.entries(m).filter(([, s]) => s === "hidden").map(([k]) => k);
        const p = Object.values(m).filter((s) => s === "partly cut").length;
        return `${n}:${hidden.length ? "OUT[" + hidden.join(",") + "]" : "in"}${p ? "(" + p + "p)" : ""}`;
      });
      console.log(" ", v.padEnd(10), row.join(" "));
    }
  }
})();
