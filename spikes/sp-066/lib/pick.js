"use strict";

// Steps 4–7: the gate, Jev's scores, the weighted pick, the alternative cell
// and the two certainty signals (C-036 margin, C-037 weakest confidence).
//
//   Gate: a cell whose caption marks a must-see item hidden is out. The
//         caption marks items by name only (ADR-0032); the adjectives count
//         only toward must-see clarity. When the
//         gate would leave no cell, all 9 are scored without it (gateSkipped).
//   Jev:  one systemOne request per grid, the way judge-stories scores
//         stories (US-038): per scored cell one Score question for plausible
//         (`cell_<N>_plausible`) and vivid (`cell_<N>_vivid`), and one per
//         must-see clarity part (`cell_<N>_clarity_<part>`, ADR-0037, C-046):
//         completeness, size and state always, nameSign only with a name sign,
//         view only with a main subject (ADR-0038: { name, actor }, an
//         actor too; an actor is never a must-see item, so the gate never
//         checks it, and a cell that doesn't show it has main_view null and
//         the lowest view level). A score is Jev's level + 1 (1–3,
//         decimals kept), with Jev's confidence; clarity is the mean of its
//         parts, with the lowest confidence of its parts (for C-037). Each
//         question gets the full captions in the state. Code caps no score
//         (ADR-0037): Jev's state holds each cell's drawing errors and, with
//         a name sign, name_sign_readable (a name sign never gates a cell).
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
const PARTS = ["completeness", "size", "state", "nameSign", "view"];
const START_WEIGHTS = { plausible: 2, vivid: 1, clarity: 1 };
const CELLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// After stage 20 (ADR-0039, C-049) plausible and vivid may be scored in parts
// too: an axis with "parts" in the rubric (and no levels of its own) gets one
// Score question per part (`cell_<N>_<axis>_<part>`), and its score is their
// mean, as for clarity. An axis with levels stays one question.
function loadRubric(file = RUBRIC_FILE) {
  const rubric = JSON.parse(fs.readFileSync(file, "utf8"));
  const ok = (a) => a && a.label && Array.isArray(a.levels) && a.levels.length === 3;
  for (const axis of AXES.filter((x) => x !== "clarity")) {
    const a = rubric.axes && rubric.axes[axis];
    const parted = a && a.label && a.parts && Object.keys(a.parts).length > 0 && Object.values(a.parts).every(ok);
    if (!ok(a) && !parted) throw new Error(`${file}: axis ${axis} needs a label and 3 levels, or parts with a label and 3 levels each`);
  }
  const clarity = rubric.axes && rubric.axes.clarity;
  for (const part of PARTS) {
    if (!(clarity && clarity.label && clarity.parts && ok(clarity.parts[part]))) throw new Error(`${file}: clarity part ${part} needs a label and 3 levels`);
  }
  return rubric;
}

// The clarity parts that apply to a story (C-046): the name sign only with
// one, the view only with a main subject.
const clarityParts = ({ nameSigns = [], mainSubject = null } = {}) =>
  PARTS.filter((p) => (p === "nameSign" ? nameSigns.length > 0 : p === "view" ? mainSubject !== null && mainSubject !== undefined : true));

// The parts of every axis for a story: axis → [part] (clarity: the parts that
// apply), or null for an axis that is one question.
function axisParts(rubric, input = {}) {
  const parts = {};
  for (const axis of AXES) {
    if (axis === "clarity") parts[axis] = clarityParts(input);
    else parts[axis] = rubric.axes[axis].parts ? Object.keys(rubric.axes[axis].parts) : null;
  }
  return parts;
}

// An axis-parts argument: a map as axisParts gives it, or (as before ADR-0039)
// a list of the clarity parts, with plausible and vivid one question each.
const partsMap = (parts) => (Array.isArray(parts) ? { plausible: null, vivid: null, clarity: parts } : parts);

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

const STATE_TEXT =
  "The state holds a mnemonic story for an English word, its must-see list (the objects a picture of it must show), its angle_case (\"view\" when the story is about a view, \"one-object\" when it has one main object, else \"none\"), its main_subject (the one person, animal or group of them that does the story's action, as {name, actor}: actor false for a must-see item, actor true for the actor, the person who does the action when the story names no person, which is not a must-see item; or null), and descriptions of candidate pictures for it (cells, keyed by id): each cell's objects, shot, angle, action step, action line (what the objects do to each other), extras, each must-see item's mark (visible / partly cut / hidden), size and place, its drawing errors (objects drawn wrong: they float, look pasted on, or break the lines of the wall or floor; mustSee says if the object is a must-see item), and how it differs from the other cells. When the story has name signs (name_signs: a name that the picture should show as text, on the item that carries it), each cell's name_sign_readable says whether its readable text shows every name sign. When the story has a main subject, each cell's main_view gives its view: front, three-quarter, side, back or above (null when the cell doesn't show it).";

