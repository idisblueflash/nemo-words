"use strict";

// Pixel match between a grid and its final crop (SP-029's logic sketch):
// grayscale, both resized to 48×48, RMS distance on a 0–1 scale. Cells are
// cut as scripts/crop-grid-cell.sh cuts them: W/3 × H/3, row-major, any
// leftover pixels on the right/bottom edge dropped.

const { execFileSync } = require("node:child_process");

const SIDE = 48;
const PIXELS = SIDE * SIDE;
const CLEAR_MAX = 0.03; // Flash's cell must be nearer than this …
const NEXT_MIN = 0.1; // … and every other cell at least this far

const magick = (args) => execFileSync("magick", args, { maxBuffer: 64 << 20 });

// `file[0]` so a leading "-" in a name (word parts like -gen-) isn't read as an option.
const frame = (file) => `${file.startsWith("-") ? `./${file}` : file}[0]`;

function size(file) {
  const [w, h] = magick(["identify", "-format", "%w %h", frame(file)]).toString().trim().split(" ").map(Number);
  return { w, h };
}

// One gray vector (PIXELS bytes) for a whole image.
function imageVector(file) {
  return magick([frame(file), "-colorspace", "Gray", "-resize", `${SIDE}x${SIDE}!`, "-depth", "8", "gray:-"]);
}

// Nine gray vectors, cells 1–9 row-major.
function cellVectors(file) {
  const { w, h } = size(file);
  const cw = Math.floor(w / 3);
  const ch = Math.floor(h / 3);
  const buf = magick([
    frame(file),
    "-crop", `${cw * 3}x${ch * 3}+0+0`, "+repage",
    "-colorspace", "Gray",
    "-crop", `${cw}x${ch}`, "+repage",
    "-resize", `${SIDE}x${SIDE}!`,
    "-depth", "8", "gray:-",
  ]);
  if (buf.length !== 9 * PIXELS) throw new Error(`expected 9 cells from ${file}, got ${buf.length / PIXELS}`);
  return Array.from({ length: 9 }, (_, i) => buf.subarray(i * PIXELS, (i + 1) * PIXELS));
}

function rmsDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] - b[i]) / 255;
    sum += d * d;
  }
  return Math.sqrt(sum / a.length);
}

// The nearest cell to the crop, its distance, the next-nearest distance and
// whether the match is clear.
function matchCell(cells, crop) {
  const ranked = cells.map((v, i) => ({ cell: i + 1, distance: rmsDistance(v, crop) })).sort((x, y) => x.distance - y.distance);
  const [best, next] = ranked;
  return { cell: best.cell, distance: best.distance, next: next.distance, clear: best.distance < CLEAR_MAX && next.distance >= NEXT_MIN };
}

module.exports = { imageVector, cellVectors, rmsDistance, matchCell, CLEAR_MAX, NEXT_MIN, frame };
