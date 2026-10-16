"use strict";

// Step 3: grid differences. One Claude call per grid sees the 9 cut-out cells
// together (`cell-1.png` … `cell-9.png` in a fresh folder) and the must-see
// list, under the captions' blindness: never the word, the story, the grid's
// name or Flash's cell. It writes one line per cell on how that cell differs
// from the others. Cached in <out>/differences.json (grid → [9 lines]).

const path = require("node:path");
const { cropCell } = require("../../sp-029/lib/caption");
const { parseJson, pool, oneLine, ClaudeError } = require("./claude");

const CELLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function prompt(items) {
  return [
    "Use the Read tool to look at the nine image files cell-1.png … cell-9.png in the current folder. They are nine candidate pictures of the same scene.",
    "For each picture, write ONE short line on how it differs from the other eight: what it shows or cuts off that the others don't, its shot and angle, its moment in the action.",
    'Name other pictures by number where it helps, e.g. "cuts off the leg that cells 4 and 7 show".',
    "Keep the must-see list below in mind: say when a picture hides or cuts off one of its items.",
    'Print only JSON, no preamble: {"lines":["line for cell 1", …, "line for cell 9"]}, exactly 9 lines in cell order.',
    "",
    `MUST-SEE LIST: ${JSON.stringify(items)}`,
  ].join("\n");
}

function parseLines(text) {
  const j = parseJson(text);
  if (!Array.isArray(j.lines) || j.lines.length !== 9) throw new ClaudeError("unusable grid differences: not 9 lines");
  const lines = j.lines.map((l) => oneLine(typeof l === "string" ? l : ""));
  if (lines.some((l) => !l)) throw new ClaudeError("unusable grid differences: an empty line");
  return lines;
}

// words: [{ word, grid }], lists: word → { items } → { cache, failures: grid → error }.
async function compareGrids({ words, lists, imageDir, ask, cache = {}, jobs = 6, onSave = () => {} }) {
  const failures = {};
  await pool(words.filter((w) => !cache[w.grid]), jobs, async ({ word, grid }) => {
    try {
      const prepare = (dir) => CELLS.forEach((c) => cropCell(path.join(imageDir, grid), c, path.join(dir, `cell-${c}.png`)));
      cache[grid] = parseLines(await ask(prompt(lists[word].items), { tools: "Read", prepare }));
      onSave(cache);
    } catch (err) {
      if (!(err instanceof ClaudeError)) throw err;
      failures[grid] = err.message;
    }
  });
  return { cache, failures };
}

module.exports = { prompt, parseLines, compareGrids };
