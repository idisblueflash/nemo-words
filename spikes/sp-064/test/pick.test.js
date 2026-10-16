"use strict";

// Unit tests for lib/pick.js: the gate, the tie-breaks, the alternative cell
// and the certainty signals (the logic sketch's rules and edge cases).

const test = require("node:test");
const assert = require("node:assert/strict");

const { gate, choose, alternative, toScores, START_WEIGHTS } = require("../lib/pick");

const cap = (shot = "medium", step = "during", mustSee = {}) => ({ shot, step, mustSee });
const captions9 = (f) => Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => [c, f(c)]));
const s = (plausible, vivid, clarity, confidence = 0.9) => ({
  plausible: { score: plausible, confidence },
  vivid: { score: vivid, confidence },
  clarity: { score: clarity, confidence },
});

test("gate: a hidden item puts a cell out, a partly cut one doesn't", () => {
  const g = gate(captions9((c) => cap("medium", "during", { cob: c < 3 ? "hidden" : c < 5 ? "partly cut" : "visible" })));
  assert.deepEqual(g, { scored: [3, 4, 5, 6, 7, 8, 9], gatedOut: [1, 2], gateSkipped: false });
});

test("gate: an empty must-see list gates nothing out", () => {
  assert.deepEqual(gate(captions9(() => cap())), { scored: [1, 2, 3, 4, 5, 6, 7, 8, 9], gatedOut: [], gateSkipped: false });
});

test("choose: a tie on the total goes to the higher plausible score, and is counted as a tie", () => {
  // 2·2 + 3 + 3 = 10 and 2·3 + 2 + 2 = 10
  const p = choose({ 1: s(2, 3, 3), 4: s(3, 2, 2) }, START_WEIGHTS, captions9(() => cap()), false);
  assert.equal(p.mainCell, 4);
  assert.equal(p.tie, true);
  assert.equal(p.margin, 0);
});

test("choose: a tie on the total and on plausible goes to the lower cell", () => {
  const p = choose({ 7: s(2, 2, 2), 3: s(2, 2, 2) }, START_WEIGHTS, captions9(() => cap()), false);
  assert.equal(p.mainCell, 3);
  assert.deepEqual(p.ranking, [3, 7]);
  assert.equal(p.tie, true);
});

test("choose: the weights decide the totals", () => {
  const scores = { 1: s(3, 1, 1), 2: s(2, 3, 3) };
  const pick = (weights) => choose(scores, weights, captions9(() => cap()), false);
  assert.equal(pick({ plausible: 2, vivid: 1, clarity: 1 }).mainCell, 2); // 8 vs 10
  assert.deepEqual(pick({ plausible: 2, vivid: 1, clarity: 1 }).totals, { 1: 8, 2: 10 });
  assert.equal(pick({ plausible: 5, vivid: 1, clarity: 1 }).mainCell, 1); // 17 vs 16
});

test("choose: the weakest confidence is the lowest of the main cell's three", () => {
  const scores = { 1: s(3, 3, 3), 2: s(1, 1, 1, 0.1) };
  scores[1].vivid.confidence = 0.81;
  scores[1].clarity.confidence = 0.48;
  const p = choose(scores, START_WEIGHTS, captions9(() => cap()), false);
  assert.equal(p.mainCell, 1);
  assert.equal(p.weakestConfidence, 0.48);
  assert.equal(p.margin, 8);
});

test("choose: one scored cell has no margin (high band) and no alternative", () => {
  const p = choose({ 5: s(2, 2, 2) }, START_WEIGHTS, captions9(() => cap()), false);
  assert.equal(p.mainCell, 5);
  assert.equal(p.margin, null);
  assert.equal(p.alternativeCell, null);
  assert.equal(p.tie, false);
});

test("alternative: a wider shot when the main cell is an extreme close-up", () => {
  const caps = captions9((c) => cap(c <= 2 ? "extreme close-up" : "medium"));
  assert.equal(alternative([1, 2, 3, 4], caps, false), 3);
});

test("alternative: an extreme close-up with no wider cell left falls back to the next-highest total", () => {
  const caps = captions9(() => cap("extreme close-up"));
  assert.equal(alternative([1, 2, 3], caps, false), 2);
});

test("alternative: a different action step when the story is a sequence", () => {
  const caps = captions9((c) => cap("medium", c <= 2 ? "before" : "after"));
  assert.equal(alternative([1, 2, 3], caps, true), 3);
  assert.equal(alternative([1, 2, 3], caps, false), 2, "not a sequence: the next-highest total");
});

test("toScores: a missing confidence or an out-of-range level is unusable", () => {
  const ok = { type: "score", score: 1, confidence: 0.5 };
  const answers = { cell_1_plausible: ok, cell_1_vivid: ok, cell_1_clarity: { type: "score", score: 1 } };
  assert.throws(() => toScores(answers, [1]), /unusable Jev answer for cell_1_clarity/);
  assert.throws(() => toScores({ ...answers, cell_1_clarity: { score: 2.5, confidence: 0.5 } }, [1]), /unusable/);
  assert.deepEqual(toScores({ ...answers, cell_1_clarity: ok }, [1])[1].clarity, { score: 2, confidence: 0.5 });
});
