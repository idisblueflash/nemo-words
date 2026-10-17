"use strict";

// Unit tests for lib/report.js: in-three with fewer than 3 scored cells, the
// bands' handling of a missing margin, and the weight search.

const test = require("node:test");
const assert = require("node:assert/strict");

const { repick, bands, tuneWeights } = require("../lib/report");
const { START_WEIGHTS } = require("../lib/pick");
const { s } = require("./helpers/synthetic-run");

const word = (flashCell, scores, extra = {}) => {
  const cells = Object.keys(scores).map(Number);
  return {
    word: "w",
    flashCell,
    pick: {
      scored: cells,
      gatedOut: [],
      gateSkipped: false,
      scores,
      shots: Object.fromEntries(cells.map((c) => [c, "medium"])),
      steps: Object.fromEntries(cells.map((c) => [c, "during"])),
      isSequence: false,
      ...extra,
    },
  };
};

test("repick: with fewer than 3 scored cells, in three is over the scored cells only", () => {
  const scores = { 4: s(3, 3, 3), 6: s(1, 1, 1) };
  assert.equal(repick(word(6, scores), START_WEIGHTS).inThree, true);
  assert.equal(repick(word(6, scores), START_WEIGHTS).isAlternative, true);
  assert.equal(repick(word(5, scores), START_WEIGHTS).inThree, false, "a gated-out cell is never in three");
});

test("bands: a missing margin (one scored cell) goes in the high band", () => {
  const rs = [{ m: null }, { m: 0.1 }, { m: 0.2 }, { m: 0.3 }, { m: 0.4 }, { m: 0.5 }];
  const b = bands(rs, (r) => r.m);
  assert.deepEqual(b.low.map((r) => r.m), [0.1, 0.2]);
  assert.deepEqual(b.middle.map((r) => r.m), [0.3, 0.4]);
  assert.deepEqual(b.high.map((r) => r.m), [0.5, null]);
});

test("tuneWeights: no judged tuning word keeps the start guess", () => {
  assert.deepEqual(tuneWeights([]), START_WEIGHTS);
});

test("tuneWeights: the most exact picks win, then the weights nearest the start guess", () => {
  // Flash's cell 1 (vivid and clarity strong) wins only when vivid + 2·clarity > 2·plausible
  const tuning = [word(1, { 1: s(1, 2, 3), 2: s(3, 1, 1) })];
  const w = tuneWeights(tuning);
  assert.equal(repick(tuning[0], w).exact, true);
  const distance = Object.keys(START_WEIGHTS).reduce((d, a) => d + Math.abs(w[a] - START_WEIGHTS[a]), 0);
  assert.equal(distance, 1);
});
