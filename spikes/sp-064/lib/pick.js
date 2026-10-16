"use strict";

// Steps 4–7: the gate, Jev's scores, the weighted pick, the alternative cell
// and the two certainty signals (C-036 margin, C-037 weakest confidence).
//
//   Gate: a cell whose caption marks a must-see item hidden is out. The
//         caption marks items by name only (ADR-0032); the adjectives count
//         only toward must-see clarity. When the
//         gate would leave no cell, all 9 are scored without it (gateSkipped).
//   Jev:  one systemOne request per grid, the way judge-stories scores
//         stories (US-038): per scored cell and rubric axis one Score question
//         `cell_<N>_<axis>`; the axis score is Jev's level + 1 (1–3, decimals
//         kept), with Jev's confidence for it.
//   Code: total = Σ weight·score; the highest total is the main cell (ties:
//         higher plausible, then lower cell). The alternative cell, margin and
//         weakest confidence come from the totals and the captions — no second
//         Jev call. `choose` is pure, so the report can redo it with the
//         tuned weights from the saved scores.
// A missing or out-of-range answer is a JevError: no pick is guessed.

const fs = require("node:fs");
const path = require("node:path");
const jev = require("../../../scripts/lib/jev");

const RUBRIC_FILE = path.join(__dirname, "..", "image-rubric.json");
const AXES = ["plausible", "vivid", "clarity"];
const START_WEIGHTS = { plausible: 2, vivid: 1, clarity: 1 };
const CELLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function loadRubric(file = RUBRIC_FILE) {
  const rubric = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const axis of AXES) {
    const a = rubric.axes && rubric.axes[axis];
    if (!a || !a.label || !Array.isArray(a.levels) || a.levels.length !== 3) throw new Error(`${file}: axis ${axis} needs a label and 3 levels`);
  }
  return rubric;
}

// captions: cell → caption → { scored, gatedOut, gateSkipped }
function gate(captions) {
  const hides = (c) => Object.values(captions[c].mustSee || {}).includes("hidden");
  const gatedOut = CELLS.filter(hides);
  if (gatedOut.length === CELLS.length) return { scored: [...CELLS], gatedOut: [], gateSkipped: true };
  return { scored: CELLS.filter((c) => !hides(c)), gatedOut, gateSkipped: false };
}

const qname = (cell, axis) => `cell_${cell}_${axis}`;

function buildQuestions(rubric, cells) {
  const questions = {};
  for (const c of cells) {
    for (const axis of AXES) {
      const a = rubric.axes[axis];
      questions[qname(c, axis)] = jev.score(
        [
          "The state holds a mnemonic story for an English word, its must-see list (the objects a picture of it must show), and descriptions of candidate pictures for it (cells, keyed by id): each cell's objects, shot, angle, action step, extras, which must-see items it shows, and how it differs from the other cells.",
          `Score picture cell_${c}, exactly as described, on the "${a.label}" axis.`,
          ...(a.check ? [a.check] : []),
        ].join("\n"),
        a.levels,
      );
    }
  }
  return questions;
}

function buildState({ word, story, items, captions, lines }, cells) {
  const cellState = {};
  for (const c of cells) {
    const { mustSee, promptKey, ...rest } = captions[c]; // promptKey is the caption cache's, not Jev's
    cellState[`cell_${c}`] = { ...rest, must_see: mustSee, differs: lines[c - 1] };
  }
  return { word, story, must_see: items, cells: cellState };
}

const usable = (x, lo, hi) => typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;

// Jev's answers → cell → axis → { score: 1–3, confidence }
function toScores(answers, cells) {
  const scores = {};
  for (const c of cells) {
    scores[c] = {};
    for (const axis of AXES) {
      const a = answers && answers[qname(c, axis)];
      if (!a || !usable(a.score, 0, 2) || !usable(a.confidence, 0, 1)) {
        throw new jev.JevError(`unusable Jev answer for ${qname(c, axis)}: ${JSON.stringify(a)}`);
      }
      scores[c][axis] = { score: a.score + 1, confidence: a.confidence };
    }
  }
  return scores;
}

const round6 = (x) => Math.round(x * 1e6) / 1e6;

// The alternative cell (C-035): among the ranked cells after the main one, the
// first with a wider shot when the main cell is an extreme close-up, else the
// first with a different action step when the story is a sequence, else the
// next-highest total. null when only one cell was scored.
function alternative(ranking, captions, isSequence) {
  const [main, ...rest] = ranking;
  if (!rest.length) return null;
  const shot = (c) => captions[c] && captions[c].shot;
  const step = (c) => captions[c] && captions[c].step;
  if (shot(main) === "extreme close-up") {
    const wider = rest.find((c) => shot(c) !== "extreme close-up");
    if (wider) return wider;
  }
  if (isSequence) {
    const other = rest.find((c) => step(c) !== step(main));
    if (other) return other;
  }
  return rest[0];
}

// scores (cell → axis → { score, confidence }) + weights → the pick.
function choose(scores, weights, captions, isSequence) {
  const cells = Object.keys(scores).map(Number);
  const totals = {};
  for (const c of cells) totals[c] = round6(AXES.reduce((s, axis) => s + weights[axis] * scores[c][axis].score, 0));
  const ranking = [...cells].sort((a, b) => totals[b] - totals[a] || scores[b].plausible.score - scores[a].plausible.score || a - b);
  const [main, second] = ranking;
  return {
    weights: { ...weights },
    totals,
    ranking,
    mainCell: main,
    alternativeCell: alternative(ranking, captions, isSequence),
    margin: second === undefined ? null : round6(totals[main] - totals[second]),
    weakestConfidence: Math.min(...AXES.map((axis) => scores[main][axis].confidence)),
    tie: second !== undefined && totals[main] === totals[second],
  };
}

// One grid's pick. input: { word, story, items, isSequence, captions, lines }.
async function pickCell(input, { rubric = loadRubric(), weights = START_WEIGHTS, ...opts } = {}) {
  const g = gate(input.captions);
  const answers = await jev.systemOne({ state: buildState(input, g.scored), questions: buildQuestions(rubric, g.scored) }, opts);
  const scores = toScores(answers, g.scored);
  // what the report needs to redo `choose` with the tuned weights
  const shots = Object.fromEntries(g.scored.map((c) => [c, input.captions[c].shot]));
  const steps = Object.fromEntries(g.scored.map((c) => [c, input.captions[c].step]));
  // every cell (scored or not) with a partly cut must-see item, for the report's share
  const partlyCut = CELLS.filter((c) => Object.values(input.captions[c].mustSee || {}).includes("partly cut"));
  return { ...g, scores, shots, steps, isSequence: input.isSequence, partlyCut, ...choose(scores, weights, input.captions, input.isSequence), answers };
}

module.exports = { AXES, START_WEIGHTS, loadRubric, gate, buildQuestions, buildState, toScores, alternative, choose, pickCell };
