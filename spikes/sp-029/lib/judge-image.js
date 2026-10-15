"use strict";

// The two-round image pick (SP-029, mirroring scripts/image-picker.js), for
// US-030 to promote: Jev reads the story and the cells' captions.
//   Round 1: one systemOne call per grid row, holding that row's 3 captions
//            and one Noul per cell ("is this the best picture for the
//            story?"); the row's pick is the cell with the highest p.
//   Round 2: one call over the three row picks, same question; its pick is
//            the final cell.
// Ties go to the lower cell number, and each round records whether it was a
// tie (a cell-1 tie-break could inflate agreement with Flash, ADR-0027).
// Jev failing or answering unusably (a p that isn't a number in 0–1) is a
// JevError: no pick is guessed.

const jev = require("../../../scripts/lib/jev");

const ROWS = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const name = (cell) => `cell_${cell}`;

function question(cell) {
  return jev.noul(
    [
      "The state holds a mnemonic story for an English word and short captions of candidate pictures (pictures, keyed by id).",
      "One picture goes on the word's flash card, so that seeing it brings the story back.",
      `Is picture ${name(cell)} the best of these pictures for that: the one that shows the story's scene most clearly — its main people, objects and action?`,
    ].join("\n"),
  );
}

const usable = (p) => typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 1;

// One round over `cells`: { cells, scores: { cell: p }, pick, tie, answers }.
async function judgeRound({ word, story, captions, cells }, opts) {
  const pictures = Object.fromEntries(cells.map((c) => [name(c), captions[c]]));
  const questions = Object.fromEntries(cells.map((c) => [name(c), question(c)]));
  const answers = await jev.systemOne({ state: { word, story, pictures }, questions }, opts);
  const scores = {};
  for (const c of cells) {
    const p = answers && answers[name(c)] && answers[name(c)].noul;
    if (!usable(p)) throw new jev.JevError(`unusable Jev answer for ${name(c)}: ${JSON.stringify(answers && answers[name(c)])}`);
    scores[c] = p;
  }
  const best = Math.max(...cells.map((c) => scores[c]));
  const top = cells.filter((c) => scores[c] === best);
  return { cells, scores, pick: Math.min(...top), tie: top.length > 1, answers };
}

// captions: { 1: text, …, 9: text } → { rows: [round ×3], final: round }
async function judgeImage({ word, story, captions }, opts = {}) {
  for (let c = 1; c <= 9; c++) {
    if (!captions[c] || !String(captions[c]).trim()) throw new Error(`no caption for cell ${c}`);
  }
  const rows = await Promise.all(ROWS.map((cells) => judgeRound({ word, story, captions, cells }, opts)));
  const final = await judgeRound({ word, story, captions, cells: rows.map((r) => r.pick) }, opts);
  return { rows, final };
}

const fmtScores = (round) => round.cells.map((c) => `${c}=${round.scores[c].toFixed(3)}`).join(",");

// The step's stdout lines.
function formatJudgment(j) {
  return [
    ...j.rows.map((r, i) => ["row", i + 1, r.pick, fmtScores(r)].join("\t")),
    ["final", j.final.pick, fmtScores(j.final)].join("\t"),
  ];
}

module.exports = { judgeImage, judgeRound, formatJudgment, question, ROWS };
