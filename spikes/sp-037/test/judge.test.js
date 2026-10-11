"use strict";

// Unit tests for AC2's pieces: the rubric read verbatim from _nemo.md, and
// raw Jev answers → Judgment.

const test = require("node:test");
const assert = require("node:assert/strict");

const { loadRubric, GATE_NAMES, AXIS_NAMES } = require("../lib/rubric");
const { toJudgment, buildQuestions, JevError } = require("../lib/judge");

test("rubric: four judgment gates and three 1/2/3 axes, read from _nemo.md", () => {
  const r = loadRubric();
  assert.deepEqual(GATE_NAMES, ["vividness", "scene-coherence", "same-root-anchor", "animal-harm"]);
  assert.match(r.gates.vividness, /^For each candidate, ask: \*\*could I draw this as one concrete scene\?\*\*/);
  assert.match(r.gates["scene-coherence"], /could every location\/object in this sentence physically be in the same/);
  assert.match(r.gates["same-root-anchor"], /^A sound anchor must be a genuinely different word/);
  assert.deepEqual(r.axes.vivid.levels, [
    "generic/flat, close to restating the definition",
    "some concrete detail",
    "one sharp, drawable scene",
  ]);
  assert.equal(r.axes.anchor.levels[2], "matches the target chunk's IPA exactly, verified via `nemo-words ipa-lookup`");
  assert.equal(Object.keys(buildQuestions(r)).length, GATE_NAMES.length + AXIS_NAMES.length);
});

const answers = (over = {}) => ({
  vividness: { noul: 0.5 },
  "scene-coherence": { noul: 0.49 },
  "same-root-anchor": { noul: 1 },
  "animal-harm": { noul: 0 },
  anchor: { score: 0 },
  meaning: { score: 2 },
  vivid: { score: 1.2 },
  ...over,
});

test("Judgment: a gate passes at p ≥ 0.5; axis = Jev level + 1; total = sum out of 9", () => {
  const j = toJudgment(answers());
  assert.deepEqual(
    Object.fromEntries(Object.entries(j.gateResults).map(([g, r]) => [g, r.pass])),
    { vividness: true, "scene-coherence": false, "same-root-anchor": true, "animal-harm": false },
  );
  assert.deepEqual(j.axisScores, { anchor: 1, meaning: 3, vivid: 2.2 });
  assert.equal(j.total, 6.2);
});

test("Judgment: another cut-off re-judges the same raw probabilities", () => {
  assert.equal(toJudgment(answers(), 0.4).gateResults["scene-coherence"].pass, true);
});

test("Judgment: a missing, non-numeric or out-of-range answer is unusable", () => {
  assert.throws(() => toJudgment(answers({ vividness: undefined })), JevError);
  assert.throws(() => toJudgment(answers({ anchor: { score: "2" } })), JevError);
  assert.throws(() => toJudgment(answers({ meaning: { score: 3 } })), JevError);
  assert.throws(() => toJudgment(answers({ "animal-harm": { noul: Number.NaN } })), JevError);
  assert.throws(() => toJudgment(null), JevError);
});
