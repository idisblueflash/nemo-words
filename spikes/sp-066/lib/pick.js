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
//   Caps: code lowers Jev's scores after the answers (applyCaps): must-see
//         clarity at 2 at most when the cell's readable text doesn't show a
//         name sign (ADR-0035; a name sign never gates a cell), plausible at
//         1 for a drawing error on a must-see item and at 2 at most for one
//         on another object (ADR-0036). The pick's scores are the capped
//         ones (so the report's re-pick keeps the caps); `answers` stays
//         Jev's own, and `caps` says which cell and axis was capped and why.
//   Code: total = Σ weight·score; the highest total is the main cell (ties:
//         higher plausible, then lower cell). The alternative cell, margin and
//         weakest confidence come from the totals and the captions — no second
//         Jev call. `choose` is pure, so the report can redo it with the
//         tuned weights from the saved scores.
// A missing or out-of-range answer is a JevError: no pick is guessed.

const crypto = require("node:crypto");
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

// A caption's must-see marks (SP-066: each item is { mark, size, place }).
const marks = (caption) => Object.values((caption && caption.mustSee) || {}).map((m) => m.mark);

// captions: cell → caption → { scored, gatedOut, gateSkipped }
function gate(captions) {
  const hides = (c) => marks(captions[c]).includes("hidden");
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
          "The state holds a mnemonic story for an English word, its must-see list (the objects a picture of it must show), its angle_case (\"view\" when the story is about a view, \"one-object\" when it has one main object, else \"none\"), and descriptions of candidate pictures for it (cells, keyed by id): each cell's objects, shot, angle, action step, action line (what the objects do to each other), extras, each must-see item's mark (visible / partly cut / hidden), size and place, its drawing errors (objects drawn wrong: they float, look pasted on, or break the lines of the wall or floor; mustSee says if the object is a must-see item), and how it differs from the other cells. When the story has name signs (name_signs: a name that the picture should show as text, on the item that carries it), each cell's name_sign_readable says whether its readable text shows every name sign.",
          `Score picture cell_${c}, exactly as described, on the "${a.label}" axis.`,
          ...(a.check ? [a.check] : []),
        ].join("\n"),
        a.levels,
      );
    }
  }
  return questions;
}

// A caption's text, for the name-sign check: lower case, with no punctuation
// (a period or an apostrophe is dropped, other marks split words), padded with
// a space on each side so that only whole words match.
const plainText = (t) =>
  ` ${String(t ?? "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;

// Whether the cell's readable text shows every name sign (ADR-0035): true or
// false, or null when the story has no name sign.
function nameSignReadable(nameSigns, caption) {
  if (!nameSigns || !nameSigns.length) return null;
  const seen = plainText(caption && caption.extras && caption.extras.readableText);
  return nameSigns.every((s) => seen.includes(plainText(s.text)));
}

// Code's caps on Jev's scores (ADR-0035, ADR-0036): must-see clarity at 2 at
// most when the cell can't show a name sign; plausible at 1 for a drawing
// error on a must-see item, else at 2 at most for one on another object. A
// cap never raises a score, and the confidence stays Jev's.
// → { scores (capped), caps: cell → axis → why }
function applyCaps(scores, captions, nameSigns) {
  const capped = {};
  const caps = {};
  const cap = (c, axis, max, why) => {
    capped[c][axis] = { ...capped[c][axis], score: Math.min(capped[c][axis].score, max) };
    caps[c] = { ...(caps[c] || {}), [axis]: why };
  };
  for (const c of Object.keys(scores)) {
    capped[c] = { ...scores[c] };
    if (nameSignReadable(nameSigns, captions[c]) === false) cap(c, "clarity", 2, "name sign not readable");
    const errors = (captions[c] && captions[c].drawingErrors) || [];
    if (errors.some((e) => e.mustSee)) cap(c, "plausible", 1, "drawing error on a must-see item");
    else if (errors.length) cap(c, "plausible", 2, "drawing error on another object");
  }
  return { scores: capped, caps };
}

function buildState({ word, story, items, nameSigns = [], angleCase, captions, lines }, cells) {
  const cellState = {};
  for (const c of cells) {
    const { mustSee, drawingErrors, promptKey, ...rest } = captions[c]; // promptKey is the caption cache's, not Jev's
    const readable = nameSignReadable(nameSigns, captions[c]);
    cellState[`cell_${c}`] = {
      ...rest,
      must_see: mustSee,
      drawing_errors: drawingErrors || [],
      ...(readable === null ? {} : { name_sign_readable: readable }),
      differs: lines[c - 1],
    };
  }
  return { word, story, must_see: items, name_signs: nameSigns, angle_case: angleCase, cells: cellState };
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

// The cache key of a Jev request: its state and questions.
const requestKey = (request) => crypto.createHash("sha256").update(JSON.stringify(request)).digest("hex").slice(0, 16);

// One grid's pick. input: { word, story, items, isSequence, angleCase, captions, lines }.
// cache (word → { key, answers }) holds Jev's usable answers: a request with
// the same state and questions reuses them (fromCache), with no Jev call.
async function pickCell(input, { rubric = loadRubric(), weights = START_WEIGHTS, cache = null, onSave = () => {}, ...opts } = {}) {
  const g = gate(input.captions);
  const request = { state: buildState(input, g.scored), questions: buildQuestions(rubric, g.scored) };
  const key = requestKey(request);
  const hit = cache && cache[input.word] && cache[input.word].key === key ? cache[input.word] : null;
  const answers = hit ? hit.answers : await jev.systemOne(request, opts);
  const { scores, caps } = applyCaps(toScores(answers, g.scored), input.captions, input.nameSigns);
  if (cache && !hit) {
    cache[input.word] = { key, answers };
    onSave(cache);
  }
  // what the report needs to redo `choose` with the tuned weights
  const shots = Object.fromEntries(g.scored.map((c) => [c, input.captions[c].shot]));
  const steps = Object.fromEntries(g.scored.map((c) => [c, input.captions[c].step]));
  // every cell (scored or not) with a partly cut must-see item, for the report's share
  const partlyCut = CELLS.filter((c) => marks(input.captions[c]).includes("partly cut"));
  return { ...g, scores, caps, shots, steps, isSequence: input.isSequence, partlyCut, ...choose(scores, weights, input.captions, input.isSequence), answers, fromCache: !!hit };
}

module.exports = { AXES, START_WEIGHTS, loadRubric, gate, buildQuestions, buildState, toScores, nameSignReadable, applyCaps, alternative, choose, pickCell };
