"use strict";

// Stage 1 of the spike: find Flash's cell for every grid under the image
// folder and decide which grids are kept (one per whole-word card with a
// story, matched clearly to its single `.png` crop). Every other grid is
// left out with a reason.

const fs = require("node:fs");
const path = require("node:path");
const pixels = require("./pixels");

// `<word>.grid.png`, `<word>.grid-2.png`, `<word>.<tag>.grid.png`
const GRID_RE = /^(.+?)\.(?:[^.]+\.)?grid(?:-\d+)?\.png$/;

function listGrids(imageDir) {
  return fs
    .readdirSync(imageDir)
    .map((f) => GRID_RE.exec(f))
    .filter(Boolean)
    .map((m) => ({ word: m[1], grid: m[0] }))
    .sort((a, b) => (a.word === b.word ? a.grid.localeCompare(b.grid) : a.word.localeCompare(b.word)));
}

const round = (x) => Math.round(x * 10000) / 10000;

function matchGrids({ imageDir, lookup, vectors = pixels }) {
  const kept = [];
  const leftOut = [];
  const byWord = new Map();
  for (const g of listGrids(imageDir)) {
    if (!byWord.has(g.word)) byWord.set(g.word, []);
    byWord.get(g.word).push(g.grid);
  }
  for (const [word, grids] of byWord) {
    const leave = (reason) => grids.forEach((grid) => leftOut.push({ word, grid, reason }));
    const crop = `${word}.png`;
    const info = lookup(word);
    if (!fs.existsSync(path.join(imageDir, crop))) leave(`no single crop ${crop}`);
    else if (!info) leave("no card");
    else if (info.wordPart) leave("word-part card");
    else if (!info.story) leave("no story");
    else {
      const cropVec = vectors.imageVector(path.join(imageDir, crop));
      const matches = grids.map((grid) => ({ grid, ...vectors.matchCell(vectors.cellVectors(path.join(imageDir, grid)), cropVec) }));
      const clear = matches.filter((m) => m.clear).sort((a, b) => a.distance - b.distance);
      const chosen = clear[0];
      for (const m of matches) {
        if (m === chosen) {
          kept.push({ word, grid: m.grid, crop, flashCell: m.cell, distance: round(m.distance), next: round(m.next), story: info.story });
        } else if (chosen) {
          leftOut.push({ word, grid: m.grid, reason: `another grid of ${word} matched its crop` });
        } else {
          leftOut.push({ word, grid: m.grid, reason: `no clear match (nearest cell ${m.cell}, distance ${round(m.distance)}, next ${round(m.next)})` });
        }
      }
    }
  }
  return { kept, leftOut };
}

module.exports = { listGrids, matchGrids, GRID_RE };
