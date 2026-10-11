"use strict";

// Jev half of `judge-story`: one `systemOne` call per candidate, one question
// per judgment gate (Noul → probability the story passes) and per score axis
// (Score over `_nemo.md`'s three levels → 0–2, so axis score = that + 1).

const { noul, score } = require("@typesafe-ai/sdk");
const { GATE_NAMES, AXIS_NAMES } = require("./rubric");

const PASS_AT = 0.5;

class JevError extends Error {}

function buildQuestions(rubric) {
  const questions = {};
  for (const g of GATE_NAMES) {
    questions[g] = noul(
      [
        "Judge the candidate mnemonic story in the state against this check from the story rubric:",
        "",
        rubric.gates[g],
        "",
        "Does the candidate story, exactly as written (no rewriting), pass this check?",
      ].join("\n"),
      { true: "The story passes this check.", false: "The story fails this check." },
    );
  }
  for (const a of AXIS_NAMES) {
    questions[a] = score(
      `Score the candidate mnemonic story in the state on the story rubric's "${rubric.axes[a].label}" axis.`,
      rubric.axes[a].levels,
    );
  }
  return questions;
}

function state({ word, sense, ipaChunks, sentence, pivots, chunkKeywords }) {
  const s = { word, sense, ipa_chunks: ipaChunks, sentence, pivot_words: pivots };
  if (chunkKeywords && chunkKeywords.length) s.chunk_keywords = chunkKeywords;
  return s;
}

const usable = (x, lo, hi) => typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;

// Raw answers → Judgment. Throws JevError on any missing/unusable answer.
function toJudgment(answers, passAt = PASS_AT) {
  const gateResults = {};
  for (const g of GATE_NAMES) {
    const p = answers?.[g]?.noul;
    if (!usable(p, 0, 1)) throw new JevError(`unusable answer for ${g}: ${JSON.stringify(answers?.[g])}`);
    gateResults[g] = { p, pass: p >= passAt };
  }
  const axisScores = {};
  for (const a of AXIS_NAMES) {
    const level = answers?.[a]?.score;
    if (!usable(level, 0, 2)) throw new JevError(`unusable answer for ${a}: ${JSON.stringify(answers?.[a])}`);
    axisScores[a] = level + 1;
  }
  const total = AXIS_NAMES.reduce((sum, a) => sum + axisScores[a], 0);
  return { gateResults, axisScores, total };
}

async function askJev({ client, rubric, input }) {
  let res;
  try {
    res = await client.systemOne({ state: state(input), questions: buildQuestions(rubric) });
  } catch (err) {
    throw new JevError(`Jev call failed: ${err.constructor.name}${err.status ? ` ${err.status}` : ""}: ${err.message}`);
  }
  return res.answers;
}

module.exports = { buildQuestions, toJudgment, askJev, JevError, PASS_AT };