// parts: the axis parts (axisParts), or a list of the clarity parts that
// apply (clarityParts), with plausible and vivid as the rubric gives them.
function buildQuestions(rubric, cells, parts = clarityParts()) {
  const map = Array.isArray(parts) ? { ...axisParts(rubric), clarity: parts } : parts;
  const ask = (c, a, kind, extraChecks = []) =>
    jev.score([STATE_TEXT, `Score picture cell_${c}, exactly as described, on the "${a.label}" ${kind}.`, ...extraChecks, ...(a.check ? [a.check] : [])].join("\n"), a.levels);
  const questions = {};
  for (const c of cells) {
    for (const axis of AXES) {
      const a = rubric.axes[axis];
      if (!map[axis]) {
        questions[qname(c, axis)] = ask(c, a, "axis");
        continue;
      }
      for (const part of map[axis]) questions[qname(c, `${axis}_${part}`)] = ask(c, a.parts[part], "part", a.check ? [a.check] : []);
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
    .replace(/['’]s(?![\p{L}\p{N}])/gu, "") // a possessive counts as the name (bug-019)
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

function buildState({ word, story, items, nameSigns = [], mainSubject = null, angleCase, captions, lines }, cells) {
  const cellState = {};
  const hasMain = mainSubject !== null && mainSubject !== undefined;
  for (const c of cells) {
    const { mustSee, drawingErrors, mainView, promptKey, ...rest } = captions[c]; // promptKey is the caption cache's, not Jev's
    const readable = nameSignReadable(nameSigns, captions[c]);
    cellState[`cell_${c}`] = {
      ...rest,
      must_see: mustSee,
      drawing_errors: drawingErrors || [],
      ...(readable === null ? {} : { name_sign_readable: readable }),
      ...(hasMain ? { main_view: mainView ?? null } : {}),
      differs: lines[c - 1],
    };
  }
  return { word, story, must_see: items, name_signs: nameSigns, main_subject: hasMain ? mainSubject : null, angle_case: angleCase, cells: cellState };
}

const usable = (x, lo, hi) => typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;

const round6 = (x) => Math.round(x * 1e6) / 1e6;

// Jev's answers → cell → axis → { score: 1–3, confidence }; an axis in parts
// (clarity, and after ADR-0039 plausible and vivid) also holds its parts
// (part → { score, confidence }), its score is their mean and its confidence
// their lowest. parts: as buildQuestions takes it.
function toScores(answers, cells, parts = clarityParts()) {
  const map = partsMap(parts);
  const one = (name) => {
    const a = answers && answers[name];
    if (!a || !usable(a.score, 0, 2) || !usable(a.confidence, 0, 1)) throw new jev.JevError(`unusable Jev answer for ${name}: ${JSON.stringify(a)}`);
    return { score: a.score + 1, confidence: a.confidence };
  };
  const scores = {};
  for (const c of cells) {
    scores[c] = {};
    for (const axis of AXES) {
      if (!map[axis]) {
        scores[c][axis] = one(qname(c, axis));
        continue;
      }
      const p = Object.fromEntries(map[axis].map((part) => [part, one(qname(c, `${axis}_${part}`))]));
      const all = Object.values(p);
      scores[c][axis] = {
        score: round6(all.reduce((sum, x) => sum + x.score, 0) / all.length),
        confidence: Math.min(...all.map((x) => x.confidence)),
        parts: p,
      };
    }
  }
  return scores;
}

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

// One grid's pick. input: { word, story, items, nameSigns, mainSubject, isSequence, angleCase, captions, lines }.
// cache (word → { key, answers }) holds Jev's usable answers: a request with
// the same state and questions reuses them (fromCache), with no Jev call.
async function pickCell(input, { rubric = loadRubric(), weights = START_WEIGHTS, cache = null, onSave = () => {}, ...opts } = {}) {
  const g = gate(input.captions);
  const parts = axisParts(rubric, input);
  const request = { state: buildState(input, g.scored), questions: buildQuestions(rubric, g.scored, parts) };
  const key = requestKey(request);
  const hit = cache && cache[input.word] && cache[input.word].key === key ? cache[input.word] : null;
  const answers = hit ? hit.answers : await jev.systemOne(request, opts);
  const scores = toScores(answers, g.scored, parts);
  if (cache && !hit) {
    cache[input.word] = { key, answers };
    onSave(cache);
  }
  // what the report needs to redo `choose` with the tuned weights
  const shots = Object.fromEntries(g.scored.map((c) => [c, input.captions[c].shot]));
  const steps = Object.fromEntries(g.scored.map((c) => [c, input.captions[c].step]));
  // every cell (scored or not) with a partly cut must-see item, for the report's share
  const partlyCut = CELLS.filter((c) => marks(input.captions[c]).includes("partly cut"));
  return { ...g, scores, shots, steps, isSequence: input.isSequence, partlyCut, ...choose(scores, weights, input.captions, input.isSequence), answers, fromCache: !!hit };
}

module.exports = { AXES, PARTS, START_WEIGHTS, loadRubric, clarityParts, axisParts, gate, buildQuestions, buildState, toScores, nameSignReadable, alternative, choose, pickCell };
