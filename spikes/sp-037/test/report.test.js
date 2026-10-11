"use strict";

// Unit tests for AC4's pieces: the fixed go / no-go bar and chance baselines.

const test = require("node:test");
const assert = require("node:assert/strict");

const { summarize } = require("../lib/report");

// k word results: `first` of them Flash 1st, `top2` of them in the top 2.
function results(k, first, top2, n = 6) {
  return Array.from({ length: k }, (_, i) => ({ candidateCount: n, first: i < first, top2: i < top2 }));
}

test("go needs both: 1st ≥ 40% and top 2 ≥ 65% (the bar is inclusive)", () => {
  assert.equal(summarize(results(20, 8, 13)).go, true); // 40%, 65%
  assert.equal(summarize(results(20, 7, 20)).go, false); // 35% 1st
  assert.equal(summarize(results(20, 20, 12)).go, false, "top-2 below 65% even with every 1st"); // impossible in practice, still a no-go
});

test("chance: mean of 1/n and 2/n over each word's own candidate count", () => {
  const s = summarize([...results(1, 0, 0, 6), ...results(1, 0, 0, 4)]);
  assert.equal(s.chanceFirst.toFixed(4), ((1 / 6 + 1 / 4) / 2).toFixed(4));
  assert.equal(s.chanceTop2.toFixed(4), ((2 / 6 + 2 / 4) / 2).toFixed(4));
});
