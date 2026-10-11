"use strict";

// `rank` step: candidates passing every gate (hard + Jev) first, then total
// descending; ties → shorter sentence, then alphabetical. Gate pass is
// recomputed from the saved probabilities, so another cut-off re-ranks
// without calling Jev again.

const { PASS_AT } = require("./judge");

// Gate names a judged candidate failed: hard-gate reasons' names, then Jev gates.
function failedGates(c, passAt = PASS_AT) {
  const hard = (c.hardFails || []).map((r) => r.split(":")[0]);
  const jev = c.judgment
    ? Object.entries(c.judgment.gateResults)
        .filter(([, r]) => r.p < passAt)
        .map(([g]) => g)
    : [];
  return [...hard, ...jev];
}

const totalOf = (c) => (c.judgment ? c.judgment.total : -1); // hard-gate fails were never scored

function compare(a, b, passAt) {
  const fa = failedGates(a, passAt).length > 0;
  const fb = failedGates(b, passAt).length > 0;
  if (fa !== fb) return fa ? 1 : -1;
  if (totalOf(a) !== totalOf(b)) return totalOf(b) - totalOf(a);
  if (a.sentence.length !== b.sentence.length) return a.sentence.length - b.sentence.length;
  return a.sentence < b.sentence ? -1 : a.sentence > b.sentence ? 1 : 0;
}

function rankCandidates(candidates, { passAt = PASS_AT } = {}) {
  return candidates.slice().sort((a, b) => compare(a, b, passAt));
}

module.exports = { rankCandidates, failedGates };
