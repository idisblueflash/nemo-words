"use strict";

// A stand-in for SP-064's saved run (spikes/sp-064/raw/run.json), for the
// split, the early picks and the report's SP-064 columns. Each word gets all
// 9 cells scored; cell `best` scores 3 on every axis and the others 1, so
// SP-064's main cell, its vivid alone and the top of its ranking are `best`
// whatever weights SP-064's search finds. `gateSkipped` is saved as given.

const path = require("node:path");
const { writeJson } = require("./harness");

const CELLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const axes = (x) => ({ plausible: { score: x, confidence: 0.9 }, vivid: { score: x, confidence: 0.9 }, clarity: { score: x, confidence: 0.9 } });

function sp064Word({ word, flashCell, best = 1, gateSkipped = false, tuning = false, unjudged, scores }) {
  const w = { word, grid: `${word}.grid.png`, flashCell, story: `story ${word}`, tuning };
  if (unjudged) return { ...w, unjudged };
  return {
    ...w,
    pick: {
      scored: [...CELLS],
      gatedOut: [],
      gateSkipped,
      scores: scores || Object.fromEntries(CELLS.map((c) => [c, axes(c === best ? 3 : 1)])),
      shots: Object.fromEntries(CELLS.map((c) => [c, "medium"])),
      steps: Object.fromEntries(CELLS.map((c) => [c, "during"])),
      isSequence: false,
      partlyCut: [],
      mainCell: best,
    },
  };
}

function sp064Run(words) {
  return { date: "2026-10-16", words: words.map(sp064Word), leftOut: [] };
}

// Writes it to <dir>/sp064-run.json and returns the path.
function sp064RunFile(dir, words) {
  const f = path.join(dir, "sp064-run.json");
  writeJson(f, sp064Run(words));
  return f;
}

module.exports = { sp064Run, sp064RunFile, sp064Word };
