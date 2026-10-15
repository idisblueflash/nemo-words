"use strict";

// Stage 2: one caption per cell of each kept grid (ADR-0026). Each cell is
// cut out as crop-grid-cell.sh cuts it, copied alone into a fresh temp folder
// as `picture.png`, and the captioner (`claude -p`, or $SP029_CAPTION_BIN) is
// run there with the same fixed prompt every time. So it sees one cell at a
// time and never the word, the story, the cell number or Flash's pick.
// Captions are cached in <out>/captions.json (grid → cell → text), so Jev can
// be re-run without re-captioning; a failed cell isn't cached.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile, execFileSync } = require("node:child_process");
const { frame } = require("./pixels");

const PROMPT = [
  "Use the Read tool to look at the image file picture.png in the current folder.",
  "Then write ONE line, at most 30 words, that says what the picture shows: the main people, animals and objects,",
  "what they are doing, and any words written in it. Print only that line, with no preamble.",
].join(" ");

class CaptionError extends Error {}

// Cut cell n (1–9, row-major) of a grid to `out`.
function cropCell(gridFile, cell, out) {
  const [w, h] = execFileSync("magick", ["identify", "-format", "%w %h", frame(gridFile)]).toString().trim().split(" ").map(Number);
  const cw = Math.floor(w / 3);
  const ch = Math.floor(h / 3);
  const i = cell - 1;
  execFileSync("magick", [frame(gridFile), "-crop", `${cw}x${ch}+${(i % 3) * cw}+${Math.floor(i / 3) * ch}`, "+repage", out]);
}

// Model text → one line: tabs and newlines become spaces (EN-036's contract).
const oneLine = (text) => String(text).replace(/[\t\r\n]+/g, " ").replace(/\s+/g, " ").trim();

function makeCaptioner({ bin = "claude", model = "sonnet", timeout = 300000 } = {}) {
  const args = ["-p", PROMPT, "--model", model, "--tools", "Read", "--allowedTools", "Read"];
  return (gridFile, cell) =>
    new Promise((resolve, reject) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cap-"));
      try {
        cropCell(gridFile, cell, path.join(dir, "picture.png"));
      } catch (err) {
        fs.rmSync(dir, { recursive: true, force: true });
        return reject(new CaptionError(`couldn't cut the cell: ${err.message}`));
      }
      execFile(bin, args, { cwd: dir, timeout, maxBuffer: 1 << 20 }, (err, stdout, stderr) => {
        fs.rmSync(dir, { recursive: true, force: true });
        if (err) return reject(new CaptionError(`captioner failed: ${err.message.split("\n")[0]} ${oneLine(stderr)}`.trim()));
        const text = oneLine(stdout);
        if (!text) return reject(new CaptionError("captioner gave an empty caption"));
        resolve(text);
      });
    });
}

// Runs `fn` over `items` with at most `jobs` at once.
async function pool(items, jobs, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, items.length)) }, worker));
}

// Captions every cell of every kept grid not yet in `cache`. Returns
// { cache, failures } — failures: grid → { cell, error } for its first failed cell.
async function captionGrids({ kept, imageDir, captioner, cache = {}, jobs = 6, onCaption = () => {} }) {
  const todo = [];
  for (const g of kept) for (let cell = 1; cell <= 9; cell++) if (!cache[g.grid]?.[cell]) todo.push({ grid: g.grid, cell });
  const failures = {};
  await pool(todo, jobs, async ({ grid, cell }) => {
    try {
      const text = await captioner(path.join(imageDir, grid), cell);
      cache[grid] = { ...(cache[grid] || {}), [cell]: text };
      // keep cells in 1–9 order however they finish
      cache[grid] = Object.fromEntries(Object.entries(cache[grid]).sort(([a], [b]) => a - b));
      onCaption(cache);
    } catch (err) {
      if (!(err instanceof CaptionError)) throw err;
      if (!failures[grid] || cell < failures[grid].cell) failures[grid] = { cell, error: err.message };
    }
  });
  return { cache, failures };
}

module.exports = { PROMPT, makeCaptioner, captionGrids, pool, cropCell, oneLine, CaptionError };
