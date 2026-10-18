"use strict";

// Step 3: grid differences. One Claude call per grid sees the 9 cut-out cells
// together (`cell-1.png` … `cell-9.png` in a fresh folder) and the must-see
// list, under the captions' blindness: never the word, the story, the grid's
// name or Flash's cell. It writes one line per cell on how that cell differs
// from the others. Cached in <out>/differences.json (grid → { promptKey, lines: [9 lines] }).
// SP-066: SP-064's cached lines are reused as they are (`seed`, either of
// its two shapes), saved as { source: "sp-064", lines }; only a grid with no
// 9 lines there is compared.

const crypto = require("node:crypto");
const path = require("node:path");
const { cropCell } = require("../../sp-029/lib/caption");
const { parseJson, pool, oneLine, ClaudeError } = require("./claude");
const { mentions, maskName } = require("./headword");

const CELLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// The list as the call sees it: the headword is hidden in an item name that
// holds it, and an adjective that holds it is left out (bug-017). An item that
// doesn't hold the word is as written, so the other prompts don't change.
function shownItems(items, word) {
  if (!word) return items;
  return items.map((i) => {
    if (!mentions(word, i.name) && !(i.adjectives || []).some((a) => mentions(word, a))) return i;
    return { ...i, name: maskName(word, i.name), adjectives: (i.adjectives || []).filter((a) => !mentions(word, a)) };
  });
}

function prompt(items, word) {
  return [
    "Use the Read tool to look at the nine image files cell-1.png … cell-9.png in the current folder. They are nine candidate pictures of the same scene.",
    "For each picture, write ONE short line on how it differs from the other eight: what it shows or cuts off that the others don't, its shot and angle, its moment in the action.",
    'Name other pictures by number where it helps, e.g. "cuts off the leg that cells 4 and 7 show".',
    "Keep the must-see list below in mind: say when a picture hides or cuts off one of its items.",
    'Print only JSON, no preamble: {"lines":["line for cell 1", …, "line for cell 9"]}, exactly 9 lines in cell order.',
    "",
    `MUST-SEE LIST: ${JSON.stringify(shownItems(items, word))}`,
  ].join("\n");
}

function parseLines(text) {
  const j = parseJson(text);
  if (!Array.isArray(j.lines) || j.lines.length !== 9) throw new ClaudeError("unusable grid differences: not 9 lines");
  const lines = j.lines.map((l) => oneLine(typeof l === "string" ? l : ""));
  if (lines.some((l) => !l)) throw new ClaudeError("unusable grid differences: an empty line");
  return lines;
}

// The cache key of a grid's lines: the prompt they were made with.
const promptKey = (items, word) => crypto.createHash("sha256").update(prompt(items, word)).digest("hex").slice(0, 16);

// A cache entry is { promptKey, lines }. An older entry is a bare array of lines
// made under the prompt without masking (before bug-017); it counts only while
// the word's prompt is still that one.
const entryFits = (entry, items, word) =>
  Array.isArray(entry) ? prompt(items, word) === prompt(items) : !!entry && entry.promptKey === promptKey(items, word);
const linesOf = (entry) => (Array.isArray(entry) ? entry : entry && entry.lines);
const nineLines = (entry) => {
  const l = linesOf(entry);
  return Array.isArray(l) && l.length === 9 && l.every((x) => typeof x === "string" && x.trim()) ? l : null;
};

// words: [{ word, grid }], lists: word → { items }, seed: SP-064's cache
// → { cache, failures: grid → error, reused: grids taken from the seed, made: grids compared now }.
async function compareGrids({ words, lists, imageDir, ask, cache = {}, seed = {}, jobs = 6, onSave = () => {} }) {
  const failures = {};
  const reused = [];
  const fits = (w) => {
    const e = cache[w.grid];
    return (e && e.source === "sp-064" && nineLines(e)) || entryFits(e, lists[w.word].items, w.word);
  };
  for (const w of words) {
    if (fits(w) || !nineLines(seed[w.grid])) continue;
    cache[w.grid] = { source: "sp-064", lines: nineLines(seed[w.grid]) };
    reused.push(w.grid);
  }
  if (reused.length) onSave(cache);
  const todo = words.filter((w) => !fits(w));
  const made = [];
  await pool(todo, jobs, async ({ word, grid }) => {
    try {
      const prepare = (dir) => CELLS.forEach((c) => cropCell(path.join(imageDir, grid), c, path.join(dir, `cell-${c}.png`)));
      const items = lists[word].items;
      cache[grid] = { promptKey: promptKey(items, word), lines: parseLines(await ask(prompt(items, word), { tools: "Read", prepare })) };
      made.push(grid);
      onSave(cache);
    } catch (err) {
      if (!(err instanceof ClaudeError)) throw err;
      failures[grid] = err.message;
    }
  });
  return { cache, failures, reused, made };
}

module.exports = { prompt, promptKey, linesOf, parseLines, compareGrids };
