"use strict";

// SP-037 AC3 — Given every candidate for a word has been judged, when the
// candidates are ranked, then a candidate that fails any gate ranks below
// every candidate that passes, and ties on the total are broken the same way
// on every run (shorter sentence, then alphabetical).

const test = require("node:test");
const assert = require("node:assert/strict");

const { rankCandidates } = require("../lib/rank");
const { shuffle, mulberry32 } = require("../lib/rng");

const P = { vividness: 0.9, "scene-coherence": 0.9, "same-root-anchor": 0.9, "animal-harm": 0.9 };

function judged(sentence, total, { gates = {}, hardFails = [] } = {}) {
  const probs = { ...P, ...gates };
  return {
    sentence,
    pivot_words: [],
    source: "fresh",
    hardFails,
    judgment: hardFails.length
      ? null
      : {
          gateResults: Object.fromEntries(Object.entries(probs).map(([g, p]) => [g, { p, pass: p >= 0.5 }])),
          axisScores: {},
          total,
        },
  };
}

const CANDIDATES = [
  judged("A top total but an animal is hurt.", 9, { gates: { "animal-harm": 0.1 } }),
  judged("Too long and names the word itself, over ten words long here.", 0, { hardFails: ["word-count: 12 > 10"] }),
  judged("Bee tied seven.", 7),
  judged("Ann tied seven.", 7),
  judged("A longer one tied at seven.", 7),
  judged("Low but passing.", 3),
];

test("AC3: gate failures rank below every passing candidate; ties broken the same way every run", () => {
  const expected = [
    "Ann tied seven.",
    "Bee tied seven.",
    "A longer one tied at seven.",
    "Low but passing.",
    "A top total but an animal is hurt.",
    "Too long and names the word itself, over ten words long here.",
  ];
  for (let seed = 1; seed <= 20; seed++) {
    const order = rankCandidates(shuffle(CANDIDATES, mulberry32(seed))).map((c) => c.sentence);
    assert.deepEqual(order, expected, `input order from seed ${seed}`);
  }
});

test("rank: a different gate cut-off re-ranks from the saved probabilities", () => {
  const order = rankCandidates(CANDIDATES, { passAt: 0.05 }).map((c) => c.sentence);
  assert.equal(order[0], "A top total but an animal is hurt.");
});

test("failedGates: hard-gate names then Jev gates below the cut-off", () => {
  const { failedGates } = require("../lib/rank");
  assert.deepEqual(failedGates(CANDIDATES[0]), ["animal-harm"]);
  assert.deepEqual(failedGates(CANDIDATES[1]), ["word-count"]);
  assert.deepEqual(failedGates(CANDIDATES[2]), []);
});
